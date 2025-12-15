import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LabRequestNotification {
  lab_name: string;
  location?: string;
  contact_email?: string;
  website?: string;
  notes?: string;
  requester_email: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const requestData: LabRequestNotification = await req.json();
    console.log("Received lab request notification:", requestData);

    // Get admin emails from user_roles table
    const { data: adminRoles, error: rolesError } = await supabaseClient
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (rolesError) {
      console.error("Error fetching admin roles:", rolesError);
      throw new Error("Failed to fetch admin users");
    }

    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admin users found to notify");
      return new Response(
        JSON.stringify({ message: "No admins to notify" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Get admin emails from auth.users
    const adminEmails: string[] = [];
    for (const admin of adminRoles) {
      const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(admin.user_id);
      if (!userError && userData?.user?.email) {
        adminEmails.push(userData.user.email);
      }
    }

    if (adminEmails.length === 0) {
      console.log("No admin emails found");
      return new Response(
        JSON.stringify({ message: "No admin emails found" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Sending notification to admins:", adminEmails);

    // Send email via SMTP
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.error("SMTP configuration missing");
      throw new Error("SMTP configuration is incomplete");
    }

    // Import SMTPClient
    const { SMTPClient } = await import("https://deno.land/x/denomailer@1.6.0/mod.ts");

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

    const subject = `New Lab Request: ${requestData.lab_name}`;
    const htmlBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Lab Request Submitted</h2>
        <p>A customer has submitted a request to add a new testing lab.</p>
        
        <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #333;">Lab Details</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Lab Name:</td>
              <td style="padding: 8px 0;">${requestData.lab_name}</td>
            </tr>
            ${requestData.location ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Location:</td>
              <td style="padding: 8px 0;">${requestData.location}</td>
            </tr>
            ` : ""}
            ${requestData.contact_email ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Contact Email:</td>
              <td style="padding: 8px 0;">${requestData.contact_email}</td>
            </tr>
            ` : ""}
            ${requestData.website ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Website:</td>
              <td style="padding: 8px 0;"><a href="${requestData.website}">${requestData.website}</a></td>
            </tr>
            ` : ""}
            ${requestData.notes ? `
            <tr>
              <td style="padding: 8px 0; font-weight: bold; color: #666;">Notes:</td>
              <td style="padding: 8px 0;">${requestData.notes}</td>
            </tr>
            ` : ""}
          </table>
        </div>
        
        <div style="background-color: #e8f4fc; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #666;">
            <strong>Requested by:</strong> ${requestData.requester_email}
          </p>
        </div>
        
        <p style="color: #666;">
          Please review this request in the <a href="https://safebatch.io/lab-requests-management">Lab Requests Management</a> page.
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          This is an automated notification from SafeBatch.
        </p>
      </div>
    `;

    const textBody = `
New Lab Request Submitted

A customer has submitted a request to add a new testing lab.

Lab Details:
- Lab Name: ${requestData.lab_name}
${requestData.location ? `- Location: ${requestData.location}` : ""}
${requestData.contact_email ? `- Contact Email: ${requestData.contact_email}` : ""}
${requestData.website ? `- Website: ${requestData.website}` : ""}
${requestData.notes ? `- Notes: ${requestData.notes}` : ""}

Requested by: ${requestData.requester_email}

Please review this request in the Lab Requests Management page.
    `;

    for (const adminEmail of adminEmails) {
      try {
        await client.send({
          from: smtpUser,
          to: adminEmail,
          subject: subject,
          content: textBody,
          html: htmlBody,
        });
        console.log(`Email sent successfully to ${adminEmail}`);
      } catch (emailError) {
        console.error(`Failed to send email to ${adminEmail}:`, emailError);
      }
    }

    await client.close();

    return new Response(
      JSON.stringify({ success: true, notified: adminEmails.length }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in notify-lab-request:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
