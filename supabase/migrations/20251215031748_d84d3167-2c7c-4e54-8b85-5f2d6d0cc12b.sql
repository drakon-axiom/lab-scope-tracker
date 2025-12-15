-- Create table for lab requests from customers
CREATE TABLE public.lab_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  lab_name TEXT NOT NULL,
  location TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  reviewed_by UUID,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.lab_requests ENABLE ROW LEVEL SECURITY;

-- Users can create lab requests
CREATE POLICY "Users can create lab requests"
ON public.lab_requests
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can view their own requests
CREATE POLICY "Users can view own lab requests"
ON public.lab_requests
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all requests
CREATE POLICY "Admins can view all lab requests"
ON public.lab_requests
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

-- Admins can update requests
CREATE POLICY "Admins can update lab requests"
ON public.lab_requests
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Create updated_at trigger
CREATE TRIGGER update_lab_requests_updated_at
  BEFORE UPDATE ON public.lab_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();