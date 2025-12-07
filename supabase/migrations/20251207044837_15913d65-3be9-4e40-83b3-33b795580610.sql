-- Update quotes policies to allow admin access for impersonation

-- Drop existing lab-related policies
DROP POLICY IF EXISTS "Lab users can view quotes for their lab" ON public.quotes;
DROP POLICY IF EXISTS "Lab users can update quotes for their lab" ON public.quotes;

-- Recreate with admin access included
CREATE POLICY "Lab users can view quotes for their lab" 
ON public.quotes 
FOR SELECT 
USING (
  auth.uid() = user_id 
  OR EXISTS (
    SELECT 1 FROM lab_users 
    WHERE lab_users.user_id = auth.uid() 
    AND lab_users.lab_id = quotes.lab_id
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Lab users can update quotes for their lab" 
ON public.quotes 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM lab_users 
    WHERE lab_users.user_id = auth.uid() 
    AND lab_users.lab_id = quotes.lab_id 
    AND lab_users.is_active = true
  )
  OR public.has_role(auth.uid(), 'admin')
);

-- Also update quote_activity_log for impersonation support
DROP POLICY IF EXISTS "Lab users can view activity for their quotes" ON public.quote_activity_log;
DROP POLICY IF EXISTS "Lab users can insert activity for their quotes" ON public.quote_activity_log;

CREATE POLICY "Lab users can view activity for their quotes"
ON public.quote_activity_log
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM quotes q
    JOIN lab_users lu ON lu.lab_id = q.lab_id
    WHERE q.id = quote_activity_log.quote_id
    AND lu.user_id = auth.uid()
    AND lu.is_active = true
  )
  OR public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Lab users can insert activity for their quotes"
ON public.quote_activity_log
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM quotes q
    JOIN lab_users lu ON lu.lab_id = q.lab_id
    WHERE q.id = quote_activity_log.quote_id
    AND lu.user_id = auth.uid()
    AND lu.is_active = true
  )
  OR public.has_role(auth.uid(), 'admin')
);