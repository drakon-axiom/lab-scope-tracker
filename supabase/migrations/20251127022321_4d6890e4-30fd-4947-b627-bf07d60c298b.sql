-- Add tracking_updated_at column to quotes table
ALTER TABLE quotes ADD COLUMN tracking_updated_at timestamp with time zone;

-- Create index for better query performance
CREATE INDEX idx_quotes_tracking_updated_at ON quotes(tracking_updated_at);

-- Add comment explaining the column
COMMENT ON COLUMN quotes.tracking_updated_at IS 'Timestamp of when the tracking information was last updated from UPS API';