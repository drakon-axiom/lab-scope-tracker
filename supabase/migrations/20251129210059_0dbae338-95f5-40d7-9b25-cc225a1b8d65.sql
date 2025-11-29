-- Remove the existing SELECT policy that allows users to view their own email history
-- This prevents all authenticated users from querying email_history directly
DROP POLICY IF EXISTS "Users can view own email history" ON public.email_history;

-- Add a comment explaining the security model
COMMENT ON TABLE public.email_history IS 'Email history is only accessible via edge functions using service_role. Direct user queries are blocked for security.';
