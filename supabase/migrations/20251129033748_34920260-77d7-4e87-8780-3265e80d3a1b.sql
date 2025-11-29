-- Drop existing restrictive SELECT policy for product_vendor_pricing
DROP POLICY IF EXISTS "Users can view own vendor pricing" ON product_vendor_pricing;

-- Create new SELECT policy that allows all authenticated users to read pricing
CREATE POLICY "Authenticated users can view all vendor pricing"
ON product_vendor_pricing
FOR SELECT
TO authenticated
USING (true);