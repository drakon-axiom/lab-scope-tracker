import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";
import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Shield, Mail, Clock, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface SecuritySetting {
  id: string;
  setting_key: string;
  setting_value: any; // Can be parsed from Json
  description: string | null;
}

const SecuritySettings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [maxAttempts, setMaxAttempts] = useState(5);
  const [lockoutDuration, setLockoutDuration] = useState(30);
  const [alertEnabled, setAlertEnabled] = useState(true);
  const [alertRecipients, setAlertRecipients] = useState<string[]>([]);
  const [newRecipient, setNewRecipient] = useState("");

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
    }
  }, [isAdmin, roleLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchSettings();
    }
  }, [isAdmin]);

  const fetchSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("security_settings")
        .select("*");

      if (error) throw error;

      const settings = data as SecuritySetting[];
      
      settings.forEach((setting) => {
        switch (setting.setting_key) {
          case "max_login_attempts":
            setMaxAttempts(setting.setting_value.value);
            break;
          case "lockout_duration_minutes":
            setLockoutDuration(setting.setting_value.value);
            break;
          case "alert_email_enabled":
            setAlertEnabled(setting.setting_value.value);
            break;
          case "alert_email_recipients":
            setAlertRecipients(setting.setting_value.value || []);
            break;
        }
      });
    } catch (error: any) {
      console.error("Error fetching settings:", error);
      toast({
        title: "Error",
        description: "Failed to load security settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: any) => {
    const { error } = await supabase
      .from("security_settings")
      .update({
        setting_value: { value },
        updated_at: new Date().toISOString(),
      })
      .eq("setting_key", key);

    if (error) throw error;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateSetting("max_login_attempts", maxAttempts);
      await updateSetting("lockout_duration_minutes", lockoutDuration);
      await updateSetting("alert_email_enabled", alertEnabled);
      await updateSetting("alert_email_recipients", alertRecipients);

      toast({
        title: "Settings saved",
        description: "Security settings have been updated successfully",
      });
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast({
        title: "Error",
        description: "Failed to save security settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const addRecipient = () => {
    const email = newRecipient.trim();
    if (!email) return;

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast({
        title: "Invalid email",
        description: "Please enter a valid email address",
        variant: "destructive",
      });
      return;
    }

    if (alertRecipients.includes(email)) {
      toast({
        title: "Duplicate email",
        description: "This email is already in the recipients list",
        variant: "destructive",
      });
      return;
    }

    setAlertRecipients([...alertRecipients, email]);
    setNewRecipient("");
  };

  const removeRecipient = (email: string) => {
    setAlertRecipients(alertRecipients.filter((r) => r !== email));
  };

  if (roleLoading || loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <Layout>
      <div className="max-w-4xl">
        <div className="flex items-center gap-3 mb-6">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold">Security Settings</h1>
            <p className="text-muted-foreground">
              Configure admin portal security policies and alerts
            </p>
          </div>
        </div>

        <Alert className="mb-6 border-primary/20 bg-primary/5">
          <Shield className="h-4 w-4 text-primary" />
          <AlertDescription>
            These settings control security policies for the admin portal. Changes take effect immediately.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {/* Login Policies */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Login Policies
              </CardTitle>
              <CardDescription>
                Configure login attempt limits and lockout duration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="max-attempts">Maximum Login Attempts</Label>
                <Input
                  id="max-attempts"
                  type="number"
                  min="1"
                  max="20"
                  value={maxAttempts}
                  onChange={(e) => setMaxAttempts(parseInt(e.target.value) || 1)}
                  className="max-w-xs"
                />
                <p className="text-sm text-muted-foreground">
                  Number of failed login attempts before account lockout (1-20)
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="lockout-duration" className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Lockout Duration (minutes)
                </Label>
                <Input
                  id="lockout-duration"
                  type="number"
                  min="5"
                  max="1440"
                  value={lockoutDuration}
                  onChange={(e) => setLockoutDuration(parseInt(e.target.value) || 5)}
                  className="max-w-xs"
                />
                <p className="text-sm text-muted-foreground">
                  Duration in minutes for account lockout (5-1440)
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Email Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Alerts
              </CardTitle>
              <CardDescription>
                Configure email notifications for unauthorized login attempts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="alert-enabled">Enable Email Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Send email notifications for unauthorized admin portal access attempts
                  </p>
                </div>
                <Switch
                  id="alert-enabled"
                  checked={alertEnabled}
                  onCheckedChange={setAlertEnabled}
                />
              </div>

              <Separator />

              <div className="space-y-4">
                <div>
                  <Label>Alert Recipients</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Email addresses that will receive security alerts
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={newRecipient}
                    onChange={(e) => setNewRecipient(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addRecipient();
                      }
                    }}
                  />
                  <Button onClick={addRecipient} type="button">
                    Add
                  </Button>
                </div>

                {alertRecipients.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-4">
                    {alertRecipients.map((email) => (
                      <Badge
                        key={email}
                        variant="secondary"
                        className="flex items-center gap-2 px-3 py-1"
                      >
                        <Mail className="h-3 w-3" />
                        {email}
                        <button
                          onClick={() => removeRecipient(email)}
                          className="ml-1 hover:text-destructive"
                          aria-label="Remove recipient"
                        >
                          ×
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}

                {alertRecipients.length === 0 && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      No recipients configured. Add email addresses to receive security alerts.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="lg">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SecuritySettings;
