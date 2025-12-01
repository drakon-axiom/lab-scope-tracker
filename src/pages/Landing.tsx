import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Beaker, Shield, Clock, Award, Mail, MapPin, Phone, FileText, CheckCircle, CreditCard, Package, Activity, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { SectionNav } from "@/components/SectionNav";

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SectionNav />
      {/* Header/Hero Section */}
      <header className="relative overflow-hidden border-b bg-gradient-to-br from-primary/5 via-background to-accent/5">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="flex flex-col items-center text-center space-y-8">
            <div className="flex items-center gap-3 mb-4">
              <img src="/logo.png" alt="Logo" className="h-16 w-16" />
              <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-primary via-primary to-accent bg-clip-text text-transparent">
                Test Submission & Tracking Platform
              </h1>
            </div>
            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl">
              Streamline your testing workflow. Submit compounds to certified labs, track progress, and manage results—all in one place. 
              Perfect for businesses and researchers who need testing guidance or handle high volumes.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 mt-8">
              <Button size="lg" onClick={() => navigate("/waitlist")} className="text-lg px-8">
                Join Waitlist
              </Button>
              <Button size="lg" variant="outline" onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })} className="text-lg px-8">
                Contact Us
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Services Section */}
      <section id="services" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">Platform Features</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Everything You Need to Manage Lab Testing</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Submit compounds to certified third-party labs and track every step of the process
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Beaker className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Multi-Lab Submission</CardTitle>
                <CardDescription>
                  Submit compounds to certified third-party labs including peptides, SARMs, AAS, and small molecules
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Quote Management</CardTitle>
                <CardDescription>
                  Generate quotes, communicate with labs, and manage approvals all from one centralized platform
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Real-Time Tracking</CardTitle>
                <CardDescription>
                  Track shipments, testing progress, and delivery status with automated updates—no more email hunting
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Award className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Vendor Coordination</CardTitle>
                <CardDescription>
                  Seamlessly coordinate with multiple certified lab partners for pricing, scheduling, and results delivery
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Automated Notifications</CardTitle>
                <CardDescription>
                  Receive email alerts for payment reminders, delivery confirmations, and test completion updates
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary/50 transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-accent" />
                </div>
                <CardTitle>Complete Audit Trail</CardTitle>
                <CardDescription>
                  Full activity logs and email history ensure compliance and visibility for high-volume testing workflows
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">How It Works</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple 6-Step Process</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From quote creation to final results, we handle the complexity so you can focus on what matters
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Step 1 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center relative">
                  <FileText className="h-8 w-8 text-primary" />
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    1
                  </div>
                </div>
                <h3 className="text-xl font-semibold">Create Quote</h3>
                <p className="text-muted-foreground">
                  Select your compounds, choose a certified lab, and generate a testing quote with detailed specifications
                </p>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center relative">
                  <CheckCircle className="h-8 w-8 text-accent" />
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">
                    2
                  </div>
                </div>
                <h3 className="text-xl font-semibold">Lab Approval</h3>
                <p className="text-muted-foreground">
                  Lab reviews your quote, verifies pricing, and approves—you'll receive automated notifications throughout
                </p>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center relative">
                  <CreditCard className="h-8 w-8 text-primary" />
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    3
                  </div>
                </div>
                <h3 className="text-xl font-semibold">Make Payment</h3>
                <p className="text-muted-foreground">
                  Submit payment to the lab and track payment status—labs receive automatic confirmation notifications
                </p>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center relative">
                  <Package className="h-8 w-8 text-accent" />
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">
                    4
                  </div>
                </div>
                <h3 className="text-xl font-semibold">Ship Samples</h3>
                <p className="text-muted-foreground">
                  Generate shipping labels or add tracking manually—automated UPS tracking keeps you updated in real-time
                </p>
              </div>
            </div>

            {/* Step 5 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center relative">
                  <Activity className="h-8 w-8 text-primary" />
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                    5
                  </div>
                </div>
                <h3 className="text-xl font-semibold">Track Progress</h3>
                <p className="text-muted-foreground">
                  Monitor testing progress from delivery to completion with status updates and activity logs
                </p>
              </div>
            </div>

            {/* Step 6 */}
            <div className="relative">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="h-16 w-16 rounded-full bg-accent/10 flex items-center justify-center relative">
                  <Download className="h-8 w-8 text-accent" />
                  <div className="absolute -top-2 -right-2 h-8 w-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-sm font-bold">
                    6
                  </div>
                </div>
                <h3 className="text-xl font-semibold">Receive Results</h3>
                <p className="text-muted-foreground">
                  Access lab reports, download PDFs, and maintain complete testing records—all in one organized platform
                </p>
              </div>
            </div>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
              Start Your First Quote
            </Button>
          </div>
        </div>
      </section>

      {/* About Us Section */}
      <section id="about" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4" variant="secondary">About Us</Badge>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Your Testing Management Partner</h2>
              <div className="space-y-4 text-lg text-muted-foreground">
                <p>
                  We're a software platform that simplifies how you submit compounds to third-party testing labs 
                  and track results. Whether you need guidance on testing processes or handle high volumes, 
                  our platform replaces chaotic email threads with organized workflows.
                </p>
                <p>
                  Our platform connects you with certified laboratory partners worldwide, managing the entire 
                  process—from quote generation to final report delivery. You get one central place to coordinate 
                  with multiple labs, track shipments, and manage testing progress.
                </p>
                <p>
                  Stop juggling emails and spreadsheets. Our automated system handles quote approvals, payment 
                  tracking, shipping coordination, and result notifications—giving you complete visibility and 
                  control throughout the testing lifecycle.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-6">
              <Card className="text-center p-6">
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-primary mb-2">99%</div>
                  <div className="text-sm text-muted-foreground">Customer Satisfaction</div>
                </CardContent>
              </Card>
              <Card className="text-center p-6">
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-accent mb-2">24/7</div>
                  <div className="text-sm text-muted-foreground">Order Tracking</div>
                </CardContent>
              </Card>
              <Card className="text-center p-6">
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-primary mb-2">50+</div>
                  <div className="text-sm text-muted-foreground">Compound Types</div>
                </CardContent>
              </Card>
              <Card className="text-center p-6">
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-accent mb-2">Fast</div>
                  <div className="text-sm text-muted-foreground">Turnaround Time</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="py-16 md:py-24 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">Contact Us</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Get Started</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Ready to streamline your lab testing workflow? Create an account or reach out for questions
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Mail className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Email</CardTitle>
                <CardDescription className="mt-2">
                  support@safebatch.com
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Phone className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="text-lg">Phone</CardTitle>
                <CardDescription className="mt-2">
                  +1 (415) 555-0123
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MapPin className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">Location</CardTitle>
                <CardDescription className="mt-2">
                  1234 Lab Street, Suite 500<br />
                  San Francisco, CA 94102
                </CardDescription>
              </CardHeader>
            </Card>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" onClick={() => navigate("/auth")} className="text-lg px-8">
              Create an Account
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; 2025 SafeBatch. All rights reserved.</p>
            <div className="flex gap-6">
              <Button
                variant="link"
                className="text-muted-foreground p-0 h-auto"
                onClick={() => navigate("/terms")}
              >
                Terms of Service
              </Button>
              <Button
                variant="link"
                className="text-muted-foreground p-0 h-auto"
                onClick={() => navigate("/privacy")}
              >
                Privacy Policy
              </Button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;