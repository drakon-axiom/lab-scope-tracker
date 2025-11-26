-- Rename testing_types table to products
ALTER TABLE public.testing_types RENAME TO products_new;

-- Update foreign key columns in test_records
ALTER TABLE public.test_records DROP COLUMN IF EXISTS product_id;
ALTER TABLE public.test_records RENAME COLUMN testing_type_id TO product_id;

-- Update foreign key columns in quote_items
ALTER TABLE public.quote_items DROP COLUMN IF EXISTS product_id;
ALTER TABLE public.quote_items RENAME COLUMN testing_type_id TO product_id;

-- Drop old products table if it exists
DROP TABLE IF EXISTS public.products CASCADE;

-- Rename products_new to products
ALTER TABLE public.products_new RENAME TO products;

-- Drop old RLS policies for testing_types
DROP POLICY IF EXISTS "Users can create testing types" ON public.products;
DROP POLICY IF EXISTS "Users can delete own testing types" ON public.products;
DROP POLICY IF EXISTS "Users can update own testing types" ON public.products;
DROP POLICY IF EXISTS "Users can view own testing types" ON public.products;

-- Create new RLS policies for products
CREATE POLICY "Users can create products" 
ON public.products 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own products" 
ON public.products 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own products" 
ON public.products 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can view own products" 
ON public.products 
FOR SELECT 
USING (auth.uid() = user_id);