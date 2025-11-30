-- Allow users to view email history for their own quotes
CREATE POLICY "Users can view their own quote email history"
ON public.email_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.id = email_history.quote_id
    AND quotes.user_id = auth.uid()
  )
);