import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const TermsOfService = () => {
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
          <h1 className="text-4xl font-bold">Terms of Service</h1>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Last Updated: December 1, 2025</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-sm max-w-none">
            <p className="text-muted-foreground mb-4">
              Please read these Terms of Service carefully before using SafeBatch.
            </p>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Acceptance of Terms</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                By accessing and using SafeBatch ("the Service"), you accept and agree to be bound by the terms and provisions of this agreement. 
                If you do not agree to these terms, please do not use the Service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Description of Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                SafeBatch is a software platform that facilitates the submission of compounds to third-party testing laboratories and tracks testing progress. 
                SafeBatch does not conduct testing services directly and is not responsible for the testing services provided by third-party laboratories.
              </p>
              <p>
                We act solely as an intermediary platform connecting users with certified laboratory partners. All testing services are performed by 
                independent third-party laboratories, and SafeBatch is not liable for the accuracy, timeliness, or quality of testing services provided.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>3. User Accounts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. 
                You agree to notify us immediately of any unauthorized use of your account.
              </p>
              <p>
                You must provide accurate, current, and complete information during registration and keep your account information updated.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>4. Beta Access and Waitlist</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                SafeBatch is currently in beta phase with limited access through a waitlist system. Beta users receive free access to the platform 
                subject to usage limits (10 items per month for free tier accounts).
              </p>
              <p>
                We reserve the right to modify usage limits, features, and pricing at any time as we transition from beta to full commercial release.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>5. Acceptable Use</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>You agree not to:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Use the Service for any illegal purpose or in violation of any local, state, national, or international law</li>
                <li>Submit compounds or materials that are illegal, hazardous, or prohibited by law</li>
                <li>Violate or infringe upon the rights of others, including intellectual property rights</li>
                <li>Transmit any viruses, malware, or other harmful code</li>
                <li>Attempt to gain unauthorized access to any portion of the Service</li>
                <li>Interfere with or disrupt the Service or servers connected to the Service</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>6. Laboratory Testing and Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                All testing services are provided by independent third-party laboratories. SafeBatch makes no warranties or representations regarding 
                the accuracy, reliability, or completeness of test results. Users should verify testing credentials and certifications of laboratories independently.
              </p>
              <p>
                SafeBatch is not responsible for any delays, errors, or quality issues in testing services provided by third-party laboratories.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>7. Payment and Fees</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Payment for testing services is made directly to the testing laboratories. SafeBatch may facilitate payment tracking and documentation 
                but does not process payments on behalf of laboratories.
              </p>
              <p>
                Future subscription fees for SafeBatch platform access will be communicated in advance. Beta users may receive promotional pricing or 
                free access during the beta period.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>8. Intellectual Property</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                The Service and its original content, features, and functionality are owned by SafeBatch and are protected by international copyright, 
                trademark, patent, trade secret, and other intellectual property laws.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>9. Limitation of Liability</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                SafeBatch and its affiliates, officers, employees, agents, partners, and licensors shall not be liable for any indirect, incidental, 
                special, consequential, or punitive damages resulting from your use of or inability to use the Service.
              </p>
              <p>
                In no event shall SafeBatch's total liability exceed the amount paid by you to SafeBatch in the twelve (12) months preceding the claim.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>10. Indemnification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                You agree to indemnify and hold harmless SafeBatch from any claims, damages, losses, liabilities, and expenses (including legal fees) 
                arising out of your use of the Service, violation of these Terms, or infringement of any rights of another party.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>11. Modifications to Service</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                SafeBatch reserves the right to modify or discontinue the Service at any time, with or without notice. We shall not be liable to you 
                or any third party for any modification, suspension, or discontinuation of the Service.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>12. Governing Law</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                These Terms shall be governed by and construed in accordance with the laws of the United States, without regard to its conflict of law provisions.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>13. Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                If you have any questions about these Terms, please contact us at:
              </p>
              <p>
                <strong>SafeBatch</strong><br />
                Email: legal@safebatch.com<br />
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

export default TermsOfService;
