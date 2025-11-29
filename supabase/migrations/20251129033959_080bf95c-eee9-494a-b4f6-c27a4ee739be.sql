-- Drop current permissive SELECT policies for clients and manufacturers
DROP POLICY IF EXISTS "Authenticated users can view all clients" ON clients;
DROP POLICY IF EXISTS "Authenticated users can view all manufacturers" ON manufacturers;

-- Create new SELECT policy for clients: subscribers see own, admins see all
CREATE POLICY "Users can view own clients, admins view all"
ON clients
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);

-- Create new SELECT policy for manufacturers: subscribers see own, admins see all
CREATE POLICY "Users can view own manufacturers, admins view all"
ON manufacturers
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR public.has_role(auth.uid(), 'admin')
);