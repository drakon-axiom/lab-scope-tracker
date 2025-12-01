import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { getEmailSignature } from '../_shared/emailSignature.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface LabPaymentNotificationRequest {
  quoteId: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { quoteId }: LabPaymentNotificationRequest = await req.json();

    console.log(`Processing lab payment notification for quote ${quoteId}`);

    if (!quoteId) {
      throw new Error('Missing required field: quoteId');
    }

    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get quote details with lab and items
    const { data: quote, error: quoteError } = await supabaseClient
      .from('quotes')
      .select(`
        *,
        labs:lab_id (name, contact_email),
        quote_items (
          *,
          products:product_id (name)
        )
      `)
      .eq('id', quoteId)
      .single();

    if (quoteError || !quote) {
      console.error('Error fetching quote:', quoteError);
      throw new Error('Quote not found');
    }

    const lab = quote.labs as { name: string; contact_email: string | null };
    const items = quote.quote_items as Array<{
      products: { name: string };
      client: string | null;
      sample: string | null;
      manufacturer: string | null;
      batch: string | null;
      price: number | null;
      additional_samples: number | null;
      additional_report_headers: number | null;
    }>;

    if (!lab.contact_email) {
      console.error('Lab has no contact email configured');
      throw new Error('Lab contact email not configured');
    }

    // Try to load email template for lab payment notification
    const { data: template } = await supabaseClient
      .from('email_templates')
      .select('subject, body')
      .eq('name', 'Lab Payment Notification')
      .or(`lab_id.eq.${quote.lab_id},lab_id.is.null`)
      .order('is_default', { ascending: false })
      .limit(1)
      .single();

    // Build items list
    const itemsHtml = items.map((item, index) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; border-right: 1px solid #e5e7eb;">${index + 1}</td>
        <td style="padding: 12px; border-right: 1px solid #e5e7eb;">${item.products.name}</td>
        <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
          <strong>Client:</strong> ${item.client || '—'}<br/>
          <strong>Sample:</strong> ${item.sample || '—'}<br/>
          <strong>Manufacturer:</strong> ${item.manufacturer || '—'}<br/>
          <strong>Batch:</strong> ${item.batch || '—'}
        </td>
        <td style="padding: 12px; text-align: right;">$${(item.price || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const itemsPlainText = items.map((item, index) => `
${index + 1}. ${item.products.name}
   Client: ${item.client || '—'}
   Sample: ${item.sample || '—'}
   Manufacturer: ${item.manufacturer || '—'}
   Batch: ${item.batch || '—'}
   Price: $${(item.price || 0).toFixed(2)}
    `).join('\n');

    let emailSubject: string;
    let htmlContent: string;

    if (template) {
      // Use template and replace variables
      emailSubject = template.subject
        .replace(/\{\{quote_number\}\}/g, quote.quote_number || 'N/A')
        .replace(/\{\{lab_quote_number\}\}/g, quote.lab_quote_number || 'N/A')
        .replace(/\{\{lab_name\}\}/g, lab.name);

      htmlContent = template.body
        .replace(/\{\{quote_number\}\}/g, quote.quote_number || 'N/A')
        .replace(/\{\{lab_quote_number\}\}/g, quote.lab_quote_number || 'N/A')
        .replace(/\{\{lab_name\}\}/g, lab.name)
        .replace(/\{\{payment_amount\}\}/g, `$${(quote.payment_amount_usd || 0).toFixed(2)}`)
        .replace(/\{\{payment_date\}\}/g, quote.payment_date ? new Date(quote.payment_date).toLocaleDateString() : 'N/A')
        .replace(/\{\{transaction_id\}\}/g, quote.transaction_id || 'N/A')
        .replace(/\{\{items_table\}\}/g, `<table style="width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e5e7eb;">
          <thead>
            <tr>
              <th style="background-color: #f9fafb; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; width: 50px;">#</th>
              <th style="background-color: #f9fafb; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Product/Test</th>
              <th style="background-color: #f9fafb; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb;">Details</th>
              <th style="background-color: #f9fafb; padding: 12px; text-align: right; font-weight: 600; border-bottom: 2px solid #e5e7eb; width: 100px;">Price</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>`)
        .replace(/\{\{items_list\}\}/g, itemsPlainText);
    } else {
      // Fallback to default template
      emailSubject = `Payment Received - Quote ${quote.quote_number || 'N/A'}`;
      
      htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 800px; margin: 0 auto; padding: 20px; }
              .header { background-color: #dbeafe; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 2px solid #60a5fa; }
              .table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e5e7eb; }
              .table th { background-color: #f9fafb; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
              .info-box { background-color: #eff6ff; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; color: #1e40af;">💰 Payment Received</h1>
                <p style="margin: 8px 0 0 0; color: #1e3a8a; font-size: 1.1em;">Quote #${quote.quote_number || 'N/A'} ${quote.lab_quote_number ? `(Lab #${quote.lab_quote_number})` : ''}</p>
              </div>

              <p>Dear ${lab.name} Team,</p>
              <p>We are pleased to inform you that payment has been received for the following quote. The samples are being prepared for shipment to your facility.</p>

              <div class="info-box">
                <h3 style="margin: 0 0 12px 0; color: #1e40af;">Payment Details</h3>
                <div style="color: #1e3a8a;">
                  <strong>Amount Received:</strong> $${(quote.payment_amount_usd || 0).toFixed(2)}<br/>
                  <strong>Payment Date:</strong> ${quote.payment_date ? new Date(quote.payment_date).toLocaleDateString() : 'N/A'}<br/>
                  ${quote.transaction_id ? `<strong>Transaction ID:</strong> ${quote.transaction_id}<br/>` : ''}
                  <strong>Quote Number:</strong> ${quote.quote_number || 'N/A'}<br/>
                  ${quote.lab_quote_number ? `<strong>Lab Quote Number:</strong> ${quote.lab_quote_number}` : ''}
                </div>
              </div>

              <h3 style="color: #374151;">Samples for Testing</h3>
              <table class="table">
                <thead>
                  <tr>
                    <th style="width: 50px;">#</th>
                    <th>Product/Test</th>
                    <th>Details</th>
                    <th style="width: 100px; text-align: right;">Price</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <div style="margin-top: 32px; padding: 20px; background-color: #f9fafb; border-radius: 8px;">
                <h3 style="margin: 0 0 12px 0; color: #374151;">Next Steps</h3>
                <ul style="color: #6b7280; margin: 0; padding-left: 20px;">
                  <li>Samples will be shipped to your facility shortly</li>
                  <li>You will receive tracking information once shipped</li>
                  <li>Please confirm receipt of samples upon delivery</li>
                  <li>Testing can begin immediately upon arrival</li>
                </ul>
              </div>

              <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 0.9em;">
                  Thank you for your continued partnership. If you have any questions about this shipment, please don't hesitate to contact us.
                </p>
              </div>
              
              ${getEmailSignature()}
            </div>
          </body>
        </html>
      `;
    }

    // Get SMTP configuration
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      throw new Error('SMTP configuration is missing');
    }

    console.log('Connecting to SMTP server...');

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

    let conn: Deno.TcpConn | null = null;
    let tlsConn: Deno.TlsConn | null = null;

    try {
      // Create SMTP connection
      conn = await Deno.connect({
        hostname: smtpHost,
        port: smtpPort,
      }) as Deno.TcpConn;

      // SMTP handshake
      await readResponse(conn);
      await sendCommand(conn, `EHLO ${smtpHost}`);
      await sendCommand(conn, "STARTTLS");
      
      // Upgrade to TLS
      tlsConn = await Deno.startTls(conn, { hostname: smtpHost });
      conn = null; // Connection is now consumed by TLS
      
      await sendCommand(tlsConn, `EHLO ${smtpHost}`);
      
      // Authenticate
      const authString = btoa(`\0${smtpUser}\0${smtpPassword}`);
      await sendCommand(tlsConn, `AUTH PLAIN ${authString}`);
      
      // Send email
      await sendCommand(tlsConn, `MAIL FROM:<${smtpUser}>`);
      await sendCommand(tlsConn, `RCPT TO:<${lab.contact_email}>`);
      await sendCommand(tlsConn, "DATA");
      
      const emailContent = `From: ${smtpUser}\r\nTo: ${lab.contact_email}\r\nSubject: ${emailSubject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${htmlContent}\r\n.\r\n`;
      await tlsConn.write(encoder.encode(emailContent));
      await readResponse(tlsConn);
      
      await sendCommand(tlsConn, "QUIT");
      
      console.log('Lab payment notification sent successfully');

      // Log activity
      await supabaseClient
        .from('quote_activity_log')
        .insert({
          quote_id: quoteId,
          user_id: null,
          activity_type: 'lab_notification',
          description: `Payment notification sent to ${lab.name}`,
          metadata: {
            lab_email: lab.contact_email,
            lab_name: lab.name,
            payment_amount: quote.payment_amount_usd,
          },
        });
      
      return new Response(
        JSON.stringify({ success: true, message: 'Lab payment notification sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (emailError) {
      console.error('SMTP error:', emailError);
      throw emailError;
    } finally {
      // Clean up connections properly
      try {
        if (tlsConn) {
          tlsConn.close();
        } else if (conn) {
          conn.close();
        }
      } catch (closeError) {
        console.error('Error closing connection:', closeError);
      }
    }
  } catch (error: any) {
    console.error('Error in notify-lab-payment function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
