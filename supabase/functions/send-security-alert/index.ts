import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AlertRequest {
  recipients: string[];
  email: string;
  ipAddress: string;
  errorMessage: string;
  userAgent: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { recipients, email, ipAddress, errorMessage, userAgent }: AlertRequest = await req.json();

    console.log("Sending security alert email to:", recipients);

    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    if (!smtpHost || !smtpUser || !smtpPassword) {
      throw new Error("SMTP configuration incomplete");
    }

    const emailSubject = "⚠️ Unauthorized Admin Login Attempt";
    const emailBody = `
      <h2 style="color: #dc2626;">Unauthorized Admin Login Attempt Detected</h2>
      <p>An unauthorized attempt to access the admin portal was detected with the following details:</p>
      <table style="border-collapse: collapse; margin: 20px 0;">
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Email:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${email}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">IP Address:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${ipAddress}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Time:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${new Date().toLocaleString()}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Reason:</td>
          <td style="padding: 8px; border: 1px solid #ddd;">${errorMessage || "Invalid credentials"}</td>
        </tr>
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">User Agent:</td>
          <td style="padding: 8px; border: 1px solid #ddd; word-break: break-all;">${userAgent || "Unknown"}</td>
        </tr>
      </table>
      <p style="color: #dc2626; font-weight: bold;">⚠️ If this was not you, please review your security settings immediately.</p>
      <hr style="margin: 20px 0;" />
      <p style="color: #666; font-size: 12px;">This is an automated security alert from Testing Tracker Admin Portal.</p>
    `;

    // Create connection to SMTP server
    const conn = await Deno.connect({
      hostname: smtpHost,
      port: smtpPort,
    });

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Helper to read from connection
    const readLine = async (): Promise<string> => {
      const buf = new Uint8Array(1024);
      const n = await conn.read(buf);
      return decoder.decode(buf.subarray(0, n || 0));
    };

    // Helper to write to connection
    const writeLine = async (line: string) => {
      await conn.write(encoder.encode(line + "\r\n"));
    };

    try {
      // SMTP handshake
      await readLine(); // Read server greeting
      await writeLine(`EHLO ${smtpHost}`);
      await readLine();
      
      // LOGIN
      await writeLine("AUTH LOGIN");
      await readLine();
      await writeLine(btoa(smtpUser));
      await readLine();
      await writeLine(btoa(smtpPassword));
      await readLine();

      // Send email to each recipient
      for (const recipient of recipients) {
        await writeLine(`MAIL FROM:<${smtpUser}>`);
        await readLine();
        await writeLine(`RCPT TO:<${recipient}>`);
        await readLine();
        await writeLine("DATA");
        await readLine();
        
        const emailContent = [
          `From: Testing Tracker Security <${smtpUser}>`,
          `To: ${recipient}`,
          `Subject: ${emailSubject}`,
          "MIME-Version: 1.0",
          "Content-Type: text/html; charset=utf-8",
          "",
          emailBody,
          ".",
        ].join("\r\n");
        
        await writeLine(emailContent);
        await readLine();
      }

      await writeLine("QUIT");
      await readLine();
      
      console.log("Security alert emails sent successfully");
    } finally {
      conn.close();
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  } catch (error: any) {
    console.error("Error in send-security-alert function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
