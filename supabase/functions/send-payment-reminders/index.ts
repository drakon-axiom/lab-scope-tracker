import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';
import { getEmailSignature } from '../_shared/emailSignature.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Quote {
  id: string;
  quote_number: string | null;
  lab_id: string;
  payment_amount_usd: number | null;
  updated_at: string;
  user_id: string;
  labs: {
    name: string;
  } | null;
  quote_items: Array<{
    product_id: string;
    price: number | null;
    products: {
      name: string;
    } | null;
  }>;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting payment reminder check...');

    // Create Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get quotes with status "approved_payment_pending" that haven't been reminded recently
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    
    const { data: quotes, error: quotesError } = await supabase
      .from('quotes')
      .select(`
        id,
        quote_number,
        lab_id,
        payment_amount_usd,
        updated_at,
        user_id,
        labs!inner(name),
        quote_items!inner(
          product_id,
          price,
          products!inner(name)
        )
      `)
      .eq('status', 'approved_payment_pending')
      .lt('updated_at', threeDaysAgo) as { data: Quote[] | null; error: any };

    if (quotesError) {
      console.error('Error fetching quotes:', quotesError);
      throw quotesError;
    }

    if (!quotes || quotes.length === 0) {
      console.log('No quotes requiring payment reminders');
      return new Response(
        JSON.stringify({ message: 'No quotes requiring reminders', count: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${quotes.length} quotes requiring payment reminders`);

    // Get user emails for each quote
    const userIds = [...new Set(quotes.map(q => q.user_id))];
    const { data: authUsers } = await supabase.auth.admin.listUsers();
    
    const userEmailMap = new Map(
      authUsers?.users
        .filter(u => userIds.includes(u.id))
        .map(u => [u.id, u.email]) || []
    );

    // Check which quotes already received a reminder in the last 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: recentReminders } = await supabase
      .from('quote_activity_log')
      .select('quote_id')
      .eq('activity_type', 'payment_reminder')
      .gte('created_at', sevenDaysAgo);

    const recentReminderQuoteIds = new Set(recentReminders?.map(r => r.quote_id) || []);

    // Get SMTP configuration
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpPort = parseInt(Deno.env.get('SMTP_PORT') || '587');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');

    if (!smtpHost || !smtpPort || !smtpUser || !smtpPassword) {
      throw new Error('SMTP configuration is missing');
    }

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

    let remindersSent = 0;
    let remindersFailed = 0;

    // Send reminders for each quote
    for (const quote of quotes) {
      // Skip if reminder was sent recently
      if (recentReminderQuoteIds.has(quote.id)) {
        console.log(`Skipping quote ${quote.quote_number} - reminder sent recently`);
        continue;
      }

      const customerEmail = userEmailMap.get(quote.user_id);
      if (!customerEmail) {
        console.warn(`No email found for user ${quote.user_id}`);
        remindersFailed++;
        continue;
      }

      const totalAmount = quote.payment_amount_usd || 
        quote.quote_items.reduce((sum, item) => sum + (item.price || 0), 0);

      const daysSinceApproval = Math.floor(
        (Date.now() - new Date(quote.updated_at).getTime()) / (1000 * 60 * 60 * 24)
      );

      const emailSubject = `Payment Reminder - Quote ${quote.quote_number || quote.id}`;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background-color: #fef3c7; padding: 20px; border-radius: 8px; margin-bottom: 24px; border: 2px solid #fbbf24; }
              .info-box { background-color: #f0fdf4; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #fbbf24; }
              .amount { font-size: 1.5em; font-weight: bold; color: #059669; }
              .cta-button { display: inline-block; background-color: #059669; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1 style="margin: 0; color: #92400e;">⏰ Payment Reminder</h1>
                <p style="margin: 8px 0 0 0; color: #78350f;">Quote #${quote.quote_number || quote.id}</p>
              </div>

              <p>Dear Customer,</p>
              <p>This is a friendly reminder that your quote has been approved and is awaiting payment.</p>

              <div class="info-box">
                <p style="margin: 0 0 8px 0;"><strong>Quote Details:</strong></p>
                <p style="margin: 4px 0;">Lab: <strong>${quote.labs?.name || 'N/A'}</strong></p>
                <p style="margin: 4px 0;">Approved: <strong>${daysSinceApproval} days ago</strong></p>
                <p style="margin: 12px 0 0 0;">Amount Due:</p>
                <p class="amount" style="margin: 4px 0;">$${totalAmount.toFixed(2)}</p>
              </div>

              <div style="background-color: #f9fafb; padding: 16px; border-radius: 8px; margin: 20px 0;">
                <h3 style="margin: 0 0 12px 0; color: #374151;">Quote Items:</h3>
                <ul style="margin: 0; padding-left: 20px;">
                  ${quote.quote_items.map(item => `
                    <li style="margin: 8px 0;">
                      ${item.products?.name || 'N/A'} - $${(item.price || 0).toFixed(2)}
                    </li>
                  `).join('')}
                </ul>
              </div>

              <div style="text-align: center; margin: 32px 0;">
                <p style="margin-bottom: 16px;"><strong>Please complete your payment to proceed with testing.</strong></p>
                <a href="${supabaseUrl.replace('//', '//app.')}/quotes" class="cta-button">
                  Go to My Quotes
                </a>
              </div>

              <div style="margin-top: 32px; padding-top: 24px; border-top: 2px solid #e5e7eb;">
                <p style="color: #6b7280; font-size: 0.9em;">
                  Once payment is received, your samples will be shipped to the lab for testing.
                  If you have any questions or need assistance with payment, please don't hesitate to reach out.
                </p>
              </div>
              
              ${getEmailSignature()}
            </div>
          </body>
        </html>
      `;

      try {
        // Create SMTP connection
        const conn = await Deno.connect({
          hostname: smtpHost,
          port: smtpPort,
        });

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

        // Log the reminder in activity log
        await supabase.from('quote_activity_log').insert({
          quote_id: quote.id,
          user_id: null,
          activity_type: 'payment_reminder',
          description: `Payment reminder sent (${daysSinceApproval} days since approval)`,
          metadata: {
            email: customerEmail,
            days_since_approval: daysSinceApproval,
            amount_due: totalAmount
          }
        });

        console.log(`Payment reminder sent successfully for quote ${quote.quote_number}`);
        remindersSent++;
      } catch (emailError) {
        console.error(`Failed to send reminder for quote ${quote.quote_number}:`, emailError);
        remindersFailed++;
      }
    }

    console.log(`Payment reminders complete. Sent: ${remindersSent}, Failed: ${remindersFailed}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment reminders processed',
        sent: remindersSent,
        failed: remindersFailed,
        total: quotes.length
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    console.error('Error in send-payment-reminders function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
