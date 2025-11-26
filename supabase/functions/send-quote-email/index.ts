const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface QuoteEmailRequest {
  quoteId: string;
  labEmail: string;
  labName: string;
  quoteNumber: string | null;
  items: Array<{
    productName: string;
    client: string | null;
    sample: string | null;
    manufacturer: string | null;
    batch: string | null;
    price: number | null;
  }>;
  notes: string | null;
  totalValue: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      labEmail, 
      labName, 
      quoteNumber, 
      items, 
      notes, 
      totalValue 
    }: QuoteEmailRequest = await req.json();

    console.log(`Processing email request for ${labEmail}`);

    // Validate required fields
    if (!labEmail || !items || items.length === 0) {
      throw new Error('Missing required fields: labEmail or items');
    }

    // Build email content
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

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; border: 1px solid #e5e7eb; }
            .table th { background-color: #f9fafb; padding: 12px; text-align: left; font-weight: 600; border-bottom: 2px solid #e5e7eb; }
            .footer { margin-top: 24px; padding-top: 24px; border-top: 2px solid #e5e7eb; }
            .total { font-size: 1.25em; font-weight: bold; text-align: right; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0; color: #111827;">Testing Quote Request</h1>
              <p style="margin: 8px 0 0 0; color: #6b7280;">Quote Number: ${quoteNumber || 'Pending Assignment'}</p>
            </div>

            <p>Dear ${labName},</p>
            <p>Please review the following quote request for testing services:</p>

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

            <div class="total">
              Total Quote Value: $${totalValue.toFixed(2)}
            </div>

            ${notes ? `
              <div style="margin: 24px 0; padding: 16px; background-color: #f9fafb; border-radius: 8px;">
                <h3 style="margin: 0 0 8px 0; color: #374151;">Additional Notes:</h3>
                <p style="margin: 0; white-space: pre-wrap;">${notes}</p>
              </div>
            ` : ''}

            <div class="footer">
              <p><strong>Next Steps:</strong></p>
              <ul style="color: #6b7280;">
                <li>Please review the quote details above</li>
                <li>Confirm pricing and availability</li>
                <li>Provide a quote number if needed</li>
                <li>Respond with any questions or concerns</li>
              </ul>
              <p style="margin-top: 20px;">Thank you for your service!</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const textContent = `
Testing Quote Request
Quote Number: ${quoteNumber || 'Pending Assignment'}

Dear ${labName},

Please review the following quote request for testing services:

${items.map((item, index) => `
${index + 1}. ${item.productName}
   Client: ${item.client || '—'}
   Sample: ${item.sample || '—'}
   Manufacturer: ${item.manufacturer || '—'}
   Batch: ${item.batch || '—'}
   Price: $${(item.price || 0).toFixed(2)}
`).join('\n')}

Total Quote Value: $${totalValue.toFixed(2)}

${notes ? `Additional Notes:\n${notes}\n` : ''}

Next Steps:
- Please review the quote details above
- Confirm pricing and availability
- Provide a quote number if needed
- Respond with any questions or concerns

Thank you for your service!
    `;

    // Get SMTP configuration
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    if (!smtpHost || !smtpUser || !smtpPassword) {
      throw new Error("SMTP configuration is incomplete");
    }

    console.log(`Connecting to ${smtpHost}:${smtpPort} as ${smtpUser}`);

    // Create SMTP connection using native Deno
    const conn = await Deno.connect({
      hostname: smtpHost,
      port: smtpPort,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper to read SMTP response
    async function readResponse(): Promise<string> {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      if (!n) throw new Error("Connection closed");
      return decoder.decode(buffer.subarray(0, n));
    }

    // Helper to send SMTP command
    async function sendCommand(command: string): Promise<string> {
      await conn.write(encoder.encode(command + "\r\n"));
      return await readResponse();
    }

    try {
      // Read greeting
      let response = await readResponse();
      console.log("SMTP greeting:", response);

      // Send EHLO
      response = await sendCommand(`EHLO ${smtpHost}`);
      console.log("EHLO response:", response);

      // Start TLS
      response = await sendCommand("STARTTLS");
      console.log("STARTTLS response:", response);

      // Upgrade to TLS
      const tlsConn = await Deno.startTls(conn, { hostname: smtpHost });
      
      // Continue with TLS connection
      async function tlsReadResponse(): Promise<string> {
        const buffer = new Uint8Array(1024);
        const n = await tlsConn.read(buffer);
        if (!n) throw new Error("Connection closed");
        return decoder.decode(buffer.subarray(0, n));
      }

      async function tlsSendCommand(command: string): Promise<string> {
        await tlsConn.write(encoder.encode(command + "\r\n"));
        return await tlsReadResponse();
      }

      // Send EHLO again after TLS
      response = await tlsSendCommand(`EHLO ${smtpHost}`);
      console.log("EHLO (after TLS) response:", response);

      // Authenticate
      const authString = btoa(`\0${smtpUser}\0${smtpPassword}`);
      response = await tlsSendCommand(`AUTH PLAIN ${authString}`);
      console.log("AUTH response:", response);

      // Send email
      response = await tlsSendCommand(`MAIL FROM:<${smtpUser}>`);
      console.log("MAIL FROM response:", response);

      response = await tlsSendCommand(`RCPT TO:<${labEmail}>`);
      console.log("RCPT TO response:", response);

      response = await tlsSendCommand("DATA");
      console.log("DATA response:", response);

      // Send email headers and body
      const emailData = [
        `From: ${smtpUser}`,
        `To: ${labEmail}`,
        `Subject: Testing Quote Request ${quoteNumber ? `#${quoteNumber}` : ''}`,
        `MIME-Version: 1.0`,
        `Content-Type: multipart/alternative; boundary="boundary123"`,
        ``,
        `--boundary123`,
        `Content-Type: text/plain; charset=UTF-8`,
        ``,
        textContent,
        ``,
        `--boundary123`,
        `Content-Type: text/html; charset=UTF-8`,
        ``,
        htmlContent,
        ``,
        `--boundary123--`,
        `.`,
      ].join("\r\n");

      await tlsConn.write(encoder.encode(emailData + "\r\n"));
      response = await tlsReadResponse();
      console.log("Email sent response:", response);

      // Quit
      await tlsSendCommand("QUIT");
      tlsConn.close();

      console.log(`Email sent successfully to ${labEmail}`);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Email sent successfully" 
        }),
        {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    } catch (error) {
      conn.close();
      throw error;
    }
  } catch (error: any) {
    console.error("Error sending email:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message || "Failed to send email" 
      }),
      {
        status: 500,
        headers: { 
          "Content-Type": "application/json", 
          ...corsHeaders 
        },
      }
    );
  }
});
