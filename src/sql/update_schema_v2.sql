-- Create sequence table
CREATE TABLE IF NOT EXISTS receipt_sequences (
  year INTEGER PRIMARY KEY,
  last_sequence INTEGER DEFAULT 0
);

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year INTEGER;
  next_seq INTEGER;
  sale_date TIMESTAMP;
BEGIN
  sale_date := COALESCE(NEW.created_at, NOW());
  current_year := EXTRACT(YEAR FROM sale_date);
  
  -- Insert year if not exists
  INSERT INTO receipt_sequences (year, last_sequence)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO NOTHING;
  
  -- Increment and get sequence
  UPDATE receipt_sequences
  SET last_sequence = last_sequence + 1
  WHERE year = current_year
  RETURNING last_sequence INTO next_seq;
  
  -- Set ticket number: YYYY + 5 digits (e.g., 202600001)
  NEW.ticket_number := (current_year * 100000) + next_seq;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DROP TRIGGER IF EXISTS set_ticket_number_trigger ON sales;
CREATE TRIGGER set_ticket_number_trigger
BEFORE INSERT ON sales
FOR EACH ROW
WHEN (NEW.ticket_number IS NULL)
EXECUTE FUNCTION generate_ticket_number();

-- Ensure columns exist
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE settings ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE sales ADD COLUMN IF NOT EXISTS ticket_number BIGINT;
