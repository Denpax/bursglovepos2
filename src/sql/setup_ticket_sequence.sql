-- Create a table to track the last sequence number for each year
CREATE TABLE IF NOT EXISTS receipt_sequences (
  year INTEGER PRIMARY KEY,
  last_sequence INTEGER DEFAULT 0
);

-- Function to generate the next ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
  current_year INTEGER;
  next_sequence INTEGER;
  new_ticket_number BIGINT;
BEGIN
  -- Get current year
  current_year := EXTRACT(YEAR FROM NOW());
  
  -- Insert year if not exists, do nothing if exists
  INSERT INTO receipt_sequences (year, last_sequence)
  VALUES (current_year, 0)
  ON CONFLICT (year) DO NOTHING;
  
  -- Lock the row for this year to prevent race conditions and increment sequence
  UPDATE receipt_sequences
  SET last_sequence = last_sequence + 1
  WHERE year = current_year
  RETURNING last_sequence INTO next_sequence;
  
  -- Format: YYYY + 5 digits sequence (e.g., 202600001)
  -- We use BIGINT for ticket_number to hold this value
  new_ticket_number := (current_year::TEXT || LPAD(next_sequence::TEXT, 5, '0'))::BIGINT;
  
  -- Set the ticket_number on the new record
  NEW.ticket_number := new_ticket_number;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically assign ticket number on insert
DROP TRIGGER IF EXISTS set_ticket_number_trigger ON sales;

CREATE TRIGGER set_ticket_number_trigger
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION generate_ticket_number();

-- Ensure ticket_number column exists and is BIGINT (to hold 202600001)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'sales' AND column_name = 'ticket_number') THEN
        ALTER TABLE sales ADD COLUMN ticket_number BIGINT;
    ELSE
        -- If it exists but might be integer, change to bigint just in case (though integer fits 202600001)
        ALTER TABLE sales ALTER COLUMN ticket_number TYPE BIGINT;
    END IF;
END
$$;
