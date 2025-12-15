import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LabRequestStatusNotification {
  user_id: string;
  lab_name: string;
  status: "approved" | "rejected";
  admin_notes?: string;
  lab_created?: boolean;
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

    const requestData: LabRequestStatusNotification = await req.json();
    console.log("Lab request status notification:", requestData);

    // Get user email
    const { data: userData, error: userError } = await supabaseClient.auth.admin.getUserById(requestData.user_id);
    
    if (userError || !userData?.user?.email) {
      console.error("Error fetching user:", userError);
      throw new Error("Failed to fetch user email");
    }

    const userEmail = userData.user.email;
    console.log("Sending notification to:", userEmail);

    // Send email via SMTP
    const smtpHost = Deno.env.get("SMTP_HOST");
    const smtpPort = parseInt(Deno.env.get("SMTP_PORT") || "587");
    const smtpUser = Deno.env.get("SMTP_USER");
    const smtpPassword = Deno.env.get("SMTP_PASSWORD");

    if (!smtpHost || !smtpUser || !smtpPassword) {
      console.error("SMTP configuration missing");
      throw new Error("SMTP configuration is incomplete");
    }

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

    const isApproved = requestData.status === "approved";
    const subject = isApproved 
      ? `Lab Request Approved: ${requestData.lab_name}`
      : `Lab Request Update: ${requestData.lab_name}`;

    const htmlBody = isApproved ? `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Good News! Your Lab Request Has Been Approved</h2>
        
        <p>We're pleased to inform you that your request to add <strong>${requestData.lab_name}</strong> has been approved.</p>
        
        ${requestData.lab_created ? `
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <p style="margin: 0; color: #166534;">
            <strong>✓ Lab Added:</strong> ${requestData.lab_name} is now available in your labs list and ready to use for testing requests.
          </p>
        </div>
        ` : `
        <div style="background-color: #f0fdf4; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #16a34a;">
          <p style="margin: 0; color: #166534;">
            The lab will be added to the system shortly and will then be available for your testing requests.
          </p>
        </div>
        `}
        
        ${requestData.admin_notes ? `
        <div style="background-color: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0; color: #666;">
            <strong>Note from our team:</strong><br/>
            ${requestData.admin_notes}
          </p>
        </div>
        ` : ""}
        
        <p>
          <a href="https://safebatch.io/labs" style="display: inline-block; padding: 12px 24px; background-color: #16a34a; color: white; text-decoration: none; border-radius: 6px;">
            View Labs
          </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          This is an automated notification from SafeBatch.
        </p>
      </div>
    ` : `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Lab Request Update</h2>
        
        <p>We've reviewed your request to add <strong>${requestData.lab_name}</strong> and unfortunately we're unable to add this lab at this time.</p>
        
        ${requestData.admin_notes ? `
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <p style="margin: 0; color: #991b1b;">
            <strong>Reason:</strong><br/>
            ${requestData.admin_notes}
          </p>
        </div>
        ` : ""}
        
        <p style="color: #666;">
          If you believe this was in error or have additional information about this lab, please don't hesitate to submit a new request with more details.
        </p>
        
        <p>
          <a href="https://safebatch.io/labs" style="display: inline-block; padding: 12px 24px; background-color: #333; color: white; text-decoration: none; border-radius: 6px;">
            Submit New Request
          </a>
        </p>
        
        <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
        <p style="color: #999; font-size: 12px;">
          This is an automated notification from SafeBatch.
        </p>
      </div>
    `;

    const textBody = isApproved 
      ? `Good News! Your Lab Request Has Been Approved

We're pleased to inform you that your request to add ${requestData.lab_name} has been approved.

${requestData.lab_created ? `The lab has been added to the system and is now available for your testing requests.` : `The lab will be added to the system shortly.`}

${requestData.admin_notes ? `Note from our team: ${requestData.admin_notes}` : ""}

View your labs at: https://safebatch.io/labs
`
      : `Lab Request Update

We've reviewed your request to add ${requestData.lab_name} and unfortunately we're unable to add this lab at this time.

${requestData.admin_notes ? `Reason: ${requestData.admin_notes}` : ""}

If you believe this was in error or have additional information, please submit a new request.

https://safebatch.io/labs
`;

    await client.send({
      from: smtpUser,
      to: userEmail,
      subject: subject,
      content: textBody,
      html: htmlBody,
    });

    await client.close();
    console.log("Email sent successfully to", userEmail);

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error in send-lab-request-status:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
