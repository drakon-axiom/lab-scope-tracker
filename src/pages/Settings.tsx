import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Shield, ShieldCheck, ShieldOff, Bell, Wallet, RefreshCw, Package } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PaymentMethodsManager } from "@/components/PaymentMethodsManager";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newPassword: z.string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const profileSchema = z.object({
  fullName: z.string().trim().max(100, "Name must be less than 100 characters"),
});

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [profileError, setProfileError] = useState("");
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [mfaSecret, setMfaSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [enrolling, setEnrolling] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [showDisableMfaDialog, setShowDisableMfaDialog] = useState(false);
  const [disableVerificationCode, setDisableVerificationCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [disabling, setDisabling] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [updatingTracking, setUpdatingTracking] = useState(false);
  const [lastTrackingRefresh, setLastTrackingRefresh] = useState<number | null>(null);
  const [timeUntilNextRefresh, setTimeUntilNextRefresh] = useState<string>("");

  useEffect(() => {
    loadProfile();
    checkMfaStatus();
  }, []);

  // Load last tracking refresh timestamp from localStorage
  useEffect(() => {
    const stored = localStorage.getItem('lastTrackingRefresh');
    if (stored) {
      setLastTrackingRefresh(parseInt(stored, 10));
    }
  }, []);

  // Update countdown timer every second
  useEffect(() => {
    if (!lastTrackingRefresh) {
      setTimeUntilNextRefresh("");
      return;
    }

    const updateCountdown = () => {
      const now = Date.now();
      const elapsed = now - lastTrackingRefresh;
      const sixtyMinutes = 60 * 60 * 1000;
      const remaining = sixtyMinutes - elapsed;

      if (remaining <= 0) {
        setTimeUntilNextRefresh("");
        return;
      }

      const minutes = Math.floor(remaining / 60000);
      const seconds = Math.floor((remaining % 60000) / 1000);
      setTimeUntilNextRefresh(`Next refresh available in ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, [lastTrackingRefresh]);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      setEmail(user.email || "");

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (profile) {
        setFullName(profile.full_name || "");
      }
    } catch (error) {
      console.error("Error loading profile:", error);
      toast({
        title: "Error",
        description: "Failed to load profile information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const checkMfaStatus = async () => {
    try {
      const { data, error } = await supabase.auth.mfa.listFactors();
      
      if (error) throw error;
      
      const activeFactor = data?.totp.find((factor) => factor.status === "verified");
      setMfaEnabled(!!activeFactor);
      
      if (activeFactor) {
        setFactorId(activeFactor.id);
      }
    } catch (error) {
      console.error("Error checking MFA status:", error);
    }
  };

  const handleEnableMfa = async () => {
    try {
      setEnrolling(true);
      
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
      });

      if (error) throw error;

      setQrCode(data.totp.qr_code);
      setMfaSecret(data.totp.secret);
      setFactorId(data.id);
      setShowMfaSetup(true);
    } catch (error) {
      console.error("Error enrolling MFA:", error);
      toast({
        title: "Error",
        description: "Failed to setup 2FA. Please try again.",
        variant: "destructive",
      });
    } finally {
      setEnrolling(false);
    }
  };

  const generateBackupCodes = () => {
    const codes: string[] = [];
    for (let i = 0; i < 10; i++) {
      const code = Array.from({ length: 8 }, () => 
        Math.random().toString(36).charAt(2).toUpperCase()
      ).join('');
      codes.push(code.slice(0, 4) + '-' + code.slice(4));
    }
    return codes;
  };

  const hashCode = async (code: string): Promise<string> => {
    const encoder = new TextEncoder();
    const data = encoder.encode(code);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  };

  const saveBackupCodes = async (codes: string[]) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const hashedCodes = await Promise.all(codes.map(code => hashCode(code)));
    
    const inserts = hashedCodes.map(hash => ({
      user_id: user.id,
      code_hash: hash,
    }));

    const { error } = await supabase
      .from('mfa_backup_codes')
      .insert(inserts);

    if (error) throw error;
  };

  const handleVerifyMfa = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code from your authenticator app",
        variant: "destructive",
      });
      return;
    }

    try {
      setVerifying(true);

      const { error } = await supabase.auth.mfa.challengeAndVerify({
        factorId,
        code: verificationCode,
      });

      if (error) throw error;

      // Generate and save backup codes
      const codes = generateBackupCodes();
      await saveBackupCodes(codes);
      setBackupCodes(codes);

      setMfaEnabled(true);
      setShowMfaSetup(false);
      setVerificationCode("");
      setShowBackupCodes(true);
      
      toast({
        title: "Success",
        description: "Two-factor authentication has been enabled",
      });
      
      await checkMfaStatus();
    } catch (error) {
      console.error("Error verifying MFA:", error);
      toast({
        title: "Error",
        description: "Invalid verification code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setVerifying(false);
    }
  };

  const handleDisableMfaRequest = async () => {
    if (!factorId) return;

    try {
      // Create MFA challenge to verify user has access to their device
      const { data, error } = await supabase.auth.mfa.challenge({ factorId });
      
      if (error) throw error;
      
      setChallengeId(data.id);
      setShowDisableMfaDialog(true);
    } catch (error) {
      console.error("Error creating MFA challenge:", error);
      toast({
        title: "Error",
        description: "Failed to initiate 2FA verification. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDisableMfaVerify = async () => {
    if (!disableVerificationCode || disableVerificationCode.length !== 6) {
      toast({
        title: "Invalid code",
        description: "Please enter a 6-digit code from your authenticator app",
        variant: "destructive",
      });
      return;
    }

    try {
      setDisabling(true);

      // Verify the challenge
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId,
        code: disableVerificationCode,
      });

      if (verifyError) throw verifyError;

      // Now we can unenroll
      const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId });

      if (unenrollError) throw unenrollError;

      setMfaEnabled(false);
      setFactorId("");
      setShowDisableMfaDialog(false);
      setDisableVerificationCode("");
      setChallengeId("");
      
      toast({
        title: "Success",
        description: "Two-factor authentication has been disabled",
      });

      await checkMfaStatus();
    } catch (error) {
      console.error("Error disabling MFA:", error);
      toast({
        title: "Error",
        description: "Invalid verification code or failed to disable 2FA. Please try again.",
        variant: "destructive",
      });
    } finally {
      setDisabling(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError("");
    
    try {
      // Validate input
      profileSchema.parse({ fullName });
      
      setSavingProfile(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        navigate("/auth");
        return;
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        setProfileError(error.errors[0].message);
      } else {
        console.error("Error updating profile:", error);
        toast({
          title: "Error",
          description: "Failed to update profile",
          variant: "destructive",
        });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordErrors({});
    
    try {
      // Validate passwords
      passwordSchema.parse({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      setChangingPassword(true);

      // Update password
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      // Clear form
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast({
        title: "Success",
        description: "Password changed successfully",
        duration: 3000,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setPasswordErrors(errors);
      } else {
        toast({
          title: "Error",
          description: "Failed to change password",
          variant: "destructive",
          duration: 4000,
        });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSendPaymentReminders = async () => {
    try {
      setSendingReminders(true);
      
      const { data, error } = await supabase.functions.invoke('send-payment-reminders', {
        body: {}
      });

      if (error) throw error;

      toast({
        title: "Payment Reminders Sent",
        description: `Successfully sent ${data.sent || 0} reminder(s). ${data.failed > 0 ? `${data.failed} failed.` : ''}`,
        duration: 4000,
      });
    } catch (error: any) {
      console.error('Error sending payment reminders:', error);
      toast({
        title: "Error",
        description: "Failed to send payment reminders",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setSendingReminders(false);
    }
  };

  const handleUpdateTracking = async () => {
    // Check if 60 minutes have passed since last manual refresh
    const now = Date.now();
    if (lastTrackingRefresh) {
      const elapsed = now - lastTrackingRefresh;
      const sixtyMinutes = 60 * 60 * 1000;
      if (elapsed < sixtyMinutes) {
        return; // Button should be disabled
      }
    }

    try {
      setUpdatingTracking(true);
      
      const { data, error } = await supabase.functions.invoke('update-ups-tracking', {
        body: {}
      });

      if (error) throw error;

      const results = data?.results || [];
      const updated = results.filter((r: any) => r.success && r.newStatus).length;
      const unchanged = results.filter((r: any) => r.success && !r.newStatus).length;
      const failed = results.filter((r: any) => !r.success).length;

      // Store the refresh timestamp
      localStorage.setItem('lastTrackingRefresh', now.toString());
      setLastTrackingRefresh(now);

      toast({
        title: "Tracking Updated",
        description: `Updated ${updated} quote(s), ${unchanged} unchanged. ${failed > 0 ? `${failed} failed.` : ''}`,
        duration: 4000,
      });
    } catch (error: any) {
      console.error('Error updating tracking:', error);
      toast({
        title: "Error",
        description: "Failed to update tracking information",
        variant: "destructive",
        duration: 4000,
      });
    } finally {
      setUpdatingTracking(false);
    }
  };

  const canRefreshTracking = () => {
    if (!lastTrackingRefresh) return true;
    const now = Date.now();
    const elapsed = now - lastTrackingRefresh;
    return elapsed >= 60 * 60 * 1000; // 60 minutes
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-2xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold">Settings</h1>

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-6 mt-6">
            <Card>
          <CardHeader>
            <CardTitle>Profile Information</CardTitle>
            <CardDescription>
              Manage your account details and preferences
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-sm text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    setProfileError("");
                  }}
                  placeholder="Enter your full name"
                />
                {profileError && (
                  <p className="text-sm text-destructive">{profileError}</p>
                )}
              </div>

              <div className="flex gap-4">
                <Button type="submit" disabled={savingProfile}>
                  {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/dashboard")}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your password to keep your account secure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    setPasswordErrors({});
                  }}
                  placeholder="Enter current password"
                />
                {passwordErrors.currentPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.currentPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => {
                    setNewPassword(e.target.value);
                    setPasswordErrors({});
                  }}
                  placeholder="Enter new password"
                />
                {passwordErrors.newPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.newPassword}</p>
                )}
                <p className="text-sm text-muted-foreground">
                  Must be at least 8 characters with uppercase, lowercase, and number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setPasswordErrors({});
                  }}
                  placeholder="Confirm new password"
                />
                {passwordErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{passwordErrors.confirmPassword}</p>
                )}
              </div>

              <Button type="submit" disabled={changingPassword}>
                {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Change Password
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              {mfaEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <Shield className="h-5 w-5 text-muted-foreground" />
              )}
              <div>
                <CardTitle>Two-Factor Authentication</CardTitle>
                <CardDescription>
                  {mfaEnabled 
                    ? "2FA is currently enabled for your account"
                    : "Add an extra layer of security to your account"}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {mfaEnabled ? (
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  Your account is protected with two-factor authentication.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert>
                <Shield className="h-4 w-4" />
                <AlertDescription>
                  Enable 2FA to secure your account with a second verification step during login.
                </AlertDescription>
              </Alert>
            )}

            {mfaEnabled ? (
              <Button 
                variant="destructive" 
                onClick={handleDisableMfaRequest}
              >
                <ShieldOff className="mr-2 h-4 w-4" />
                Disable 2FA
              </Button>
            ) : (
              <Button 
                onClick={handleEnableMfa}
                disabled={enrolling}
              >
                {enrolling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Shield className="mr-2 h-4 w-4" />
                Enable 2FA
              </Button>
             )}
          </CardContent>
        </Card>
          </TabsContent>

          <TabsContent value="payments" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  <CardTitle>Payment Methods</CardTitle>
                </div>
                <CardDescription>
                  Manage your saved payment options for faster checkout
                </CardDescription>
              </CardHeader>
              <CardContent>
                <PaymentMethodsManager />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  <CardTitle>Payment Reminders</CardTitle>
                </div>
                <CardDescription>
                  Send automated reminders for quotes pending payment
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertDescription>
                    The system automatically sends payment reminders daily at 9:00 AM for quotes that have been approved but pending payment for more than 3 days. You can also manually trigger reminders below.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Manually send reminders to all customers with approved quotes pending payment:
                  </p>
                  <Button 
                    onClick={handleSendPaymentReminders}
                    disabled={sendingReminders}
                  >
                    {sendingReminders && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Bell className="mr-2 h-4 w-4" />
                    Send Payment Reminders Now
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  <CardTitle>Tracking Updates</CardTitle>
                </div>
                <CardDescription>
                  Automatic UPS tracking updates for shipped quotes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <RefreshCw className="h-4 w-4" />
                  <AlertDescription>
                    The system automatically checks UPS tracking every hour for all shipped quotes and updates their status. You can also manually refresh tracking information below.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Manually update tracking information for all quotes with tracking numbers:
                  </p>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="inline-block">
                          <Button 
                            onClick={handleUpdateTracking}
                            disabled={updatingTracking || !canRefreshTracking()}
                          >
                            {updatingTracking && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Update Tracking Now
                          </Button>
                        </span>
                      </TooltipTrigger>
                      {!canRefreshTracking() && (
                        <TooltipContent>
                          <p>{timeUntilNextRefresh}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Dialog open={showMfaSetup} onOpenChange={setShowMfaSetup}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Setup Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              {qrCode && (
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                </div>
              )}

              <div className="space-y-2">
                <Label>Or enter this code manually:</Label>
                <Input
                  value={mfaSecret}
                  readOnly
                  className="font-mono text-sm"
                  onClick={(e) => e.currentTarget.select()}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="verificationCode">Enter 6-digit code from your app:</Label>
                <Input
                  id="verificationCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleVerifyMfa}
                  disabled={verifying || verificationCode.length !== 6}
                  className="flex-1"
                >
                  {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify and Enable
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowMfaSetup(false);
                    setVerificationCode("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showBackupCodes} onOpenChange={setShowBackupCodes}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Save Your Backup Codes</DialogTitle>
              <DialogDescription>
                Store these codes in a safe place. Each code can be used once to access your account if you lose your authenticator device.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Alert>
                <ShieldCheck className="h-4 w-4" />
                <AlertDescription>
                  These codes will only be shown once. Download or copy them now.
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded-lg font-mono text-sm">
                {backupCodes.map((code, index) => (
                  <div key={index} className="p-2 bg-background rounded">
                    {code}
                  </div>
                ))}
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    navigator.clipboard.writeText(backupCodes.join('\n'));
                    toast({
                      title: "Copied",
                      description: "Backup codes copied to clipboard",
                    });
                  }}
                >
                  Copy Codes
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const blob = new Blob([backupCodes.join('\n')], { type: 'text/plain' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = '2fa-backup-codes.txt';
                    a.click();
                    URL.revokeObjectURL(url);
                    toast({
                      title: "Downloaded",
                      description: "Backup codes saved to file",
                    });
                  }}
                >
                  Download
                </Button>
              </div>

              <Button
                onClick={() => {
                  setShowBackupCodes(false);
                  setBackupCodes([]);
                }}
                className="w-full"
              >
                I've Saved My Codes
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showDisableMfaDialog} onOpenChange={setShowDisableMfaDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Disable Two-Factor Authentication</DialogTitle>
              <DialogDescription>
                To disable 2FA, please verify your identity by entering the code from your authenticator app.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <Alert variant="destructive">
                <ShieldOff className="h-4 w-4" />
                <AlertDescription>
                  Disabling 2FA will make your account less secure. You can re-enable it at any time.
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="disableVerificationCode">Enter 6-digit code from your app:</Label>
                <Input
                  id="disableVerificationCode"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={disableVerificationCode}
                  onChange={(e) => setDisableVerificationCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="text-center text-lg tracking-widest"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleDisableMfaVerify}
                  disabled={disabling || disableVerificationCode.length !== 6}
                  className="flex-1"
                >
                  {disabling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verify and Disable 2FA
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDisableMfaDialog(false);
                    setDisableVerificationCode("");
                    setChallengeId("");
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
};

export default Settings;
