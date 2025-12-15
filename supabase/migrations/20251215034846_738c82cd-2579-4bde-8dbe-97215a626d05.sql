-- Add policy for admins to update any lab
CREATE POLICY "Admins can update any lab"
ON public.labs
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add policy for admins to delete any lab
CREATE POLICY "Admins can delete any lab"
ON public.labs
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));