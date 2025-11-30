-- Create admin login audit log table
CREATE TABLE public.admin_login_audit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID,
  email TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  error_message TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.admin_login_audit ENABLE ROW LEVEL SECURITY;

-- Only admins can view audit logs
CREATE POLICY "Admins can view all audit logs"
ON public.admin_login_audit
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'));

-- Anyone authenticated can insert (for logging)
CREATE POLICY "System can insert audit logs"
ON public.admin_login_audit
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create index for efficient queries
CREATE INDEX idx_admin_login_audit_created_at ON public.admin_login_audit(created_at DESC);
CREATE INDEX idx_admin_login_audit_user_id ON public.admin_login_audit(user_id);