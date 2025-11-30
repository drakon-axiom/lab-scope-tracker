import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteItem {
  id: string;
  product_id: string;
  client: string;
  sample: string;
  manufacturer: string;
  batch: string;
  additional_samples: number;
  additional_report_headers: number;
  additional_headers_data: any;
  price: number;
  products: {
    name: string;
    category: string;
  };
}

interface ConfirmQuoteRequest {
  quoteId: string;
  action: 'get' | 'update' | 'customer_approve' | 'customer_reject';
  notes?: string;
  updates?: {
    status?: string;
    lab_quote_number?: string;
    lab_response?: string;
    discount_type?: string;
    discount_amount?: number;
    items?: Array<{
      id: string;
      price: number;
      additional_sample_price?: number;
      additional_header_price?: number;
    }>;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId, action, updates, notes }: ConfirmQuoteRequest = await req.json();

    if (!quoteId) {
      console.error('Missing quoteId in request');
      return new Response(
        JSON.stringify({ error: 'Quote ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === 'get') {
      console.log('Fetching quote details for:', quoteId);

      // Fetch quote details
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*, labs(name, contact_email)')
        .eq('id', quoteId)
        .single();

      if (quoteError || !quote) {
        console.error('Error fetching quote:', quoteError);
        return new Response(
          JSON.stringify({ error: 'Quote not found' }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Fetch quote items with product details
      const { data: items, error: itemsError } = await supabase
        .from('quote_items')
        .select('*, products(name, category)')
        .eq('quote_id', quoteId);

      if (itemsError) {
        console.error('Error fetching quote items:', itemsError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch quote items' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Successfully fetched quote and items');
      return new Response(
        JSON.stringify({ quote, items }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'update' && updates) {
      console.log('Updating quote:', quoteId, 'with updates:', updates);

      // Check if quote is already paid or beyond
      const { data: existingQuote, error: checkError } = await supabase
        .from('quotes')
        .select('status')
        .eq('id', quoteId)
        .single();

      if (checkError) {
        console.error('Error checking quote status:', checkError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify quote status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const lockedStatuses = ['approved', 'awaiting_customer_approval', 'rejected', 'paid', 'shipped', 'in_transit', 'delivered', 'testing_in_progress', 'completed'];
      if (existingQuote && lockedStatuses.includes(existingQuote.status)) {
        console.warn('Attempted to update locked quote:', quoteId);
        return new Response(
          JSON.stringify({ error: 'Quote has been locked and cannot be modified by vendor' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if prices were changed
      let pricesChanged = false;
      if (updates.items && updates.items.length > 0) {
        const { data: existingItems } = await supabase
          .from('quote_items')
          .select('id, price')
          .eq('quote_id', quoteId);

        pricesChanged = updates.items.some(updatedItem => {
          const existing = existingItems?.find(ei => ei.id === updatedItem.id);
          return existing && parseFloat(String(existing.price)) !== updatedItem.price;
        });
      }

      const discountChanged = updates.discount_amount !== undefined && updates.discount_type;

      // Update quote items if provided
      if (updates.items && updates.items.length > 0) {
        for (const item of updates.items) {
          const { error: itemError } = await supabase
            .from('quote_items')
            .update({ price: item.price })
            .eq('id', item.id);

          if (itemError) {
            console.error('Error updating quote item:', item.id, itemError);
            return new Response(
              JSON.stringify({ error: `Failed to update item: ${item.id}` }),
              { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
          }
        }
        console.log('Successfully updated quote items');
      }

      // Update quote with new details
      const quoteUpdates: any = {};
      if (updates.status) quoteUpdates.status = updates.status;
      if (updates.lab_quote_number) quoteUpdates.lab_quote_number = updates.lab_quote_number;
      if (updates.lab_response) quoteUpdates.lab_response = updates.lab_response;
      if (updates.discount_type) quoteUpdates.discount_type = updates.discount_type;
      if (updates.discount_amount !== undefined) quoteUpdates.discount_amount = updates.discount_amount;

      const { error: quoteError } = await supabase
        .from('quotes')
        .update(quoteUpdates)
        .eq('id', quoteId);

      if (quoteError) {
        console.error('Error updating quote:', quoteError);
        return new Response(
          JSON.stringify({ error: 'Failed to update quote' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log the vendor action
      const activityType = updates.status === 'rejected' ? 'vendor_rejection' : 
                          (pricesChanged || discountChanged) ? 'vendor_approval' : 'vendor_approval';
      const activityDescription = updates.status === 'rejected' 
        ? 'Vendor rejected the quote'
        : (pricesChanged || discountChanged)
        ? 'Vendor approved quote with changes'
        : 'Vendor approved quote without changes';

      await supabase.from('quote_activity_log').insert({
        quote_id: quoteId,
        user_id: null, // Vendor action, no user_id
        activity_type: activityType,
        description: activityDescription,
        metadata: {
          changes_made: pricesChanged || discountChanged,
          lab_quote_number: updates.lab_quote_number,
          status: updates.status
        }
      });

      console.log('Successfully updated quote');
      return new Response(
        JSON.stringify({ success: true, message: 'Quote updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'customer_approve') {
      console.log('Customer approving quote:', quoteId);

      // Get user info for activity log
      const authHeader = req.headers.get('authorization');
      let userId = null;
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(token);
          userId = user?.id || null;
        } catch (e) {
          console.error('Error getting user from token:', e);
        }
      }

      const { error: approveError } = await supabase
        .from('quotes')
        .update({ status: 'approved' })
        .eq('id', quoteId);

      if (approveError) {
        console.error('Error approving quote:', approveError);
        return new Response(
          JSON.stringify({ error: 'Failed to approve quote' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log customer approval
      await supabase.from('quote_activity_log').insert({
        quote_id: quoteId,
        user_id: userId,
        activity_type: 'customer_approval',
        description: 'Customer approved vendor changes',
        metadata: {}
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Quote approved by customer' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (action === 'customer_reject') {
      console.log('Customer rejecting quote:', quoteId);

      // Get user info for activity log
      const authHeader = req.headers.get('authorization');
      let userId = null;
      if (authHeader) {
        try {
          const token = authHeader.replace('Bearer ', '');
          const { data: { user } } = await supabase.auth.getUser(token);
          userId = user?.id || null;
        } catch (e) {
          console.error('Error getting user from token:', e);
        }
      }

      const rejectionNotes = notes || '';
      
      const { error: rejectError } = await supabase
        .from('quotes')
        .update({ 
          status: 'rejected',
          notes: rejectionNotes
        })
        .eq('id', quoteId);

      if (rejectError) {
        console.error('Error rejecting quote:', rejectError);
        return new Response(
          JSON.stringify({ error: 'Failed to reject quote' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log customer rejection with notes
      await supabase.from('quote_activity_log').insert({
        quote_id: quoteId,
        user_id: userId,
        activity_type: 'customer_rejection',
        description: `Customer rejected vendor changes: ${rejectionNotes}`,
        metadata: { notes: rejectionNotes }
      });

      return new Response(
        JSON.stringify({ success: true, message: 'Quote rejected by customer' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Invalid action' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in confirm-quote function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
