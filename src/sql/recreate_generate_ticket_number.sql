DROP FUNCTION IF EXISTS generate_ticket_number();

CREATE OR REPLACE FUNCTION generate_ticket_number() RETURNS TEXT AS $$
DECLARE
  year_prefix TEXT;
  next_id INTEGER;
  new_ticket_number TEXT;
BEGIN
  year_prefix := to_char(now(), 'YYYY');
  
  -- Get the max ticket number for the current year
  -- We assume ticket_number format is YYYYNNNNN
  SELECT COALESCE(MAX(CAST(SUBSTRING(ticket_number FROM 5) AS INTEGER)), 0) + 1
  INTO next_id
  FROM sales
  WHERE ticket_number LIKE year_prefix || '%';
  
  new_ticket_number := year_prefix || LPAD(next_id::TEXT, 5, '0');
  
  RETURN new_ticket_number;
END;
$$ LANGUAGE plpgsql;