-- Create product_vendor_pricing table for vendor-specific pricing
CREATE TABLE IF NOT EXISTS product_vendor_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lab_id UUID NOT NULL REFERENCES labs(id) ON DELETE CASCADE,
  price NUMERIC NOT NULL,
  user_id UUID NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(product_id, lab_id)
);

-- Add index for faster queries
CREATE INDEX idx_product_vendor_pricing_product ON product_vendor_pricing(product_id);
CREATE INDEX idx_product_vendor_pricing_lab ON product_vendor_pricing(lab_id);
CREATE INDEX idx_product_vendor_pricing_user ON product_vendor_pricing(user_id);

-- Enable RLS
ALTER TABLE product_vendor_pricing ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own vendor pricing"
  ON product_vendor_pricing FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create vendor pricing"
  ON product_vendor_pricing FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own vendor pricing"
  ON product_vendor_pricing FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own vendor pricing"
  ON product_vendor_pricing FOR DELETE
  USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_product_vendor_pricing_updated_at
  BEFORE UPDATE ON product_vendor_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comments
COMMENT ON TABLE product_vendor_pricing IS 'Vendor-specific pricing for products, allowing different prices from different labs for the same test';
COMMENT ON COLUMN product_vendor_pricing.is_active IS 'Whether this pricing is currently active and should be used';
COMMENT ON COLUMN product_vendor_pricing.notes IS 'Additional notes about this vendor pricing (e.g., special conditions, discounts)';