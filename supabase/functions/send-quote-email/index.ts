import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

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

    // Plain text version for email clients that don't support HTML
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

    // Connect to SMTP server
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    if (!smtpHost || !smtpUser || !smtpPassword) {
      throw new Error("SMTP configuration is incomplete");
    }

    console.log(`Attempting to send email to ${labEmail} via ${smtpHost}:${smtpPort}`);

    const client = new SMTPClient({
      connection: {
        hostname: smtpHost,
        port: smtpPort,
        tls: true,
        auth: {
          username: smtpUser,
          password: smtpPassword,
        },
      },
    });

    // Send email
    await client.send({
      from: smtpUser,
      to: labEmail,
      subject: `Testing Quote Request ${quoteNumber ? `#${quoteNumber}` : ''}`,
      content: textContent,
      html: htmlContent,
    });

    await client.close();

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
