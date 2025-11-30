-- Add validation fields to payment_methods table for credit card validation
ALTER TABLE public.payment_methods
ADD COLUMN is_validated boolean DEFAULT false,
ADD COLUMN validated_at timestamp with time zone,
ADD COLUMN validation_details jsonb;