-- Add submission tracking fields to test_records
ALTER TABLE test_records 
ADD COLUMN client text,
ADD COLUMN sample text,
ADD COLUMN manufacturer text,
ADD COLUMN batch text;