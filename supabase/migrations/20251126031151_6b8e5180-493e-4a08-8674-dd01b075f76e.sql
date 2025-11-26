-- Add price column to testing_types
ALTER TABLE testing_types ADD COLUMN price numeric(10,2);

-- Rename standard column to vendor for clarity
ALTER TABLE testing_types RENAME COLUMN standard TO vendor;