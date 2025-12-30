-- Drop existing unique constraint on name if it exists
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'categories_name_key') THEN 
        ALTER TABLE categories DROP CONSTRAINT categories_name_key; 
    END IF; 
END $$;

-- Add composite unique constraint for name and store_type
-- This allows the same category name to exist in different store types (retail/wholesale)
ALTER TABLE categories 
ADD CONSTRAINT categories_name_store_type_key UNIQUE (name, store_type);