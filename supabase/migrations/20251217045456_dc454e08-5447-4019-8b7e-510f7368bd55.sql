-- Add columns to store original additional sample and header prices per item
ALTER TABLE public.quote_items 
ADD COLUMN additional_sample_price numeric DEFAULT 60,
ADD COLUMN additional_header_price numeric DEFAULT 30;