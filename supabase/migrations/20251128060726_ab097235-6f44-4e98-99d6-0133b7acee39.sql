-- Add category field to products table
ALTER TABLE products ADD COLUMN IF NOT EXISTS category TEXT;

-- Add aliases field to products table for alternative names
ALTER TABLE products ADD COLUMN IF NOT EXISTS aliases TEXT[];