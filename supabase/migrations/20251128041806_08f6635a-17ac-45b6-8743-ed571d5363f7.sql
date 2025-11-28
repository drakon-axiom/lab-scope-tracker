-- Step 1: Create Chromate lab if it doesn't exist (for data migration)
INSERT INTO labs (name, user_id)
SELECT 'Chromate', '5afc6549-80c0-4bb5-9505-962266086f36'
WHERE NOT EXISTS (
  SELECT 1 FROM labs WHERE name = 'Chromate' AND user_id = '5afc6549-80c0-4bb5-9505-962266086f36'
);

-- Step 2: Migrate existing product pricing to product_vendor_pricing
-- This preserves all existing vendor and price data before we remove those columns
INSERT INTO product_vendor_pricing (product_id, lab_id, price, user_id, is_active)
SELECT 
  p.id as product_id,
  l.id as lab_id,
  p.price,
  p.user_id,
  true as is_active
FROM products p
JOIN labs l ON l.name = p.vendor AND l.user_id = p.user_id
WHERE p.price IS NOT NULL 
  AND p.vendor IS NOT NULL
  AND p.user_id = '5afc6549-80c0-4bb5-9505-962266086f36'
  -- Avoid duplicates if this migration runs twice
  AND NOT EXISTS (
    SELECT 1 FROM product_vendor_pricing pvp 
    WHERE pvp.product_id = p.id AND pvp.lab_id = l.id
  );

-- Step 3: Remove price and vendor columns from products table
-- These are now managed through product_vendor_pricing
ALTER TABLE products DROP COLUMN IF EXISTS price;
ALTER TABLE products DROP COLUMN IF EXISTS vendor;

-- Add comment
COMMENT ON TABLE products IS 'Product/test definitions. Pricing and vendor relationships are managed through product_vendor_pricing table.';