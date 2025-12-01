-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  tier TEXT NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro', 'enterprise')),
  monthly_item_limit INTEGER NOT NULL DEFAULT 10,
  is_active BOOLEAN NOT NULL DEFAULT true,
  current_period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  current_period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + INTERVAL '1 month'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usage_tracking table
CREATE TABLE public.usage_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  items_sent_this_month INTEGER NOT NULL DEFAULT 0,
  period_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', now()),
  period_end TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (date_trunc('month', now()) + INTERVAL '1 month'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, period_start)
);

-- Create waitlist table
CREATE TABLE public.waitlist (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approved_by UUID REFERENCES auth.users(id),
  invited_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.waitlist ENABLE ROW LEVEL SECURITY;

-- RLS Policies for subscriptions
CREATE POLICY "Users can view their own subscription"
ON public.subscriptions
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all subscriptions"
ON public.subscriptions
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update subscriptions"
ON public.subscriptions
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- RLS Policies for usage_tracking
CREATE POLICY "Users can view their own usage"
ON public.usage_tracking
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all usage"
ON public.usage_tracking
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "System can insert usage tracking"
ON public.usage_tracking
FOR INSERT
WITH CHECK (true);

CREATE POLICY "System can update usage tracking"
ON public.usage_tracking
FOR UPDATE
USING (true);

-- RLS Policies for waitlist
CREATE POLICY "Admins can view all waitlist entries"
ON public.waitlist
FOR SELECT
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update waitlist entries"
ON public.waitlist
FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can insert to waitlist"
ON public.waitlist
FOR INSERT
WITH CHECK (true);

-- Function to create subscription and usage tracking on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create free tier subscription
  INSERT INTO public.subscriptions (user_id, tier, monthly_item_limit)
  VALUES (NEW.id, 'free', 10);
  
  -- Initialize usage tracking for current month
  INSERT INTO public.usage_tracking (user_id, items_sent_this_month)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$;

-- Trigger to auto-create subscription on signup
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- Function to reset monthly usage
CREATE OR REPLACE FUNCTION public.reset_monthly_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Archive old usage records and create new ones
  INSERT INTO public.usage_tracking (user_id, items_sent_this_month, period_start, period_end)
  SELECT 
    user_id,
    0,
    date_trunc('month', now()),
    date_trunc('month', now()) + INTERVAL '1 month'
  FROM public.subscriptions
  WHERE is_active = true
  ON CONFLICT (user_id, period_start) DO NOTHING;
  
  -- Update subscription periods
  UPDATE public.subscriptions
  SET 
    current_period_start = date_trunc('month', now()),
    current_period_end = date_trunc('month', now()) + INTERVAL '1 month',
    updated_at = now()
  WHERE is_active = true
    AND current_period_end < now();
END;
$$;

-- Add updated_at trigger for subscriptions
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add updated_at trigger for usage_tracking
CREATE TRIGGER update_usage_tracking_updated_at
BEFORE UPDATE ON public.usage_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();