import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { getEmailSignature } from '../_shared/emailSignature.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WaitlistConfirmationRequest {
  email: string;
  full_name: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, full_name }: WaitlistConfirmationRequest = await req.json();

    console.log(`Sending waitlist confirmation to ${email}`);

    if (!email || !full_name) {
      throw new Error('Missing required fields: email or full_name');
    }

    const smtpHost = Deno.env.get('SMTP_HOST');
    const smtpUser = Deno.env.get('SMTP_USER');
    const smtpPassword = Deno.env.get('SMTP_PASSWORD');
    const smtpPort = Deno.env.get('SMTP_PORT') || '587';

    if (!smtpHost || !smtpUser || !smtpPassword) {
      throw new Error('SMTP credentials not configured');
    }

    // Try to fetch custom template from database
    let htmlContent: string;
    let textContent: string;
    let subject = "You're on the SafeBatch Waitlist!";

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: template } = await supabase
      .from('email_templates')
      .select('subject, body')
      .eq('name', 'Waitlist Confirmation')
      .single();

    if (template) {
      subject = template.subject
        .replace(/{{full_name}}/g, full_name)
        .replace(/{{email}}/g, email);
      htmlContent = template.body
        .replace(/{{full_name}}/g, full_name)
        .replace(/{{email}}/g, email);
      textContent = htmlContent.replace(/<[^>]*>/g, '');
    } else {
      htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { text-align: center; margin-bottom: 32px; }
            .logo { width: 64px; height: 64px; border-radius: 12px; }
            .content { background-color: #f9fafb; padding: 24px; border-radius: 12px; margin-bottom: 24px; }
            .highlight { background: linear-gradient(135deg, #43bccd 0%, #2dd4bf 100%); color: white; padding: 20px; border-radius: 12px; text-align: center; margin: 24px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <img src="https://obbvohtcglpfnqbthnga.supabase.co/storage/v1/object/public/lab-reports/logo.png" alt="SafeBatch" class="logo" />
              <h1 style="margin: 16px 0 0 0; color: #111827;">You're on the Waitlist!</h1>
            </div>

            <div class="content">
              <p>Hi ${full_name},</p>
              <p>Thank you for your interest in SafeBatch! We've received your request to join our beta program.</p>
              <p>Our team will review your application and you'll receive an email notification once you've been approved. This typically takes 1-2 business days.</p>
            </div>

            <div class="highlight">
              <h3 style="margin: 0 0 8px 0;">What happens next?</h3>
              <p style="margin: 0; opacity: 0.9;">Once approved, you'll receive an email with instructions to create your account and start using SafeBatch.</p>
            </div>

            <div style="text-align: center; color: #6b7280; font-size: 14px;">
              <p>In the meantime, if you have any questions, feel free to reach out to us at <a href="mailto:support@safebatch.com" style="color: #43bccd;">support@safebatch.com</a></p>
            </div>

            ${getEmailSignature()}
          </div>
        </body>
      </html>
      `;

      textContent = `
Hi ${full_name},

Thank you for your interest in SafeBatch! We've received your request to join our beta program.

Our team will review your application and you'll receive an email notification once you've been approved. This typically takes 1-2 business days.

What happens next?
Once approved, you'll receive an email with instructions to create your account and start using SafeBatch.

In the meantime, if you have any questions, feel free to reach out to us at support@safebatch.com

Best regards,
The SafeBatch Team
      `;
    }

    // Build email payload
    const boundary = '----=_Part_' + Math.random().toString(36).substring(2);
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

    // Connect to SMTP server using STARTTLS (port 587)
    const conn = await Deno.connect({
      hostname: smtpHost,
      port: parseInt(smtpPort),
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    async function readResponse(connection: Deno.Conn): Promise<string> {
      const buffer = new Uint8Array(1024);
      let fullResponse = '';
      
      while (true) {
        const n = await connection.read(buffer);
        if (!n) throw new Error("Connection closed unexpectedly");
        
        const chunk = decoder.decode(buffer.subarray(0, n));
        fullResponse += chunk;
        
        const lines = fullResponse.split('\r\n');
        const lastLine = lines[lines.length - 2];
        if (lastLine && /^\d{3} /.test(lastLine)) {
          break;
        }
      }
      
      return fullResponse.trim();
    }

    async function sendCommand(connection: Deno.Conn, command: string): Promise<string> {
      await connection.write(encoder.encode(command + '\r\n'));
      return await readResponse(connection);
    }

    try {
      // Read greeting
      let response = await readResponse(conn);
      console.log('SMTP greeting:', response);

      // Send EHLO
      response = await sendCommand(conn, `EHLO ${smtpHost}`);
      console.log('EHLO response:', response);

      // Start TLS
      response = await sendCommand(conn, 'STARTTLS');
      console.log('STARTTLS response:', response);

      if (!response.startsWith('220')) {
        throw new Error(`STARTTLS failed: ${response}`);
      }

      // Upgrade to TLS
      const tlsConn = await Deno.startTls(conn, { hostname: smtpHost });

      // Send EHLO again after TLS
      response = await sendCommand(tlsConn, `EHLO ${smtpHost}`);
      console.log('EHLO (after TLS) response:', response);

      // Authenticate using AUTH PLAIN
      const authString = btoa(`\0${smtpUser}\0${smtpPassword}`);
      response = await sendCommand(tlsConn, `AUTH PLAIN ${authString}`);
      console.log('AUTH response:', response);

      if (!response.startsWith('235')) {
        throw new Error(`Authentication failed: ${response}`);
      }

      // Send email
      response = await sendCommand(tlsConn, `MAIL FROM:<${smtpUser}>`);
      console.log('MAIL FROM response:', response);

      response = await sendCommand(tlsConn, `RCPT TO:<${email}>`);
      console.log('RCPT TO response:', response);

      response = await sendCommand(tlsConn, 'DATA');
      console.log('DATA response:', response);

      // Send email data
      await tlsConn.write(encoder.encode(emailPayload + '\r\n.\r\n'));
      response = await readResponse(tlsConn);
      console.log('Email sent response:', response);

      if (!response.startsWith('250')) {
        throw new Error(`Email sending failed: ${response}`);
      }

      // Quit
      await sendCommand(tlsConn, 'QUIT');
      tlsConn.close();

      console.log(`Waitlist confirmation email sent to ${email}`);

      return new Response(
        JSON.stringify({ success: true, message: 'Confirmation email sent' }),
        { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
      );
    } catch (error) {
      conn.close();
      throw error;
    }
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error sending waitlist confirmation:', error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }
});
