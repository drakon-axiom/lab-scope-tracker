-- Add discount fields to quotes table
ALTER TABLE quotes
ADD COLUMN discount_amount NUMERIC,
ADD COLUMN discount_type TEXT CHECK (discount_type IN ('percentage', 'fixed'));