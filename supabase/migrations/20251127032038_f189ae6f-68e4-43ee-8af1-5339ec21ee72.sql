-- Add payment tracking fields to quotes table
ALTER TABLE quotes 
ADD COLUMN payment_status TEXT DEFAULT 'pending',
ADD COLUMN payment_amount_usd NUMERIC,
ADD COLUMN payment_amount_crypto TEXT,
ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN transaction_id TEXT;

-- Add report and testing fields to quote_items table
ALTER TABLE quote_items
ADD COLUMN status TEXT DEFAULT 'pending',
ADD COLUMN date_submitted DATE,
ADD COLUMN date_completed DATE,
ADD COLUMN test_results TEXT,
ADD COLUMN report_url TEXT,
ADD COLUMN report_file TEXT,
ADD COLUMN testing_notes TEXT;

-- Update existing quote statuses to match new workflow
-- (existing quotes will keep their current statuses, but we're preparing for new ones)

-- Add index for better performance on status queries
CREATE INDEX idx_quotes_status ON quotes(status);
CREATE INDEX idx_quote_items_status ON quote_items(status);