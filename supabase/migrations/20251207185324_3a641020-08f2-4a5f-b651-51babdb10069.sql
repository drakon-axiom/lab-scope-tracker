-- Add estimated_delivery column to quotes table
ALTER TABLE public.quotes 
ADD COLUMN estimated_delivery DATE;