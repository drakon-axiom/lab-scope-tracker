-- Create tracking history table
CREATE TABLE tracking_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  status text NOT NULL,
  tracking_number text NOT NULL,
  changed_at timestamp with time zone NOT NULL DEFAULT now(),
  source text NOT NULL DEFAULT 'manual', -- 'manual', 'automatic', 'api'
  details jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create index for better query performance
CREATE INDEX idx_tracking_history_quote_id ON tracking_history(quote_id);
CREATE INDEX idx_tracking_history_changed_at ON tracking_history(changed_at DESC);

-- Enable RLS
ALTER TABLE tracking_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view tracking history for their quotes"
  ON tracking_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM quotes 
      WHERE quotes.id = tracking_history.quote_id 
      AND quotes.user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can insert tracking history"
  ON tracking_history
  FOR INSERT
  WITH CHECK (true);

-- Add comment
COMMENT ON TABLE tracking_history IS 'Tracks all status changes for quotes with tracking numbers';