-- Add email delivery tracking fields to email_history table
ALTER TABLE email_history 
ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'sent',
ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS bounce_reason TEXT,
ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS failure_reason TEXT;

-- Add index for delivery status queries
CREATE INDEX IF NOT EXISTS idx_email_history_delivery_status ON email_history(delivery_status);

-- Add comments for documentation
COMMENT ON COLUMN email_history.delivery_status IS 'Email delivery status: sent, delivered, opened, bounced, failed';
COMMENT ON COLUMN email_history.delivered_at IS 'Timestamp when email was delivered to recipient server';
COMMENT ON COLUMN email_history.opened_at IS 'Timestamp when email was first opened by recipient';
COMMENT ON COLUMN email_history.bounced_at IS 'Timestamp when email bounced';
COMMENT ON COLUMN email_history.bounce_reason IS 'Reason for email bounce';
COMMENT ON COLUMN email_history.clicked_at IS 'Timestamp when any link in email was clicked';
COMMENT ON COLUMN email_history.failed_at IS 'Timestamp when email sending failed';
COMMENT ON COLUMN email_history.failure_reason IS 'Reason for email sending failure';