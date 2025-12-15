-- Remove accreditations column from labs table
ALTER TABLE public.labs DROP COLUMN IF EXISTS accreditations;