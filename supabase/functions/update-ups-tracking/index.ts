import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UPSAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface UPSTrackingResponse {
  trackResponse: {
    shipment: Array<{
      package: Array<{
        trackingNumber: string;
        deliveryDate?: Array<{ date: string }>;
        activity?: Array<{
          status: {
            type: string;
            description: string;
            code: string;
          };
          date: string;
          time: string;
        }>;
      }>;
    }>;
  };
}

async function getUPSAccessToken(): Promise<string> {
  const clientId = Deno.env.get('UPS_CLIENT_ID');
  const clientSecret = Deno.env.get('UPS_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('UPS credentials not configured');
  }

  const credentials = btoa(`${clientId}:${clientSecret}`);
  
  const response = await fetch('https://onlinetools.ups.com/security/v1/oauth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    console.error('UPS auth failed:', await response.text());
    throw new Error('Failed to authenticate with UPS');
  }

  const data: UPSAuthResponse = await response.json();
  return data.access_token;
}

async function getTrackingInfo(trackingNumber: string, accessToken: string): Promise<any> {
  const response = await fetch(
    `https://onlinetools.ups.com/api/track/v1/details/${trackingNumber}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'transId': crypto.randomUUID(),
        'transactionSrc': 'testing',
      },
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('UPS tracking failed:', errorText);
    throw new Error(`Failed to get tracking info: ${response.status}`);
  }

  const data: UPSTrackingResponse = await response.json();
  return data;
}

function determineStatus(trackingData: UPSTrackingResponse): string {
  const activity = trackingData.trackResponse?.shipment?.[0]?.package?.[0]?.activity?.[0];
  
  if (!activity) {
    return 'in_transit'; // Default if no activity
  }

  const statusCode = activity.status.code;
  const statusType = activity.status.type;

  // Delivered status
  if (statusType === 'D' || statusCode === 'FS') {
    return 'delivered';
  }

  // In transit
  if (statusType === 'I' || statusCode === 'IT') {
    return 'in_transit';
  }

  return 'in_transit'; // Default
}

function getEstimatedDelivery(trackingData: UPSTrackingResponse): string | null {
  const deliveryDate = trackingData.trackResponse?.shipment?.[0]?.package?.[0]?.deliveryDate?.[0]?.date;
  
  if (!deliveryDate) {
    return null;
  }

  // UPS returns date in YYYYMMDD format, convert to YYYY-MM-DD
  if (deliveryDate.length === 8) {
    return `${deliveryDate.slice(0, 4)}-${deliveryDate.slice(4, 6)}-${deliveryDate.slice(6, 8)}`;
  }
  
  return deliveryDate;
}

async function sendDeliveryNotification(quote: any, supabase: any): Promise<void> {
  try {
    // Get user profile for customer email
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', quote.user_id)
      .single();

    if (!profile) {
      console.error(`No profile found for user ${quote.user_id}`);
      return;
    }

    // Get user email from auth
    const { data: { user } } = await supabase.auth.admin.getUserById(quote.user_id);
    
    if (!user?.email) {
      console.error(`No email found for user ${quote.user_id}`);
      return;
    }

    // Get lab details
    const { data: lab } = await supabase
      .from('labs')
      .select('name')
      .eq('id', quote.lab_id)
      .single();

    const client = new SMTPClient({
      connection: {
        hostname: Deno.env.get('SMTP_HOST')!,
        port: Number(Deno.env.get('SMTP_PORT')),
        tls: true,
        auth: {
          username: Deno.env.get('SMTP_USER')!,
          password: Deno.env.get('SMTP_PASSWORD')!,
        },
      },
    });

    const emailSubject = `Package Delivered - Quote ${quote.quote_number}`;
    const emailBody = `
      <h2>Package Delivered</h2>
      <p>Your package for Quote #${quote.quote_number} has been delivered!</p>
      
      <h3>Delivery Details:</h3>
      <ul>
        <li><strong>Quote Number:</strong> ${quote.quote_number}</li>
        <li><strong>Lab:</strong> ${lab?.name || 'Unknown'}</li>
        <li><strong>Tracking Number:</strong> ${quote.tracking_number}</li>
        <li><strong>Shipped Date:</strong> ${quote.shipped_date ? new Date(quote.shipped_date).toLocaleDateString() : 'N/A'}</li>
      </ul>

      <p>The testing process should begin shortly. You'll be notified when results are available.</p>
    `;

    await client.send({
      from: Deno.env.get('SMTP_USER')!,
      to: user.email,
      subject: emailSubject,
      content: emailBody,
      html: emailBody,
    });

    await client.close();

    // Log email to history
    await supabase.from('email_history').insert({
      quote_id: quote.id,
      lab_id: quote.lab_id,
      user_id: quote.user_id,
      recipient_email: user.email,
      subject: emailSubject,
      body: emailBody,
      status: 'sent',
      delivery_status: 'delivered',
      sent_at: new Date().toISOString(),
      delivered_at: new Date().toISOString(),
    });

    console.log(`Delivery notification sent to ${user.email} for quote ${quote.quote_number}`);
  } catch (error) {
    console.error(`Failed to send delivery notification for quote ${quote.id}:`, error);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get tracking number from request or process all quotes with tracking numbers
    const { trackingNumber: singleTracking } = await req.json().catch(() => ({}));

    let quotesToUpdate;

    if (singleTracking) {
      // Update single tracking number - find quotes that need tracking updates
      // (not already delivered or completed)
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('tracking_number', singleTracking)
        .in('status', ['paid_awaiting_shipping', 'in_transit']);
      
      if (error) {
        console.error('Error fetching quotes:', error);
      }
      quotesToUpdate = data || [];
    } else {
      // Update all quotes with tracking numbers that need updates
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .not('tracking_number', 'is', null)
        .in('status', ['paid_awaiting_shipping', 'in_transit']);
      
      if (error) {
        console.error('Error fetching quotes:', error);
      }
      quotesToUpdate = data || [];
    }

    console.log(`Processing ${quotesToUpdate.length} quotes`);

    const accessToken = await getUPSAccessToken();
    const results = [];

    for (const quote of quotesToUpdate) {
      try {
        const trackingData = await getTrackingInfo(quote.tracking_number, accessToken);
        const newStatus = determineStatus(trackingData);
        const estimatedDelivery = getEstimatedDelivery(trackingData);

        // Update status and tracking timestamp
        const updateData: any = { tracking_updated_at: new Date().toISOString() };
        
        // Add estimated delivery if available
        if (estimatedDelivery) {
          updateData.estimated_delivery = estimatedDelivery;
        }
        
        // Only update status if it changed
        if (newStatus !== quote.status) {
          updateData.status = newStatus;
        }

        const { error } = await supabase
          .from('quotes')
          .update(updateData)
          .eq('id', quote.id);

        if (error) {
          console.error(`Failed to update quote ${quote.id}:`, error);
          results.push({ 
            quoteId: quote.id, 
            trackingNumber: quote.tracking_number,
            success: false, 
            error: error.message 
          });
        } else {
          // Log to tracking history if status changed
          if (newStatus !== quote.status) {
            await supabase
              .from('tracking_history')
              .insert({
                quote_id: quote.id,
                status: newStatus,
                tracking_number: quote.tracking_number,
                source: 'automatic',
                details: { 
                  old_status: quote.status,
                  tracking_data: trackingData 
                }
              });

            // Send email notification if delivered
            if (newStatus === 'delivered' && quote.status === 'in_transit') {
              await sendDeliveryNotification(quote, supabase);
            }

            console.log(`Updated quote ${quote.id} to ${newStatus}`);
            results.push({ 
              quoteId: quote.id, 
              trackingNumber: quote.tracking_number,
              success: true, 
              oldStatus: quote.status,
              newStatus 
            });
          } else {
            results.push({ 
              quoteId: quote.id, 
              trackingNumber: quote.tracking_number,
              success: true, 
              message: 'Status unchanged, timestamp updated',
              status: newStatus
            });
          }
        }
      } catch (error) {
        console.error(`Error processing quote ${quote.id}:`, error);
        results.push({ 
          quoteId: quote.id, 
          trackingNumber: quote.tracking_number,
          success: false, 
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: quotesToUpdate.length,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in update-ups-tracking:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
