const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PaymentConfirmationRequest {
  quoteId: string;
  customerEmail: string;
  quoteNumber: string | null;
  labName: string;
  paymentAmountUsd: number;
  paymentDate: string;
  transactionId: string | null;
  items: Array<{
    productName: string;
    client: string | null;
    sample: string | null;
    manufacturer: string | null;
    batch: string | null;
    price: number | null;
    additional_samples: number | null;
    additional_report_headers: number | null;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      customerEmail,
      quoteNumber,
      labName,
      paymentAmountUsd,
      paymentDate,
      transactionId,
      items
    }: PaymentConfirmationRequest = await req.json();

    console.log(`Processing payment confirmation email for ${customerEmail}`);

    // Validate required fields
    if (!customerEmail || !paymentAmountUsd) {
      throw new Error('Missing required fields: customerEmail or paymentAmountUsd');
    }

    // Build items list for email
    const itemsHtml = items.map((item, index) => `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px; border-right: 1px solid #e5e7eb;">${index + 1}</td>
        <td style="padding: 12px; border-right: 1px solid #e5e7eb;">${item.productName}</td>
        <td style="padding: 12px; border-right: 1px solid #e5e7eb;">
          <strong>Client:</strong> ${item.client || '—'}<br/>
          <strong>Sample:</strong> ${item.sample || '—'}<br/>
          <strong>Manufacturer:</strong> ${item.manufacturer || '—'}<br/>
          <strong>Batch:</strong> ${item.batch || '—'}
        </td>
        <td style="padding: 12px; text-align: right;">$${(item.price || 0).toFixed(2)}</td>
      </tr>
    `).join('');

    const emailSubject = `Payment Confirmed - Quote ${quoteNumber || 'N/A'}`;
    
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dcfce7; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 2px solid #86efac; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e5e7eb; }
            .table th { background-color: #f9fafb; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
            .info-box { background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #22c55e; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; color: #166534;">✓ Payment Confirmed</h1>
              <p style="margin: 8px 0 0 0; color: #15803d; font-size: 1.1em;">Quote #${quoteNumber || 'N/A'}</p>
            </div>

            <p>Dear Customer,</p>
            <p>Your payment has been successfully processed and confirmed. Your samples will be shipped to <strong>${labName}</strong> for testing shortly.</p>

            <div class="info-box">
              <h3 style="margin: 0 0 12px 0; color: #166534;">Payment Details</h3>
              <div style="color: #15803d;">
                <strong>Amount Paid:</strong> $${paymentAmountUsd.toFixed(2)}<br/>
                <strong>Payment Date:</strong> ${new Date(paymentDate).toLocaleDateString()}<br/>
                ${transactionId ? `<strong>Transaction ID:</strong> ${transactionId}<br/>` : ''}
                <strong>Lab:</strong> ${labName}
              </div>
            </div>

            <h3 style="color: #374151;">Quote Items</h3>
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
              <h3 style="margin: 0 0 12px 0; color: #374151;">What's Next?</h3>
              <ul style="color: #6b7280; margin: 0; padding-left: 20px;">
                <li>Your samples will be prepared and shipped to the lab</li>
                <li>You will receive a tracking number once shipment is processed</li>
                <li>Testing will begin upon delivery to the lab</li>
                <li>You'll be notified when test results are available</li>
              </ul>
            </div>

            <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 0.9em;">
                Thank you for your business! If you have any questions, please don't hesitate to reach out.
              </p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Payment Confirmed

Quote Number: ${quoteNumber || 'N/A'}

Dear Customer,

Your payment has been successfully processed and confirmed. Your samples will be shipped to ${labName} for testing shortly.

Payment Details:
- Amount Paid: $${paymentAmountUsd.toFixed(2)}
- Payment Date: ${new Date(paymentDate).toLocaleDateString()}
${transactionId ? `- Transaction ID: ${transactionId}` : ''}
- Lab: ${labName}

Quote Items:
${items.map((item, index) => `
${index + 1}. ${item.productName}
   Client: ${item.client || '—'}
   Sample: ${item.sample || '—'}
   Manufacturer: ${item.manufacturer || '—'}
   Batch: ${item.batch || '—'}
   Price: $${(item.price || 0).toFixed(2)}
`).join('\n')}

What's Next?
- Your samples will be prepared and shipped to the lab
- You will receive a tracking number once shipment is processed
- Testing will begin upon delivery to the lab
- You'll be notified when test results are available

Thank you for your business!
    `.trim();

    // Get SMTP configuration
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      throw new Error('SMTP configuration is missing');
    }

    console.log('Connecting to SMTP server...');

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
      // SMTP handshake
      await readResponse(conn);
      await sendCommand(conn, `EHLO ${smtpHost}`);
      await sendCommand(conn, "STARTTLS");
      
      const tlsConn = await Deno.startTls(conn, { hostname: smtpHost });
      await sendCommand(tlsConn, `EHLO ${smtpHost}`);
      
      // Authenticate
      const authString = btoa(`\0${smtpUser}\0${smtpPassword}`);
      await sendCommand(tlsConn, `AUTH PLAIN ${authString}`);
      
      // Send email
      await sendCommand(tlsConn, `MAIL FROM:<${smtpUser}>`);
      await sendCommand(tlsConn, `RCPT TO:<${customerEmail}>`);
      await sendCommand(tlsConn, "DATA");
      
      const emailContent = `From: ${smtpUser}\r\nTo: ${customerEmail}\r\nSubject: ${emailSubject}\r\nContent-Type: text/html; charset=utf-8\r\n\r\n${htmlContent}\r\n.\r\n`;
      await tlsConn.write(encoder.encode(emailContent));
      await readResponse(tlsConn);
      
      await sendCommand(tlsConn, "QUIT");
      tlsConn.close();
      
      console.log('Payment confirmation email sent successfully');
      
      return new Response(
        JSON.stringify({ success: true, message: 'Payment confirmation email sent' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (emailError) {
      console.error('SMTP error:', emailError);
      conn.close();
      throw emailError;
    }
  } catch (error: any) {
    console.error('Error in send-payment-confirmation function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
