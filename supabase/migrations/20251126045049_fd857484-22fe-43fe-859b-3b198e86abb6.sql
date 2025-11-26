-- Add column to store additional report header details as JSON
ALTER TABLE public.quote_items 
ADD COLUMN additional_headers_data jsonb DEFAULT '[]'::jsonb;