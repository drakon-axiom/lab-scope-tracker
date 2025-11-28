-- Add lab_quote_number column to quotes table to distinguish between internal and vendor quote numbers
ALTER TABLE quotes 
ADD COLUMN lab_quote_number TEXT;