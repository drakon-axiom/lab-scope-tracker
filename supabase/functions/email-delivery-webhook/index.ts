import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DeliveryEvent {
  type: 'delivery' | 'open' | 'bounce' | 'click' | 'complaint';
  email: string;
  timestamp: string;
  message_id?: string;
  bounce_type?: string;
  bounce_reason?: string;
  failure_reason?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const event: DeliveryEvent = await req.json();
    console.log('Received delivery event:', event);

    // Find the email history record by recipient email
    const { data: emailRecord, error: fetchError } = await supabaseClient
      .from('email_history')
      .select('id')
      .eq('recipient_email', event.email)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !emailRecord) {
      console.error('Email record not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Email record not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update the email record based on event type
    const updates: any = {};

    switch (event.type) {
      case 'delivery':
        updates.delivery_status = 'delivered';
        updates.delivered_at = event.timestamp;
        break;
      case 'open':
        updates.delivery_status = 'opened';
        updates.opened_at = event.timestamp;
        // Also set delivered_at if not already set
        if (!emailRecord.delivered_at) {
          updates.delivered_at = event.timestamp;
        }
        break;
      case 'click':
        updates.clicked_at = event.timestamp;
        break;
      case 'bounce':
        updates.delivery_status = 'bounced';
        updates.bounced_at = event.timestamp;
        updates.bounce_reason = event.bounce_reason || event.bounce_type;
        break;
      case 'complaint':
        updates.delivery_status = 'failed';
        updates.failed_at = event.timestamp;
        updates.failure_reason = 'Spam complaint';
        break;
    }

    const { error: updateError } = await supabaseClient
      .from('email_history')
      .update(updates)
      .eq('id', emailRecord.id);

    if (updateError) {
      throw updateError;
    }

    console.log('Email delivery status updated:', emailRecord.id, updates);

    return new Response(
      JSON.stringify({ success: true, updated: emailRecord.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error processing delivery webhook:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
