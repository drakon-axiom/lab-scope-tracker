-- Create backup codes table for 2FA recovery
CREATE TABLE public.mfa_backup_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  code_hash TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.mfa_backup_codes ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own backup codes"
ON public.mfa_backup_codes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own backup codes"
ON public.mfa_backup_codes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own backup codes"
ON public.mfa_backup_codes
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own backup codes"
ON public.mfa_backup_codes
FOR DELETE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_backup_codes_user_id ON public.mfa_backup_codes(user_id);
CREATE INDEX idx_backup_codes_hash ON public.mfa_backup_codes(code_hash) WHERE used_at IS NULL;