-- Create security settings table for admin login policies
CREATE TABLE public.security_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
  description TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can view and manage security settings
CREATE POLICY "Admins can view security settings"
ON public.security_settings
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert security settings"
ON public.security_settings
FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update security settings"
ON public.security_settings
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Insert default security settings
INSERT INTO public.security_settings (setting_key, setting_value, description) VALUES
  ('max_login_attempts', '{"value": 5}'::jsonb, 'Maximum number of failed login attempts before lockout'),
  ('lockout_duration_minutes', '{"value": 30}'::jsonb, 'Duration in minutes for account lockout after max attempts'),
  ('alert_email_enabled', '{"value": true}'::jsonb, 'Enable email alerts for unauthorized admin login attempts'),
  ('alert_email_recipients', '{"value": []}'::jsonb, 'Email addresses to notify on unauthorized attempts');

-- Create trigger to update updated_at
CREATE TRIGGER update_security_settings_updated_at
BEFORE UPDATE ON public.security_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();