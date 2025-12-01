-- Add onboarding_completed field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE;

-- Add onboarding_step field to track progress
ALTER TABLE public.profiles 
ADD COLUMN onboarding_step INTEGER DEFAULT 0;

COMMENT ON COLUMN public.profiles.onboarding_completed IS 'Tracks whether user has completed the initial onboarding tutorial';
COMMENT ON COLUMN public.profiles.onboarding_step IS 'Tracks current step in onboarding process (0 = not started)';