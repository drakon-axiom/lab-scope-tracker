import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

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
      // Update single tracking number
      const { data } = await supabase
        .from('quotes')
        .select('*')
        .eq('tracking_number', singleTracking)
        .single();
      
      quotesToUpdate = data ? [data] : [];
    } else {
      // Update all quotes with tracking numbers that aren't delivered
      const { data } = await supabase
        .from('quotes')
        .select('*')
        .not('tracking_number', 'is', null)
        .neq('status', 'delivered');
      
      quotesToUpdate = data || [];
    }

    console.log(`Processing ${quotesToUpdate.length} quotes`);

    const accessToken = await getUPSAccessToken();
    const results = [];

    for (const quote of quotesToUpdate) {
      try {
        const trackingData = await getTrackingInfo(quote.tracking_number, accessToken);
        const newStatus = determineStatus(trackingData);

        // Update status and tracking timestamp
        const updateData: any = { tracking_updated_at: new Date().toISOString() };
        
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
