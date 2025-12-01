-- Add 'lab' role to app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'lab';

-- Create lab_users table to link auth users to labs
CREATE TABLE IF NOT EXISTS public.lab_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member', -- member, manager, admin
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  UNIQUE(user_id, lab_id)
);

-- Enable RLS on lab_users
ALTER TABLE public.lab_users ENABLE ROW LEVEL SECURITY;

-- Lab users can view their own lab membership
CREATE POLICY "Lab users can view own membership"
ON public.lab_users
FOR SELECT
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

-- Admins can manage lab users
CREATE POLICY "Admins can insert lab users"
ON public.lab_users
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update lab users"
ON public.lab_users
FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete lab users"
ON public.lab_users
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create pricing audit trail table
CREATE TABLE IF NOT EXISTS public.pricing_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  lab_id UUID NOT NULL REFERENCES public.labs(id) ON DELETE CASCADE,
  old_price NUMERIC,
  new_price NUMERIC NOT NULL,
  changed_by UUID NOT NULL REFERENCES auth.users(id),
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  change_reason TEXT,
  FOREIGN KEY (product_id, lab_id) REFERENCES public.product_vendor_pricing(product_id, lab_id)
);

-- Enable RLS on pricing_audit_log
ALTER TABLE public.pricing_audit_log ENABLE ROW LEVEL SECURITY;

-- Admins and lab users can view pricing audit logs for their lab
CREATE POLICY "View pricing audit logs"
ON public.pricing_audit_log
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.lab_users
    WHERE lab_users.user_id = auth.uid()
    AND lab_users.lab_id = pricing_audit_log.lab_id
  )
);

-- System can insert audit logs
CREATE POLICY "System can insert pricing audit logs"
ON public.pricing_audit_log
FOR INSERT
WITH CHECK (true);

-- Update product_vendor_pricing policies for lab users
CREATE POLICY "Lab users can view their lab's pricing"
ON public.product_vendor_pricing
FOR SELECT
USING (
  auth.uid() = user_id OR 
  has_role(auth.uid(), 'admin'::app_role) OR
  EXISTS (
    SELECT 1 FROM public.lab_users
    WHERE lab_users.user_id = auth.uid()
    AND lab_users.lab_id = product_vendor_pricing.lab_id
  )
);

CREATE POLICY "Lab users can update their lab's pricing"
ON public.product_vendor_pricing
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lab_users
    WHERE lab_users.user_id = auth.uid()
    AND lab_users.lab_id = product_vendor_pricing.lab_id
    AND lab_users.is_active = true
  )
);

-- Labs can view quotes sent to them
CREATE POLICY "Lab users can view quotes for their lab"
ON public.quotes
FOR SELECT
USING (
  auth.uid() = user_id OR
  EXISTS (
    SELECT 1 FROM public.lab_users
    WHERE lab_users.user_id = auth.uid()
    AND lab_users.lab_id = quotes.lab_id
  )
);

-- Labs can update quotes sent to them (for approval, rejection, etc.)
CREATE POLICY "Lab users can update quotes for their lab"
ON public.quotes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.lab_users
    WHERE lab_users.user_id = auth.uid()
    AND lab_users.lab_id = quotes.lab_id
    AND lab_users.is_active = true
  )
);

-- Labs can view quote items for their quotes
CREATE POLICY "Lab users can view quote items for their lab"
ON public.quote_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.quotes
    JOIN public.lab_users ON lab_users.lab_id = quotes.lab_id
    WHERE quotes.id = quote_items.quote_id
    AND lab_users.user_id = auth.uid()
  )
);

-- Labs can update quote items for their quotes
CREATE POLICY "Lab users can update quote items for their lab"
ON public.quote_items
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.quotes
    JOIN public.lab_users ON lab_users.lab_id = quotes.lab_id
    WHERE quotes.id = quote_items.quote_id
    AND lab_users.user_id = auth.uid()
    AND lab_users.is_active = true
  )
);

-- Create function to get lab_id for current user
CREATE OR REPLACE FUNCTION public.get_user_lab_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT lab_id
  FROM public.lab_users
  WHERE user_id = _user_id
  AND is_active = true
  LIMIT 1
$$;

-- Create function to check if user is lab user
CREATE OR REPLACE FUNCTION public.is_lab_user(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.lab_users
    WHERE user_id = _user_id
    AND is_active = true
  )
$$;