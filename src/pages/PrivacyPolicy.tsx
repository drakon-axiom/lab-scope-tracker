import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const PrivacyPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>

        <div className="flex items-center gap-3 mb-8">
          <img src="/logo.png" alt="SafeBatch" className="h-12 w-12" />
          <h1 className="text-4xl font-bold">Privacy Policy</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Last Updated: December 1, 2025</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="text-muted-foreground mb-4">
              SafeBatch is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Information We Collect</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <h3 className="font-semibold text-foreground">Personal Information</h3>
              <p>We collect information that you provide directly to us, including:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Account registration information (name, email address, password)</li>
                <li>Profile information and contact details</li>
                <li>Quote and testing submission details</li>
                <li>Payment information (stored securely by payment processors)</li>
                <li>Communications with us, including support requests</li>
              </ul>

              <h3 className="font-semibold text-foreground mt-4">Usage Information</h3>
              <p>We automatically collect information about your use of the Service:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Device information (IP address, browser type, operating system)</li>
                <li>Usage patterns and interactions with the Service</li>
                <li>Login history and security events</li>
                <li>Cookies and similar tracking technologies</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. How We Use Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>We use the information we collect to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Provide, maintain, and improve the Service</li>
                <li>Process and track testing submissions and quotes</li>
                <li>Communicate with you about your account and testing services</li>
                <li>Send automated notifications about quote status, payment reminders, and delivery updates</li>
                <li>Facilitate coordination with third-party testing laboratories</li>
                <li>Monitor and analyze usage patterns to improve user experience</li>
                <li>Detect, prevent, and address security issues and fraud</li>
                <li>Comply with legal obligations</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. Information Sharing and Disclosure</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>We may share your information in the following circumstances:</p>
              
              <h3 className="font-semibold text-foreground">With Third-Party Laboratories</h3>
              <p>
                We share necessary information with testing laboratories to process your testing requests, including compound details, 
                contact information, and shipping details.
              </p>

              <h3 className="font-semibold text-foreground mt-4">Service Providers</h3>
              <p>
                We work with third-party service providers who perform services on our behalf, such as email delivery, payment processing, 
                shipping coordination, and analytics. These providers have access only to information needed to perform their functions.
              </p>

              <h3 className="font-semibold text-foreground mt-4">Legal Requirements</h3>
              <p>
                We may disclose your information if required by law or in response to valid legal requests, such as subpoenas or court orders.
              </p>

              <h3 className="font-semibold text-foreground mt-4">Business Transfers</h3>
              <p>
                If SafeBatch is involved in a merger, acquisition, or sale of assets, your information may be transferred as part of that transaction.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Data Security</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, 
                alteration, disclosure, or destruction. These measures include:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Encryption of data in transit and at rest</li>
                <li>Regular security assessments and audits</li>
                <li>Access controls and authentication mechanisms</li>
                <li>Two-factor authentication (2FA) option for user accounts</li>
                <li>Admin login audit logging and security alerts</li>
              </ul>
              <p className="mt-4">
                However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your 
                information, we cannot guarantee absolute security.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Data Retention</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                We retain your information for as long as necessary to provide the Service, comply with legal obligations, resolve disputes, 
                and enforce our agreements. Testing records and quotes may be retained for extended periods for audit and compliance purposes.
              </p>
              <p>
                You may request deletion of your account and associated data by contacting us at privacy@safebatch.com.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Your Rights and Choices</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>You have the following rights regarding your personal information:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li><strong>Access:</strong> Request access to the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
                <li><strong>Export:</strong> Request a copy of your data in a portable format</li>
                <li><strong>Opt-out:</strong> Unsubscribe from marketing communications (account-related emails may still be sent)</li>
              </ul>
              <p className="mt-4">
                To exercise these rights, contact us at privacy@safebatch.com.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Cookies and Tracking Technologies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                We use cookies and similar tracking technologies to collect usage information and improve the Service. You can control cookies 
                through your browser settings, but disabling cookies may affect functionality.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Third-Party Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                The Service may contain links to third-party websites, including testing laboratory websites. We are not responsible for the 
                privacy practices of these third parties. We encourage you to review their privacy policies.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Children's Privacy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                SafeBatch is not intended for use by individuals under the age of 18. We do not knowingly collect personal information from 
                children under 18. If we learn that we have collected information from a child under 18, we will delete it promptly.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. International Data Transfers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Your information may be transferred to and processed in countries other than your country of residence. These countries may have 
                different data protection laws. By using the Service, you consent to the transfer of your information to these countries.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Changes to This Privacy Policy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy on this 
                page and updating the "Last Updated" date. Your continued use of the Service after changes constitutes acceptance of the updated policy.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Contact Us</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                If you have questions or concerns about this Privacy Policy or our data practices, please contact us at:
              </p>
              <p>
                <strong>SafeBatch</strong><br />
                Email: privacy@safebatch.com<br />
                Address: 1234 Lab Street, Suite 500, San Francisco, CA 94102<br />
                Phone: +1 (415) 555-0123
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicy;
