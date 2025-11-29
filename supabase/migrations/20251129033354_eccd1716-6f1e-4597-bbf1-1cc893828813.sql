-- Drop existing restrictive SELECT policies for labs and products
DROP POLICY IF EXISTS "Users can view own labs" ON labs;
DROP POLICY IF EXISTS "Users can view own products" ON products;

-- Create new SELECT policies that allow all authenticated users to read
CREATE POLICY "Authenticated users can view all labs"
ON labs
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view all products"
ON products
FOR SELECT
TO authenticated
USING (true);

-- Ensure write operations remain restricted to owners
-- (INSERT, UPDATE, DELETE policies already exist and restrict to user_id = auth.uid())