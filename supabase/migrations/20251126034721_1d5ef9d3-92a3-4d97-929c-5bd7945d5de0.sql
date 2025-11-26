-- Create quotes table
CREATE TABLE quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lab_id UUID NOT NULL REFERENCES labs(id),
  quote_number TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  notes TEXT,
  tracking_number TEXT,
  shipped_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id)
);

-- Create quote_items table
CREATE TABLE quote_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID NOT NULL REFERENCES quotes(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id),
  testing_type_id UUID NOT NULL REFERENCES testing_types(id),
  client TEXT,
  sample TEXT,
  manufacturer TEXT,
  batch TEXT,
  price NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add quote_item_id, report_url, and report_file to test_records
ALTER TABLE test_records 
ADD COLUMN quote_item_id UUID REFERENCES quote_items(id),
ADD COLUMN report_url TEXT,
ADD COLUMN report_file TEXT;

-- Enable RLS on quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

-- Create policies for quotes
CREATE POLICY "Users can view own quotes"
  ON quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create quotes"
  ON quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own quotes"
  ON quotes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own quotes"
  ON quotes FOR DELETE
  USING (auth.uid() = user_id);

-- Enable RLS on quote_items
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Create policies for quote_items
CREATE POLICY "Users can view own quote items"
  ON quote_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM quotes
    WHERE quotes.id = quote_items.quote_id
    AND quotes.user_id = auth.uid()
  ));

CREATE POLICY "Users can create quote items"
  ON quote_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM quotes
    WHERE quotes.id = quote_items.quote_id
    AND quotes.user_id = auth.uid()
  ));

CREATE POLICY "Users can update own quote items"
  ON quote_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM quotes
    WHERE quotes.id = quote_items.quote_id
    AND quotes.user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own quote items"
  ON quote_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM quotes
    WHERE quotes.id = quote_items.quote_id
    AND quotes.user_id = auth.uid()
  ));

-- Add triggers for updated_at
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_quote_items_updated_at
  BEFORE UPDATE ON quote_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();