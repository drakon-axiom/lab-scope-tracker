-- Drop existing restrictive SELECT policies for clients and manufacturers
DROP POLICY IF EXISTS "Users can view own clients" ON clients;
DROP POLICY IF EXISTS "Users can view own manufacturers" ON manufacturers;

-- Create new SELECT policies that allow all authenticated users to read
CREATE POLICY "Authenticated users can view all clients"
ON clients
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view all manufacturers"
ON manufacturers
FOR SELECT
TO authenticated
USING (true);