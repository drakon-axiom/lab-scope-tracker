import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { encode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-signature',
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

// Verify HMAC signature
async function verifySignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    
    const signatureBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    );
    
    const expectedSignature = new TextDecoder().decode(encode(new Uint8Array(signatureBytes)));
    
    // Constant-time comparison to prevent timing attacks
    if (signature.length !== expectedSignature.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < signature.length; i++) {
      result |= signature.charCodeAt(i) ^ expectedSignature.charCodeAt(i);
    }
    
    return result === 0;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const webhookSecret = Deno.env.get('EMAIL_WEBHOOK_SECRET');
    
    if (!webhookSecret) {
      console.error('EMAIL_WEBHOOK_SECRET not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the raw body for signature verification
    const rawBody = await req.text();
    
    // Get signature from header
    const signature = req.headers.get('x-webhook-signature');
    
    if (!signature) {
      console.error('Missing webhook signature header');
      return new Response(
        JSON.stringify({ error: 'Missing signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the signature
    const isValid = await verifySignature(rawBody, signature, webhookSecret);
    
    if (!isValid) {
      console.error('Invalid webhook signature');
      return new Response(
        JSON.stringify({ error: 'Invalid signature' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook signature verified successfully');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const event: DeliveryEvent = JSON.parse(rawBody);
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
