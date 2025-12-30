-- Drop existing function and dependent triggers
DROP FUNCTION IF EXISTS generate_ticket_number() CASCADE;

-- Create the function as a TRIGGER function optimized for BIGINT
CREATE OR REPLACE FUNCTION generate_ticket_number() RETURNS TRIGGER AS $$
DECLARE
  year_prefix BIGINT;
  min_val BIGINT;
  max_val BIGINT;
  next_val BIGINT;
BEGIN
  -- If ticket_number is already set, don't overwrite it
  IF NEW.ticket_number IS NOT NULL THEN
    RETURN NEW;
  END IF;

  -- Get current year as number (e.g., 2025)
  year_prefix := CAST(to_char(now(), 'YYYY') AS BIGINT);
  
  -- Define range for the year: 202500000 to 202599999
  -- This assumes max 99,999 tickets per year
  min_val := year_prefix * 100000;
  max_val := (year_prefix * 100000) + 99999;
  
  -- Get max ticket number in this range
  SELECT MAX(ticket_number)
  INTO next_val
  FROM sales
  WHERE ticket_number > min_val AND ticket_number <= max_val;
  
  -- If no ticket found in range, start with year + 00001
  IF next_val IS NULL THEN
    NEW.ticket_number := min_val + 1;
  ELSE
    NEW.ticket_number := next_val + 1;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER set_ticket_number_trigger
BEFORE INSERT ON sales
FOR EACH ROW
EXECUTE FUNCTION generate_ticket_number();
