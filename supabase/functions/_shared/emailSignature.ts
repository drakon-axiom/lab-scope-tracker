/**
 * SafeBatch Email Signature Template
 * Reusable branded footer for all outgoing emails
 */

export const getEmailSignature = (): string => {
  return `
    <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e7eb;" />
    <table style="width: 100%; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #6b7280; font-size: 13px;">
      <tr>
        <td style="padding: 20px 0;">
          <table>
            <tr>
              <td style="padding-right: 15px; vertical-align: top;">
                <img src="https://obbvohtcglpfnqbthnga.supabase.co/storage/v1/object/public/lab-reports/logo.png" 
                     alt="SafeBatch" 
                     style="width: 48px; height: 48px; border-radius: 8px;" />
              </td>
              <td style="vertical-align: top;">
                <div style="font-weight: 600; color: #111827; font-size: 14px; margin-bottom: 4px;">SafeBatch</div>
                <div style="margin-bottom: 8px; color: #6b7280;">Laboratory Testing Management Platform</div>
                <div style="color: #6b7280; line-height: 1.6;">
                  <div>📧 <a href="mailto:support@safebatch.com" style="color: #43bccd; text-decoration: none;">support@safebatch.com</a></div>
                  <div>📞 +1 (415) 555-0123</div>
                  <div>📍 1234 Lab Street, Suite 500, San Francisco, CA 94102</div>
                </div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding-top: 15px; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; font-size: 11px; color: #9ca3af; line-height: 1.6;">
            This email was sent by SafeBatch. If you have questions or need assistance, please contact us at support@safebatch.com.
            <br />
            <a href="https://safebatch.com/terms" style="color: #43bccd; text-decoration: none; margin-right: 12px;">Terms of Service</a>
            <a href="https://safebatch.com/privacy" style="color: #43bccd; text-decoration: none;">Privacy Policy</a>
          </p>
        </td>
      </tr>
    </table>
  `;
};

/**
 * Plain text version of the email signature for text-only emails
 */
export const getEmailSignaturePlainText = (): string => {
  return `
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

SafeBatch
Laboratory Testing Management Platform

📧 support@safebatch.com
📞 +1 (415) 555-0123
📍 1234 Lab Street, Suite 500, San Francisco, CA 94102

This email was sent by SafeBatch. If you have questions or need assistance, 
please contact us at support@safebatch.com.

Terms of Service: https://safebatch.com/terms
Privacy Policy: https://safebatch.com/privacy
`;
};
