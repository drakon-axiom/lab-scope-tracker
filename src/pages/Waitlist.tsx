import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Loader2, CheckCircle, Users, Clock, Shield } from "lucide-react";

export default function Waitlist() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    full_name: "",
    reason: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from("waitlist")
        .insert([formData]);

      if (error) {
        if (error.code === "23505") {
          toast.error("This email is already on the waitlist");
        } else {
          throw error;
        }
      } else {
        // Send confirmation email (don't fail if email fails)
        try {
          await supabase.functions.invoke('send-waitlist-confirmation', {
            body: { email: formData.email, full_name: formData.full_name }
          });
        } catch (emailError) {
          console.error("Failed to send confirmation email:", emailError);
        }
        
        toast.success("You've been added to the waitlist! We'll notify you when a spot opens up.");
        setFormData({ email: "", full_name: "", reason: "" });
      }
    } catch (error) {
      console.error("Error joining waitlist:", error);
      toast.error("Failed to join waitlist. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="container max-w-4xl mx-auto px-4 py-12">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        {/* Header Section */}
        <div className="text-center mb-12 animate-fade-in">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />
              <img 
                src="/logo.png" 
                alt="SafeBatch" 
                className="relative h-20 w-20 drop-shadow-[0_0_20px_rgba(67,188,205,0.5)]"
              />
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Join the SafeBatch Beta
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Get early access to the future of laboratory testing management. We're opening spots to a limited number of beta testers.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card className="text-center hover:shadow-lg transition-shadow animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Free Beta Access</h3>
              <p className="text-sm text-muted-foreground">
                10 items/month free during beta, with promotional pricing at launch
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Clock className="h-6 w-6 text-accent" />
              </div>
              <h3 className="font-semibold mb-2">Priority Support</h3>
              <p className="text-sm text-muted-foreground">
                Direct access to our team as we refine the platform
              </p>
            </CardContent>
          </Card>

          <Card className="text-center hover:shadow-lg transition-shadow animate-fade-in" style={{ animationDelay: "0.3s" }}>
            <CardContent className="pt-6">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Shield className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Shape the Future</h3>
              <p className="text-sm text-muted-foreground">
                Your feedback directly influences feature development
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="shadow-xl border-2 animate-scale-in">
          <CardHeader className="space-y-1 bg-gradient-to-br from-primary/5 to-accent/5">
            <CardTitle className="text-2xl">Request Beta Access</CardTitle>
            <CardDescription>
              Fill out the form below and we'll review your application. Approved users receive an email invitation within 1-2 business days.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@company.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="reason">Tell us about your testing needs (Optional)</Label>
                <Textarea
                  id="reason"
                  placeholder="What compounds do you test? How many samples per month? What challenges are you facing with current workflow?"
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={5}
                  className="resize-none"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full h-12 text-base" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Join Waitlist
                  </>
                )}
              </Button>

              <p className="text-xs text-center text-muted-foreground mt-4">
                By joining the waitlist, you agree to receive updates about SafeBatch. 
                We'll never share your information with third parties.
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            Have questions?{" "}
            <Button
              variant="link"
              className="p-0 h-auto text-primary"
              onClick={() => navigate("/faq")}
            >
              Check out our FAQ
            </Button>
            {" "}or{" "}
            <a href="mailto:support@safebatch.com" className="text-primary hover:underline">
              contact us
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
