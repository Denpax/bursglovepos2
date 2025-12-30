ALTER TABLE settings ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'retail';

-- Update existing settings to be 'retail' if null
UPDATE settings SET store_type = 'retail' WHERE store_type IS NULL;

-- Create a unique constraint so we don't have multiple settings for the same store type
-- First, we might need to clean up duplicates if any (unlikely given previous logic but good practice)
-- For now, let's just add the column. The code logic handles single row fetch.
