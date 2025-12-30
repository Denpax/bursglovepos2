-- Ensure ticket_number is BIGINT to hold 202600001
ALTER TABLE sales ALTER COLUMN ticket_number TYPE BIGINT;

-- Function to generate ticket number YYYYNNNNN
CREATE OR REPLACE FUNCTION generate_ticket_number() RETURNS TRIGGER AS $$
DECLARE
  current_year INTEGER;
  next_number BIGINT;
  year_prefix BIGINT;
BEGIN
  -- Get year from created_at or current date
  current_year := EXTRACT(YEAR FROM COALESCE(NEW.created_at, NOW()));
  year_prefix := current_year * 100000; -- Example: 202500000
  
  -- Find max ticket_number for this year
  SELECT MAX(ticket_number) INTO next_number
  FROM sales
  WHERE ticket_number >= year_prefix AND ticket_number < (current_year + 1) * 100000;
  
  IF next_number IS NULL THEN
    next_number := year_prefix + 1; -- Start at 202500001
  ELSE
    next_number := next_number + 1;
  END IF;
  
  NEW.ticket_number := next_number;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to ensure we use the new logic
DROP TRIGGER IF EXISTS set_ticket_number ON sales;

-- Create trigger
CREATE TRIGGER set_ticket_number
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION generate_ticket_number();

-- Update existing null ticket_numbers (optional, for backward compatibility)
DO $$
DECLARE
  r RECORD;
  seq BIGINT := 1;
  curr_year INTEGER := 0;
  rec_year INTEGER;
BEGIN
  FOR r IN SELECT id, created_at FROM sales WHERE ticket_number IS NULL ORDER BY created_at ASC LOOP
    rec_year := EXTRACT(YEAR FROM r.created_at);
    
    IF rec_year != curr_year THEN
      curr_year := rec_year;
      seq := 1;
    END IF;
    
    UPDATE sales 
    SET ticket_number = (curr_year * 100000) + seq
    WHERE id = r.id;
    
    seq := seq + 1;
  END LOOP;
END $$;
