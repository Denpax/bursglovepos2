-- Drop existing function and dependent triggers
DROP FUNCTION IF EXISTS generate_ticket_number() CASCADE;

-- Create the function as a TRIGGER function
CREATE OR REPLACE FUNCTION generate_ticket_number() RETURNS TRIGGER AS $$
DECLARE
  year_prefix TEXT;
  next_id INTEGER;
BEGIN
  -- If ticket_number is already set, don't overwrite it (useful for manual overrides or migration)
  IF NEW.ticket_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  year_prefix := to_char(now(), 'YYYY');
  
  -- Get the max ticket number for the current year
  -- We assume ticket_number format is YYYYNNNNN (e.g., 202600001)
  -- We extract the numeric part (from index 5, length 5)
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_id
  FROM sales
  WHERE ticket_number LIKE year_prefix || '%';
  
  NEW.ticket_number := year_prefix || LPAD(next_id::TEXT, 5, '0');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER set_ticket_number_trigger
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION generate_ticket_number();

-- Ensure columns exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;