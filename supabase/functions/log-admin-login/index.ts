import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LoginAttempt {
  email: string;
  success: boolean;
  userId?: string;
  errorMessage?: string;
  userAgent?: string;
  captchaToken?: string;
}

async function verifyCaptcha(token: string): Promise<boolean> {
  const secretKey = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secretKey) {
    console.error("TURNSTILE_SECRET_KEY not configured");
    return false;
  }

  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        secret: secretKey,
        response: token,
      }),
    });

    const data = await response.json();
    console.log("Turnstile verification response:", data);
    return data.success === true;
  } catch (error) {
    console.error("Error verifying CAPTCHA:", error);
    return false;
  }
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { email, success, userId, errorMessage, userAgent, captchaToken }: LoginAttempt = await req.json();

    // Extract IP address from request headers
    const ipAddress = 
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      req.headers.get("cf-connecting-ip") || // Cloudflare
      "unknown";

    console.log("Logging admin login attempt:", {
      email,
      success,
      userId,
      ipAddress,
      errorMessage: errorMessage?.substring(0, 100), // Log first 100 chars
    });

    // Fetch security settings for rate limiting
    const { data: settingsData, error: settingsError } = await supabase
      .from("security_settings")
      .select("setting_key, setting_value")
      .in("setting_key", ["max_login_attempts", "lockout_duration_minutes"]);

    if (settingsError) {
      console.error("Error fetching security settings:", settingsError);
    }

    const maxAttempts = settingsData?.find(s => s.setting_key === "max_login_attempts")?.setting_value?.value || 5;
    const lockoutDuration = settingsData?.find(s => s.setting_key === "lockout_duration_minutes")?.setting_value?.value || 30;

    console.log("Rate limiting settings:", { maxAttempts, lockoutDuration });

    // Check for recent failed attempts within lockout window
    const lockoutWindowStart = new Date(Date.now() - lockoutDuration * 60 * 1000).toISOString();
    
    const { data: recentAttempts, error: attemptsError } = await supabase
      .from("admin_login_audit")
      .select("id")
      .eq("email", email)
      .eq("success", false)
      .gte("created_at", lockoutWindowStart)
      .order("created_at", { ascending: false });

    if (attemptsError) {
      console.error("Error fetching recent attempts:", attemptsError);
    }

    const failedAttemptsCount = recentAttempts?.length || 0;
    console.log("Recent failed attempts:", failedAttemptsCount);

    // Check if CAPTCHA is required (3 or more failed attempts)
    const captchaRequired = failedAttemptsCount >= 3;
    console.log("CAPTCHA required:", captchaRequired);

    // If CAPTCHA is required, verify it
    if (captchaRequired) {
      if (!captchaToken) {
        console.log("CAPTCHA required but not provided");
        return new Response(
          JSON.stringify({ 
            error: "CAPTCHA verification required",
            captchaRequired: true
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }

      const captchaValid = await verifyCaptcha(captchaToken);
      if (!captchaValid) {
        console.log("CAPTCHA verification failed");
        
        // Log the failed attempt
        await supabase.from("admin_login_audit").insert({
          user_id: userId || null,
          email,
          success: false,
          error_message: "CAPTCHA verification failed",
          ip_address: ipAddress,
          user_agent: userAgent || null,
        });

        return new Response(
          JSON.stringify({ 
            error: "CAPTCHA verification failed. Please try again.",
            captchaRequired: true
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              ...corsHeaders,
            },
          }
        );
      }
      console.log("CAPTCHA verification successful");
    }

    // If failed attempts exceed limit, reject the login attempt
    if (!success && failedAttemptsCount >= maxAttempts) {
      console.log("Account locked due to too many failed attempts");
      
      // Still log this attempt
      await supabase.from("admin_login_audit").insert({
        user_id: userId || null,
        email,
        success: false,
        error_message: "Account locked due to too many failed login attempts",
        ip_address: ipAddress,
        user_agent: userAgent || null,
      });

      return new Response(
        JSON.stringify({ 
          error: "Account temporarily locked due to too many failed login attempts",
          locked: true,
          lockoutMinutes: lockoutDuration,
          attemptsRemaining: 0
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            ...corsHeaders,
          },
        }
      );
    }

    // Insert audit log
    const { error: auditError } = await supabase
      .from("admin_login_audit")
      .insert({
        user_id: userId || null,
        email,
        success,
        error_message: errorMessage || null,
        ip_address: ipAddress,
        user_agent: userAgent || null,
      });

    if (auditError) {
      console.error("Error inserting audit log:", auditError);
      throw auditError;
    }

    // Calculate attempts remaining
    const attemptsRemaining = Math.max(0, maxAttempts - (failedAttemptsCount + (success ? 0 : 1)));

    // If login failed, check if we should send email alert
    if (!success) {
      console.log("Login failed, checking if email alert should be sent...");

      // Fetch security settings
      const { data: settingsData, error: settingsError } = await supabase
        .from("security_settings")
        .select("setting_key, setting_value")
        .in("setting_key", ["alert_email_enabled", "alert_email_recipients"]);

      if (settingsError) {
        console.error("Error fetching security settings:", settingsError);
      } else {
        const alertEnabled = settingsData?.find(s => s.setting_key === "alert_email_enabled")?.setting_value?.value;
        const recipients = settingsData?.find(s => s.setting_key === "alert_email_recipients")?.setting_value?.value || [];

        console.log("Alert settings:", { alertEnabled, recipients });

        if (alertEnabled && recipients.length > 0) {
          console.log("Sending email alert to recipients:", recipients);

          // Prepare email content
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

          // Send email using existing SMTP configuration
          try {
            const smtpHost = Deno.env.get("SMTP_HOST");
            const smtpPort = Deno.env.get("SMTP_PORT");
            const smtpUser = Deno.env.get("SMTP_USER");
            const smtpPassword = Deno.env.get("SMTP_PASSWORD");

            if (!smtpHost || !smtpUser || !smtpPassword) {
              console.error("SMTP configuration incomplete, skipping email");
            } else {
              // Send email to each recipient
              for (const recipient of recipients) {
                console.log("Sending alert email to:", recipient);
                
                const emailPayload = {
                  from: smtpUser,
                  to: recipient,
                  subject: emailSubject,
                  html: emailBody,
                };

                // Use nodemailer via edge function (we'll need to implement this separately)
                // For now, just log that we would send the email
                console.log("Email would be sent to:", recipient);
                // TODO: Implement actual email sending using SMTP or Resend
              }
            }
          } catch (emailError) {
            console.error("Error sending email alert:", emailError);
            // Don't fail the request if email fails
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        ipAddress,
        attemptsRemaining: success ? maxAttempts : attemptsRemaining
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
    console.error("Error in log-admin-login function:", error);
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
