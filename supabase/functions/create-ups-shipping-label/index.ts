import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UPSAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface ShipmentRequest {
  quoteId: string;
  shipperName: string;
  shipperAddress: string;
  shipperCity: string;
  shipperState: string;
  shipperZip: string;
  shipperCountry: string;
  recipientName: string;
  recipientAddress: string;
  recipientCity: string;
  recipientState: string;
  recipientZip: string;
  recipientCountry: string;
  packageWeight: number;
  packageLength?: number;
  packageWidth?: number;
  packageHeight?: number;
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

async function createShippingLabel(shipmentData: ShipmentRequest, accessToken: string) {
  const shipmentRequest = {
    ShipmentRequest: {
      Request: {
        RequestOption: "validate",
        TransactionReference: {
          CustomerContext: shipmentData.quoteId,
        },
      },
      Shipment: {
        Description: "Lab Testing Sample Shipment",
        Shipper: {
          Name: shipmentData.shipperName,
          ShipperNumber: Deno.env.get('UPS_SHIPPER_NUMBER') || '',
          Address: {
            AddressLine: [shipmentData.shipperAddress],
            City: shipmentData.shipperCity,
            StateProvinceCode: shipmentData.shipperState,
            PostalCode: shipmentData.shipperZip,
            CountryCode: shipmentData.shipperCountry,
          },
        },
        ShipTo: {
          Name: shipmentData.recipientName,
          Address: {
            AddressLine: [shipmentData.recipientAddress],
            City: shipmentData.recipientCity,
            StateProvinceCode: shipmentData.recipientState,
            PostalCode: shipmentData.recipientZip,
            CountryCode: shipmentData.recipientCountry,
          },
        },
        PaymentInformation: {
          ShipmentCharge: {
            Type: "01", // Transportation
            BillShipper: {
              AccountNumber: Deno.env.get('UPS_ACCOUNT_NUMBER') || '',
            },
          },
        },
        Service: {
          Code: "03", // UPS Ground
          Description: "Ground",
        },
        Package: {
          Description: "Lab Testing Samples",
          Packaging: {
            Code: "02", // Customer Supplied Package
          },
          Dimensions: {
            UnitOfMeasurement: {
              Code: "IN",
            },
            Length: shipmentData.packageLength?.toString() || "12",
            Width: shipmentData.packageWidth?.toString() || "12",
            Height: shipmentData.packageHeight?.toString() || "6",
          },
          PackageWeight: {
            UnitOfMeasurement: {
              Code: "LBS",
            },
            Weight: shipmentData.packageWeight.toString(),
          },
        },
      },
      LabelSpecification: {
        LabelImageFormat: {
          Code: "GIF",
        },
        HTTPUserAgent: "Mozilla/4.5",
      },
    },
  };

  const response = await fetch('https://onlinetools.ups.com/api/shipments/v1/ship', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify(shipmentRequest),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('UPS shipment creation failed:', errorText);
    throw new Error(`Failed to create UPS shipment: ${response.status}`);
  }

  return await response.json();
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Verify user is authenticated
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`[UPS Label] Processing request for user: ${user.id}`);

    // Check for validated credit card payment method
    const { data: paymentMethods, error: paymentError } = await supabaseClient
      .from('payment_methods')
      .select('*')
      .eq('user_id', user.id)
      .eq('method_type', 'credit_card')
      .eq('is_validated', true)
      .limit(1);

    if (paymentError) {
      console.error('[UPS Label] Payment method check error:', paymentError);
      throw new Error('Failed to verify payment method');
    }

    if (!paymentMethods || paymentMethods.length === 0) {
      throw new Error('No validated credit card on file. Please add and validate a credit card payment method first.');
    }

    console.log('[UPS Label] Validated payment method found');

    const shipmentData: ShipmentRequest = await req.json();

    // Verify quote belongs to user
    const { data: quote, error: quoteError } = await supabaseClient
      .from('quotes')
      .select('*')
      .eq('id', shipmentData.quoteId)
      .eq('user_id', user.id)
      .single();

    if (quoteError || !quote) {
      throw new Error('Quote not found or access denied');
    }

    if (quote.status !== 'paid_awaiting_shipping') {
      throw new Error('Quote must be in paid_awaiting_shipping status to generate shipping label');
    }

    console.log(`[UPS Label] Creating label for quote: ${quote.quote_number || quote.id}`);

    // Get UPS access token
    const accessToken = await getUPSAccessToken();
    
    // Create shipping label
    const labelResponse = await createShippingLabel(shipmentData, accessToken);
    
    console.log('[UPS Label] Label created successfully');

    // Extract tracking number and label data
    const trackingNumber = labelResponse.ShipmentResponse?.ShipmentResults?.PackageResults?.TrackingNumber;
    const labelImage = labelResponse.ShipmentResponse?.ShipmentResults?.PackageResults?.ShippingLabel?.GraphicImage;

    if (!trackingNumber) {
      throw new Error('Failed to get tracking number from UPS response');
    }

    // Update quote with tracking number and status
    const { error: updateError } = await supabaseClient
      .from('quotes')
      .update({
        tracking_number: trackingNumber,
        status: 'in_transit',
        shipped_date: new Date().toISOString().split('T')[0],
      })
      .eq('id', shipmentData.quoteId);

    if (updateError) {
      console.error('[UPS Label] Failed to update quote:', updateError);
      throw new Error('Failed to update quote with tracking information');
    }

    // Log activity
    await supabaseClient.from('quote_activity_log').insert({
      quote_id: shipmentData.quoteId,
      user_id: user.id,
      activity_type: 'shipping_label_generated',
      description: `UPS shipping label generated - tracking #${trackingNumber}`,
      metadata: {
        tracking_number: trackingNumber,
        shipping_service: 'UPS Ground',
      },
    });

    console.log(`[UPS Label] Quote updated with tracking: ${trackingNumber}`);

    return new Response(
      JSON.stringify({
        success: true,
        trackingNumber,
        labelImage, // Base64 encoded GIF
        message: 'Shipping label created successfully',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error: any) {
    console.error('[UPS Label] Error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Internal server error',
      }),
      {
        status: error.message?.includes('Unauthorized') ? 401 : 
                error.message?.includes('No validated credit card') ? 403 : 
                error.message?.includes('not found') ? 404 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
