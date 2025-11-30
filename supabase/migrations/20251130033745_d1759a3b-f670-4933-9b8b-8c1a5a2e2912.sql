-- Create quote activity log table to track all quote events
CREATE TABLE IF NOT EXISTS public.quote_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  activity_type TEXT NOT NULL,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster queries
CREATE INDEX idx_quote_activity_log_quote_id ON public.quote_activity_log(quote_id);
CREATE INDEX idx_quote_activity_log_created_at ON public.quote_activity_log(created_at DESC);

-- Enable RLS
ALTER TABLE public.quote_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can view activity logs for their own quotes
CREATE POLICY "Users can view activity logs for their quotes"
  ON public.quote_activity_log
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes
      WHERE quotes.id = quote_activity_log.quote_id
      AND quotes.user_id = auth.uid()
    )
  );

-- Service role and authenticated users can insert activity logs
CREATE POLICY "Authenticated users can insert activity logs"
  ON public.quote_activity_log
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR auth.uid() IS NOT NULL);

-- Create a function to automatically log quote status changes
CREATE OR REPLACE FUNCTION public.log_quote_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only log if status actually changed
  IF (TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status) THEN
    INSERT INTO public.quote_activity_log (
      quote_id,
      user_id,
      activity_type,
      description,
      metadata
    ) VALUES (
      NEW.id,
      auth.uid(),
      'status_change',
      'Quote status changed from "' || COALESCE(OLD.status, 'unknown') || '" to "' || NEW.status || '"',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for automatic status change logging
DROP TRIGGER IF EXISTS trigger_log_quote_status_change ON public.quotes;
CREATE TRIGGER trigger_log_quote_status_change
  AFTER UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.log_quote_status_change();