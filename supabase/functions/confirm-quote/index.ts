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

      // Check if quote is already locked
      const { data: existingQuote, error: checkError } = await supabase
        .from('quotes')
        .select('status, discount_type, discount_amount')
        .eq('id', quoteId)
        .single();

      if (checkError) {
        console.error('Error checking quote status:', checkError);
        return new Response(
          JSON.stringify({ error: 'Failed to verify quote status' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const lockedStatuses = ['approved_payment_pending', 'awaiting_customer_approval', 'rejected', 'paid', 'shipped', 'in_transit', 'delivered', 'testing_in_progress', 'completed'];
      if (existingQuote && lockedStatuses.includes(existingQuote.status)) {
        console.warn('Attempted to update locked quote:', quoteId);
        return new Response(
          JSON.stringify({ error: 'Quote has been locked and cannot be modified by vendor' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Check if prices were changed and store old prices
      let pricesChanged = false;
      let additionalPricesChanged = false;
      const oldPrices: Record<string, number> = {};

      // We'll also use existing item metadata to compute the tiered baseline discount
      // so that the automatic 5%/10% discount does NOT count as a "vendor change".
      let computedSubtotalForBaseline = 0;

      if (updates.items && updates.items.length > 0) {
        const { data: existingItems } = await supabase
          .from('quote_items')
          .select('id, price, additional_samples, additional_report_headers, additional_sample_price, additional_header_price')
          .eq('quote_id', quoteId);

        for (const updatedItem of updates.items) {
          const existing = existingItems?.find((ei) => ei.id === updatedItem.id);
          if (existing) {
            oldPrices[updatedItem.id] = parseFloat(String(existing.price));
            
            // Check if base price changed
            if (parseFloat(String(existing.price)) !== updatedItem.price) {
              pricesChanged = true;
            }
            
            // Check if additional sample price changed from stored value
            // Only matters if there are additional samples
            if ((existing.additional_samples ?? 0) > 0) {
              const originalSamplePrice = parseFloat(String(existing.additional_sample_price ?? 60));
              const newSamplePrice = typeof updatedItem.additional_sample_price === 'number' 
                ? updatedItem.additional_sample_price 
                : originalSamplePrice;
              if (newSamplePrice !== originalSamplePrice) {
                additionalPricesChanged = true;
                console.log(`Additional sample price changed from ${originalSamplePrice} to ${newSamplePrice}`);
              }
            }
            
            // Check if additional header price changed from stored value
            // Only matters if there are additional headers
            if ((existing.additional_report_headers ?? 0) > 0) {
              const originalHeaderPrice = parseFloat(String(existing.additional_header_price ?? 30));
              const newHeaderPrice = typeof updatedItem.additional_header_price === 'number' 
                ? updatedItem.additional_header_price 
                : originalHeaderPrice;
              if (newHeaderPrice !== originalHeaderPrice) {
                additionalPricesChanged = true;
                console.log(`Additional header price changed from ${originalHeaderPrice} to ${newHeaderPrice}`);
              }
            }
          }
        }

        // Compute subtotal based on the *incoming* prices plus any additional sample/header charges.
        // This is used only to determine the automatic tiered discount baseline (5% / 10%).
        computedSubtotalForBaseline = updates.items.reduce((sum, updatedItem) => {
          const existing = existingItems?.find((ei) => ei.id === updatedItem.id);

          const basePrice = typeof updatedItem.price === 'number'
            ? updatedItem.price
            : parseFloat(String(updatedItem.price ?? 0));

          const additionalSamples = existing?.additional_samples ?? 0;
          const additionalHeaders = existing?.additional_report_headers ?? 0;

          const samplePriceEach = typeof updatedItem.additional_sample_price === 'number'
            ? updatedItem.additional_sample_price
            : 60;

          const headerPriceEach = typeof updatedItem.additional_header_price === 'number'
            ? updatedItem.additional_header_price
            : 30;

          return sum + basePrice + additionalSamples * samplePriceEach + additionalHeaders * headerPriceEach;
        }, 0);
      }

      // Compare discount values.
      // IMPORTANT: if the quote has no stored discount yet, we treat the automatic tiered discount
      // (5% under $1200, 10% at/over $1200) as the baseline, so it should NOT trigger customer approval.
      const existingDiscountType = existingQuote?.discount_type ?? null;
      const parsedExistingDiscountAmount = existingQuote?.discount_amount === null || existingQuote?.discount_amount === undefined
        ? null
        : Number.parseFloat(String(existingQuote.discount_amount));
      const existingDiscountAmount = parsedExistingDiscountAmount === null || Number.isNaN(parsedExistingDiscountAmount)
        ? null
        : parsedExistingDiscountAmount;

      const incomingDiscountType = updates.discount_type === undefined ? existingDiscountType : (updates.discount_type ?? null);
      const incomingDiscountAmount = updates.discount_amount === undefined
        ? existingDiscountAmount
        : (typeof updates.discount_amount === 'number' ? updates.discount_amount : null);

      const tieredBaselineDiscount = computedSubtotalForBaseline < 1200 ? 5 : 10;

      const discountChanged = (() => {
        // If nothing is set either way, it's not a change.
        if (existingDiscountType === null && existingDiscountAmount === null && incomingDiscountType === null && incomingDiscountAmount === null) {
          return false;
        }

        // If the quote had no stored discount yet, and the incoming discount equals the tiered baseline,
        // treat it as NO change (it's just the system's default discount being applied).
        if (existingDiscountType === null && existingDiscountAmount === null) {
          if (incomingDiscountType === null && incomingDiscountAmount === null) return false;
          if (incomingDiscountType === 'percentage' && typeof incomingDiscountAmount === 'number' && incomingDiscountAmount === tieredBaselineDiscount) {
            return false;
          }
        }

        return incomingDiscountType !== existingDiscountType || incomingDiscountAmount !== existingDiscountAmount;
      })();

      const pricingChanged = pricesChanged || additionalPricesChanged || discountChanged;

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

      // Compute status (lab quote number / notes should NOT force customer approval)
      const isRejection = updates.status === 'rejected';
      const computedStatus = isRejection
        ? 'rejected'
        : pricingChanged
          ? 'awaiting_customer_approval'
          : 'approved_payment_pending';

      // Update quote with new details
      const quoteUpdates: any = { status: computedStatus };
      if (updates.lab_quote_number !== undefined) quoteUpdates.lab_quote_number = updates.lab_quote_number;
      if (updates.lab_response !== undefined) quoteUpdates.lab_response = updates.lab_response;
      if (updates.discount_type !== undefined) quoteUpdates.discount_type = updates.discount_type;
      if (updates.discount_amount !== undefined) quoteUpdates.discount_amount = updates.discount_amount;

      console.log('Computed status:', computedStatus, 'pricingChanged:', pricingChanged, 'pricesChanged:', pricesChanged, 'additionalPricesChanged:', additionalPricesChanged, 'discountChanged:', discountChanged);

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
      const activityType = computedStatus === 'rejected' ? 'vendor_rejection' : 'vendor_approval';
      const activityDescription = computedStatus === 'rejected'
        ? 'Vendor rejected the quote'
        : pricingChanged
          ? 'Vendor approved quote with changes'
          : 'Vendor approved quote without changes';

      await supabase.from('quote_activity_log').insert({
        quote_id: quoteId,
        user_id: null, // Vendor action, no user_id
        activity_type: activityType,
        description: activityDescription,
        metadata: {
          changes_made: pricingChanged,
          lab_quote_number: updates.lab_quote_number,
          status: computedStatus,
          old_prices: oldPrices,
          old_discount: { type: existingDiscountType, amount: existingDiscountAmount },
          new_discount: { type: incomingDiscountType, amount: incomingDiscountAmount },
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

      // Fetch current quote to check lab_quote_number
      const { data: currentQuote, error: fetchError } = await supabase
        .from('quotes')
        .select('lab_quote_number, quote_number')
        .eq('id', quoteId)
        .single();

      if (fetchError) {
        console.error('Error fetching quote for approval:', fetchError);
        return new Response(
          JSON.stringify({ error: 'Failed to fetch quote details' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Generate quote_number if lab didn't provide lab_quote_number
      const quoteUpdates: any = { status: 'approved_payment_pending' };
      if (!currentQuote.lab_quote_number && !currentQuote.quote_number) {
        const date = new Date();
        const dateStr = date.toISOString().split('T')[0].replace(/-/g, '');
        const randomPart = quoteId.slice(0, 6).toUpperCase();
        quoteUpdates.quote_number = `QT-${dateStr}-${randomPart}`;
        console.log('Generated quote number:', quoteUpdates.quote_number);
      }

      const { error: approveError } = await supabase
        .from('quotes')
        .update(quoteUpdates)
        .eq('id', quoteId);

      if (approveError) {
        console.error('Error approving quote:', approveError);
        return new Response(
          JSON.stringify({ error: 'Failed to approve quote' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Log quote number generation if it was auto-generated
      if (quoteUpdates.quote_number) {
        await supabase.from('quote_activity_log').insert({
          quote_id: quoteId,
          user_id: userId,
          activity_type: 'quote_number_generated',
          description: `Auto-generated quote number: ${quoteUpdates.quote_number}`,
          metadata: { quote_number: quoteUpdates.quote_number, auto_generated: true }
        });
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
      
      // Get quote details for email
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*, labs(name, contact_email)')
        .eq('id', quoteId)
        .single();

      if (quoteError) {
        console.error('Error fetching quote for rejection email:', quoteError);
      }
      
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

      // Send rejection notification email to vendor
      if (quote && quote.labs && quote.labs.contact_email) {
        try {
          const smtpHost = Deno.env.get('SMTP_HOST');
          const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
          const smtpUser = Deno.env.get('SMTP_USER');
          const smtpPassword = Deno.env.get('SMTP_PASSWORD');

          if (smtpHost && smtpPort && smtpUser && smtpPassword) {
            const emailBody = `
              <!DOCTYPE html>
              <html>
                <head>
                  <meta charset="UTF-8">
                  <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #fee2e2; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
                    .content { background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="header">
                      <h1 style="margin: 0; color: #dc2626;">Quote Changes Rejected</h1>
                      <p style="margin: 8px 0 0 0; color: #991b1b;">Quote #${quote.quote_number || quoteId}</p>
                    </div>
                    
                    <p>Dear ${quote.labs.name},</p>
                    <p>The customer has rejected the changes you proposed for this quote.</p>
                    
                    <div class="content">
                      <h3 style="margin: 0 0 8px 0; color: #374151;">Customer Feedback:</h3>
                      <p style="margin: 0; white-space: pre-wrap;">${rejectionNotes}</p>
                    </div>
                    
                    <p>Please review the customer's feedback. They may reach out to you directly or submit a new quote request.</p>
                    
                    <p>Thank you for your service!</p>
                  </div>
                </body>
              </html>
            `;

            // Create SMTP connection
            const conn = await Deno.connect({
              hostname: smtpHost,
              port: smtpPort,
            });

            const encoder = new TextEncoder();
            const decoder = new TextDecoder();

            async function readResponse(connection: Deno.Conn): Promise<string> {
              const buffer = new Uint8Array(4096);
              const n = await connection.read(buffer);
              if (!n) throw new Error("Connection closed");
              return decoder.decode(buffer.subarray(0, n)).trim();
            }

            async function sendCommand(connection: Deno.Conn, command: string): Promise<string> {
              await connection.write(encoder.encode(command + "\r\n"));
              return await readResponse(connection);
            }

            try {
              await readResponse(conn);
              await sendCommand(conn, `EHLO ${smtpHost}`);
              await sendCommand(conn, "STARTTLS");
              
              const tlsConn = await Deno.startTls(conn, { hostname: smtpHost });
              await sendCommand(tlsConn, `EHLO ${smtpHost}`);
              
              const authString = btoa(`\0${smtpUser}\0${smtpPassword}`);
              await sendCommand(tlsConn, `AUTH PLAIN ${authString}`);
              
              await sendCommand(tlsConn, `MAIL FROM:<${smtpUser}>`);
              await sendCommand(tlsConn, `RCPT TO:<${quote.labs.contact_email}>`);
              await sendCommand(tlsConn, "DATA");
              
              const emailContent = `From: ${smtpUser}\r\nTo: ${quote.labs.contact_email}\r\nSubject: Quote Rejected - #${quote.quote_number || quoteId}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${emailBody}\r\n.\r\n`;
              await tlsConn.write(encoder.encode(emailContent));
              await readResponse(tlsConn);
              
              await sendCommand(tlsConn, "QUIT");
              tlsConn.close();
              
              console.log('Rejection email sent successfully to vendor');
            } catch (emailError) {
              console.error('SMTP error:', emailError);
              conn.close();
            }
          }
        } catch (emailError) {
          console.error('Error sending rejection email:', emailError);
        }
      }

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
