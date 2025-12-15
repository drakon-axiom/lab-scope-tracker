-- Add username column and remove full_name
ALTER TABLE public.profiles ADD COLUMN username text;

-- Drop the full_name column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS full_name;

-- Update the handle_new_user function to use username
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'username');
  RETURN NEW;
END;
$$;