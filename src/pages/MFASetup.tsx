import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, Copy, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const MFASetup = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [qrCode, setQrCode] = useState<string>("");
  const [secret, setSecret] = useState<string>("");
  const [verifyCode, setVerifyCode] = useState("");
  const [step, setStep] = useState<"enroll" | "verify">("enroll");
  const [factorId, setFactorId] = useState<string>("");

  useEffect(() => {
    checkMFAStatus();
  }, []);

  const checkMFAStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
      return;
    }

    const { data: factors } = await supabase.auth.mfa.listFactors();
    if (factors?.totp && factors.totp.length > 0) {
      // User already has MFA enabled
      navigate("/dashboard");
    }
  };

  const enrollMFA = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Authenticator App",
      });

      if (error) throw error;

      if (data) {
        setQrCode(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
        setStep("verify");
      }
    } catch (error: any) {
      toast({
        title: "Enrollment failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyAndEnable = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.mfa.challengeAndVerify({
        factorId: factorId,
        code: verifyCode,
      });

      if (error) throw error;

      toast({
        title: "2FA Enabled!",
        description: "Two-factor authentication has been successfully enabled.",
      });
      
      navigate("/dashboard");
    } catch (error: any) {
      toast({
        title: "Verification failed",
        description: error.message || "Invalid code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    toast({
      title: "Copied!",
      description: "Secret key copied to clipboard",
    });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Set Up 2FA</CardTitle>
          </div>
          <CardDescription>
            Secure your account with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === "enroll" && (
            <>
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Two-factor authentication adds an extra layer of security to your account.
                  You'll need an authenticator app like Google Authenticator or Authy.
                </AlertDescription>
              </Alert>
              
              <Button
                onClick={enrollMFA}
                className="w-full"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Start Setup
              </Button>
            </>
          )}

          {step === "verify" && (
            <>
              <div className="space-y-4">
                <div className="text-sm text-muted-foreground">
                  <p className="font-semibold mb-2">Step 1: Scan QR Code</p>
                  <p>Open your authenticator app and scan this QR code:</p>
                </div>
                
                {qrCode && (
                  <div className="flex justify-center p-4 bg-white rounded-lg">
                    <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-muted-foreground">
                    Or enter this key manually:
                  </p>
                  <div className="flex gap-2">
                    <Input
                      value={secret}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copySecret}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Save your backup codes! You'll need them if you lose access to your authenticator app.
                  </AlertDescription>
                </Alert>
              </div>

              <form onSubmit={verifyAndEnable} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verify-code">
                    Step 2: Enter verification code from your app
                  </Label>
                  <Input
                    id="verify-code"
                    type="text"
                    placeholder="000000"
                    value={verifyCode}
                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ""))}
                    maxLength={6}
                    required
                    className="text-center text-2xl tracking-widest"
                  />
                </div>
                
                <Button
                  type="submit"
                  disabled={loading || verifyCode.length !== 6}
                  className="w-full"
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify & Enable 2FA
                </Button>
              </form>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default MFASetup;
