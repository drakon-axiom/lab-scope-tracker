import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Lock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const AdminAuth = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showMfaChallenge, setShowMfaChallenge] = useState(false);
  const [mfaCode, setMfaCode] = useState("");
  const [challengeId, setChallengeId] = useState("");

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkUser();
  }, [navigate]);

  const logAdminLoginAttempt = async (email: string, success: boolean, userId?: string, errorMessage?: string) => {
    try {
      const { data, error: logError } = await supabase.functions.invoke("log-admin-login", {
        body: {
          email,
          success,
          userId,
          errorMessage,
          userAgent: navigator.userAgent,
        },
      });

      if (data?.locked) {
        throw new Error(`Account temporarily locked. Please try again in ${data?.lockoutMinutes || 30} minutes.`);
      }

      if (logError) {
        console.error("Failed to log admin login attempt:", logError);
      }

      return data;
    } catch (err: any) {
      console.error("Failed to log admin login attempt:", err);
      return { error: true };
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      const logData = await logAdminLoginAttempt(email, false, undefined, error.message);
      
      setLoading(false);
      
      if (logData?.locked) {
        toast({
          title: "Account Locked",
          description: `Account temporarily locked. Please try again in ${logData?.lockoutMinutes || 30} minutes.`,
          variant: "destructive",
          duration: 6000,
        });
      } else {
        const attemptsMsg = logData?.attemptsRemaining !== undefined 
          ? ` (${logData.attemptsRemaining} attempts remaining)` 
          : '';
        
        toast({
          title: "Sign in failed",
          description: error.message + attemptsMsg,
          variant: "destructive",
          duration: 4000,
        });
      }
      
      return;
    }

    // Check if user has admin role
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id)
      .single();

    if (roleData?.role !== "admin") {
      await logAdminLoginAttempt(email, false, data.user.id, "User is not an admin");
      await supabase.auth.signOut();
      
      setLoading(false);
      toast({
        title: "Access Denied",
        description: "You do not have administrator privileges. Please use the regular sign-in portal.",
        variant: "destructive",
        duration: 5000,
      });
      return;
    }

    await logAdminLoginAttempt(email, true, data.user.id);
    setLoading(false);

    // Check if MFA is required
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const hasMfaEnabled = factors?.totp?.some(f => f.status === "verified");
    
    if (hasMfaEnabled) {
      const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      
      if (aal?.currentLevel === "aal1" && aal?.nextLevel === "aal2") {
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
    
    navigate("/dashboard");
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

      navigate("/dashboard");
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
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
        <Card className="w-full max-w-md border-primary/20 shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-center gap-3 mb-2">
              <img src="/logo.png" alt="SafeBatch" className="h-16 w-16" />
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <div className="flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Two-Factor Authentication</CardTitle>
            </div>
            <CardDescription>Enter the code from your authenticator app</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4 border-primary/20 bg-primary/5">
              <Shield className="h-4 w-4 text-primary" />
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
      <Card className="w-full max-w-md border-primary/20 shadow-lg">
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <img src="/logo.png" alt="SafeBatch" className="h-20 w-20" />
            <div className="flex items-center gap-2 text-primary">
              <Shield className="h-8 w-8" />
              <Lock className="h-6 w-6" />
            </div>
          </div>
          <CardTitle className="text-2xl text-center">Admin Portal</CardTitle>
          <CardDescription className="text-center">
            Restricted access for administrators only
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6 border-primary/20 bg-primary/5">
            <Shield className="h-4 w-4 text-primary" />
            <AlertDescription>
              This portal is for authorized administrators. Unauthorized access attempts are logged.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSignIn} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="signin-email">Email</Label>
              <Input
                id="signin-email"
                type="email"
                placeholder="admin@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
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
                autoComplete="current-password"
              />
            </div>
            
            <Button 
              type="submit" 
              className="w-full" 
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <Shield className="mr-2 h-4 w-4" />
              Sign In as Admin
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAuth;