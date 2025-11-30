-- Update quote statuses: merge "paid" and "shipped" into "paid_awaiting_shipping"
-- This migration updates existing quotes and establishes the new workflow

-- Update existing quotes with "paid" status to "paid_awaiting_shipping"
UPDATE public.quotes
SET status = 'paid_awaiting_shipping'
WHERE status = 'paid';

-- Update existing quotes with "shipped" status to "in_transit" (since they're already shipped)
UPDATE public.quotes
SET status = 'in_transit'
WHERE status = 'shipped';

-- Update tracking history records
UPDATE public.tracking_history
SET status = 'paid_awaiting_shipping'
WHERE status = 'paid';

UPDATE public.tracking_history
SET status = 'in_transit'
WHERE status = 'shipped';

-- Update quote activity log records
UPDATE public.quote_activity_log
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{old_status}',
  '"paid_awaiting_shipping"'::jsonb
)
WHERE metadata->>'old_status' = 'paid';

UPDATE public.quote_activity_log
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{new_status}',
  '"paid_awaiting_shipping"'::jsonb
)
WHERE metadata->>'new_status' = 'paid';

UPDATE public.quote_activity_log
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{old_status}',
  '"in_transit"'::jsonb
)
WHERE metadata->>'old_status' = 'shipped';

UPDATE public.quote_activity_log
SET metadata = jsonb_set(
  COALESCE(metadata, '{}'::jsonb),
  '{new_status}',
  '"in_transit"'::jsonb
)
WHERE metadata->>'new_status' = 'shipped';