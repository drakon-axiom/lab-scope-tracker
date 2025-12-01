import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Beaker, Shield, Clock, Award, Mail, MapPin, Phone, FileText, CheckCircle, CreditCard, Package, Activity, Download, ArrowUp } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { LandingHeader } from "@/components/LandingHeader";
import { ProductTourCarousel } from "@/components/ProductTourCarousel";
import heroBackground from "@/assets/hero-background.jpg";
import { motion } from "framer-motion";
import { useState, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const Landing = () => {
  const navigate = useNavigate();
  const [showBackToTop, setShowBackToTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > 400);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const headerOffset = 80; // Account for sticky header height
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      
      {/* Hero Section */}
      <section className="relative min-h-[500px] md:min-h-[600px] flex items-center overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: `url(${heroBackground})` }}
        >
          {/* Dark Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/80 to-black/60" />
        </div>
        
        {/* Content */}
        <div className="relative container mx-auto px-4 py-20 md:py-32 z-10">
          <div className="max-w-3xl">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <Badge variant="secondary" className="mb-6 bg-primary/10 text-primary border-primary/20">
                Welcome to SafeBatch
              </Badge>
            </motion.div>
            
            <motion.h1 
              className="text-4xl md:text-6xl lg:text-7xl font-bold mb-6 leading-tight text-white"
              style={{ textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)' }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              Test Submission & Tracking Platform
            </motion.h1>
            
            <motion.p 
              className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              Streamline your testing workflow. Submit compounds to certified labs, track progress, and manage results—all in one place. 
              Perfect for businesses and researchers who need testing guidance or handle high volumes.
            </motion.p>
            
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
              <Button size="lg" onClick={() => navigate("/waitlist")} className="text-lg px-8 shadow-lg">
                Join Waitlist
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => scrollToSection("contact")} 
                className="text-lg px-8 bg-background/50 backdrop-blur-sm hover:bg-background/80"
              >
                Contact Us
              </Button>
            </motion.div>
            
            {/* Trust Indicators */}
            <motion.div 
              className="flex flex-wrap items-center gap-6 text-sm"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm px-4 py-2 rounded-full">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">Certified Labs</span>
              </div>
              <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm px-4 py-2 rounded-full">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">Real-time Tracking</span>
              </div>
              <div className="flex items-center gap-2 bg-background/50 backdrop-blur-sm px-4 py-2 rounded-full">
                <CheckCircle className="h-5 w-5 text-primary" />
                <span className="font-medium">Automated Workflows</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section id="demo" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">Interactive Demo</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">See SafeBatch in Action</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Explore key features with our interactive tour. Navigate through different aspects of the platform to see how SafeBatch streamlines your testing workflow.
            </p>
          </div>
          
          <div className="max-w-5xl mx-auto">
            <ProductTourCarousel />
          </div>
        </div>
      </section>

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

      {/* FAQ Section */}
      <section id="faq" className="py-16 md:py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="mb-4" variant="secondary">FAQ</Badge>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Frequently Asked Questions</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Find answers to common questions about SafeBatch and our testing workflow
            </p>
          </div>

          <div className="max-w-3xl mx-auto">
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger className="text-left">
                  What types of compounds can I submit for testing?
                </AccordionTrigger>
                <AccordionContent>
                  SafeBatch supports testing for a wide range of compounds including peptides, SARMs, AAS (anabolic-androgenic steroids), small molecules, and more. We work with certified labs that specialize in different compound categories to ensure accurate testing results.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-2">
                <AccordionTrigger className="text-left">
                  How long does the testing process take?
                </AccordionTrigger>
                <AccordionContent>
                  Testing turnaround times vary by compound type and lab partner, typically ranging from 7-21 days after the lab receives your samples. You can track progress in real-time through the SafeBatch platform, from shipment to final results delivery.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-3">
                <AccordionTrigger className="text-left">
                  What labs do you work with?
                </AccordionTrigger>
                <AccordionContent>
                  We partner with certified third-party testing laboratories that have proven track records in analytical chemistry. Our platform allows you to choose from multiple lab options based on your specific testing needs, pricing preferences, and turnaround time requirements.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-4">
                <AccordionTrigger className="text-left">
                  How does pricing work?
                </AccordionTrigger>
                <AccordionContent>
                  Pricing varies by compound type, testing method, and lab partner. When you create a quote, you'll see transparent pricing for each test. We're currently in beta offering free access with a monthly usage limit of 10 items. Paid plans with higher limits will be available soon.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-5">
                <AccordionTrigger className="text-left">
                  Is SafeBatch only for high-volume testing?
                </AccordionTrigger>
                <AccordionContent>
                  No! SafeBatch is designed for both occasional users who need guidance on testing processes and high-volume users who want centralized workflow management. Whether you're sending one sample or managing dozens of tests, our platform simplifies the entire process.
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="item-6">
                <AccordionTrigger className="text-left">
                  How do I get started?
                </AccordionTrigger>
                <AccordionContent>
                  Join our waitlist to get beta access. Once approved, you'll receive an invitation to create your account. From there, you can immediately start creating quotes, selecting compounds, and coordinating with our lab partners through the platform.
                </AccordionContent>
              </AccordionItem>
            </Accordion>
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
              <Button
                variant="link"
                className="text-muted-foreground p-0 h-auto"
                onClick={() => navigate("/faq")}
              >
                FAQ
              </Button>
            </div>
          </div>
        </div>
      </footer>

      {/* Back to Top Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: showBackToTop ? 1 : 0, scale: showBackToTop ? 1 : 0 }}
        transition={{ duration: 0.2 }}
        className="fixed bottom-8 right-8 z-50"
      >
        <Button
          onClick={scrollToTop}
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          aria-label="Back to top"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      </motion.div>
    </div>
  );
};

export default Landing;