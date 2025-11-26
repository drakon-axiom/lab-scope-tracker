-- Add additional samples and report headers fields to quote_items table
ALTER TABLE public.quote_items 
ADD COLUMN additional_samples integer DEFAULT 0,
ADD COLUMN additional_report_headers integer DEFAULT 0;