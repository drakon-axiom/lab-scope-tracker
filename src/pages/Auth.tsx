import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Shield } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Auth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [challengeId, setChallengeId] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/");
      }
    };
    checkUser();
  }, [navigate]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/`
      }
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Sign up failed",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
    } else {
      toast({
        title: "Account created!",
        description: "You can now sign in with your credentials.",
        duration: 3000,
      });
      setEmail("");
      setPassword("");
      setFullName("");
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      toast({
        title: "Sign in failed",
        description: error.message,
        variant: "destructive",
        duration: 4000,
      });
      return;
    }

    // Check if MFA is required for this user
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasMfaEnabled = factors?.totp?.some(f => f.status === "verified");
    
    // If user has MFA enabled, check if they need to verify
    if (hasMfaEnabled) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
        // User needs to complete MFA challenge
        const factor = factors?.totp?.find(f => f.status === "verified");
        if (factor) {
          try {
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
              factorId: factor.id,
            });
            
            if (challengeError) throw challengeError;
            
            setChallengeId(challengeData.id);
            setShowMfaChallenge(true);
            return;
          } catch (error) {
            console.error("MFA challenge error:", error);
            toast({
              title: "Error",
              description: "Failed to initiate 2FA verification",
              variant: "destructive",
              duration: 4000,
            });
          }
        }
      }
    }
    
    navigate("/");
  };

  const handleVerifyMfa = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: challengeId,
        challengeId: challengeId,
        code: mfaCode,
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Successfully authenticated with 2FA",
        duration: 3000,
      });

      navigate("/");
    } catch (error) {
      toast({
        title: "Verification failed",
        description: "Invalid code. Please try again.",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setLoading(false);
      setMfaCode("");
    }
  };

  if (showMfaChallenge) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
            </div>
            <CardDescription>Enter the code from your authenticator app</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <Shield className="h-4 w-4" />
              <AlertDescription>
                Your account has 2FA enabled. Please enter your verification code to continue.
              </AlertDescription>
            </Alert>
            
            <form onSubmit={handleVerifyMfa} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfa-code">Verification Code</Label>
                <Input
                  id="mfa-code"
                  type="text"
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ""))}
                  maxLength={6}
                  required
                  className="text-center text-2xl tracking-widest"
                  autoFocus
                />
              </div>
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowMfaChallenge(false);
                    setMfaCode("");
                    setChallengeId("");
                  }}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading || mfaCode.length !== 6}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Testing Tracker</CardTitle>
          <CardDescription>Sign in to manage your product testing</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="signin">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="signin">
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signin-email">Email</Label>
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signin-password">Password</Label>
                  <Input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign In
                </Button>
              </form>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Sign Up
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default Auth;
