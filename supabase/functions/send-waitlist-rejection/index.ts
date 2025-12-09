import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getEmailSignature } from '../_shared/emailSignature.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WaitlistRejectionRequest {
  email: string;
  full_name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name }: WaitlistRejectionRequest = await req.json();

    if (!email || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get SMTP credentials
    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    const smtpPort = Deno.env.get('SMTP_PORT') || '465';

    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.error('Missing SMTP configuration');
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Try to fetch custom template from database
    let htmlContent: string;
    let textContent: string;
    let subject = 'Update on Your SafeBatch Waitlist Application';

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: template } = await supabase
      .from('email_templates')
      .select('subject, body')
      .eq('name', 'Waitlist Rejection')
      .single();

    if (template) {
      subject = template.subject.replace(/{{full_name}}/g, full_name).replace(/{{email}}/g, email);
      htmlContent = template.body.replace(/{{full_name}}/g, full_name).replace(/{{email}}/g, email);
      textContent = htmlContent.replace(/<[^>]*>/g, '');
    } else {
      // Default template
      htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 32px; }
            .logo { width: 64px; height: 64px; border-radius: 12px; }
            .content { background-color: #f9fafb; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://obbvohtcglpfnqbthnga.supabase.co/storage/v1/object/public/lab-reports/logo.png" alt="SafeBatch" class="logo" />
              <h1 style="margin: 16px 0 0 0; color: #111827;">Update on Your Application</h1>
            </div>
            <div class="content">
              <p>Hello ${full_name},</p>
              <p>Thank you for your interest in SafeBatch and for taking the time to join our waitlist.</p>
              <p>After careful review, we regret to inform you that we are unable to approve your application at this time. This decision was not made lightly, and we appreciate your understanding.</p>
              <p>If you believe this decision was made in error or if your circumstances have changed, please feel free to reach out to us directly.</p>
              <p>We wish you the best in your endeavors.</p>
              <p style="margin-top: 30px;">Best regards,<br><strong>The SafeBatch Team</strong></p>
            </div>
            <div style="text-align: center; color: #6b7280; font-size: 14px;">
              <p>Questions? Contact us at <a href="mailto:support@safebatch.com" style="color: #43bccd;">support@safebatch.com</a></p>
            </div>
            ${getEmailSignature()}
          </div>
        </body>
        </html>
      `;

      textContent = `
Hello ${full_name},

Thank you for your interest in SafeBatch and for taking the time to join our waitlist.

After careful review, we regret to inform you that we are unable to approve your application at this time. This decision was not made lightly, and we appreciate your understanding.

If you believe this decision was made in error or if your circumstances have changed, please feel free to reach out to us directly.

We wish you the best in your endeavors.

Best regards,
The SafeBatch Team
      `.trim();
    }

    // Build email
    const boundary = `boundary_${Date.now()}`;
    const emailPayload = [
      `From: SafeBatch <${smtpUser}>`,
      `To: ${email}`,
      `Subject: ${subject}`,
      'MIME-Version: 1.0',
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      '',
      `--${boundary}`,
      'Content-Type: text/plain; charset=UTF-8',
      '',
      textContent,
      '',
      `--${boundary}`,
      'Content-Type: text/html; charset=UTF-8',
      '',
      htmlContent,
      '',
      `--${boundary}--`,
    ].join('\r\n');

    // Send via SMTP
    const conn = await Deno.connectTls({
      hostname: smtpHost,
      port: parseInt(smtpPort),
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readResponse = async (): Promise<string> => {
      const buffer = new Uint8Array(1024);
      const n = await conn.read(buffer);
      return decoder.decode(buffer.subarray(0, n || 0));
    };

    const sendCommand = async (command: string): Promise<string> => {
      await conn.write(encoder.encode(command + '\r\n'));
      return await readResponse();
    };

    await readResponse();
    await sendCommand(`EHLO ${smtpHost}`);
    await sendCommand('AUTH LOGIN');
    await sendCommand(btoa(smtpUser));
    await sendCommand(btoa(smtpPassword));
    await sendCommand(`MAIL FROM:<${smtpUser}>`);
    await sendCommand(`RCPT TO:<${email}>`);
    await sendCommand('DATA');
    await conn.write(encoder.encode(emailPayload + '\r\n.\r\n'));
    await readResponse();
    await sendCommand('QUIT');
    conn.close();

    console.log(`Waitlist rejection email sent to ${email}`);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending waitlist rejection email:', errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
