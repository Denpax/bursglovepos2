-- Disable RLS to ensure all operations work
ALTER TABLE products DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales DISABLE ROW LEVEL SECURITY;
ALTER TABLE sale_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE customers DISABLE ROW LEVEL SECURITY;
ALTER TABLE coupons DISABLE ROW LEVEL SECURITY;
ALTER TABLE terminals DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
ALTER TABLE product_variants DISABLE ROW LEVEL SECURITY;

-- Ensure is_active exists and is true by default
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
UPDATE products SET is_active = TRUE WHERE is_active IS NULL;

-- Ensure low_stock_threshold exists
ALTER TABLE settings ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;

-- Function to generate ticket number
CREATE OR REPLACE FUNCTION generate_ticket_number()
RETURNS TRIGGER AS $$
DECLARE
    current_year BIGINT;
    start_id BIGINT;
    next_id BIGINT;
BEGIN
    -- Get current year
    current_year := EXTRACT(YEAR FROM NOW())::BIGINT;
    -- Calculate start ID for this year (e.g., 202600000)
    start_id := current_year * 100000;
    
    -- Find the max ticket number for this year
    SELECT COALESCE(MAX(ticket_number), start_id) + 1
    INTO next_id
    FROM sales
    WHERE ticket_number > start_id AND ticket_number < (start_id + 100000);
    
    -- Set the new ticket number
    NEW.ticket_number := next_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists to avoid duplicates
DROP TRIGGER IF EXISTS set_ticket_number_trigger ON sales;

-- Create trigger
CREATE TRIGGER set_ticket_number_trigger
BEFORE INSERT ON sales
FOR EACH ROW
WHEN (NEW.ticket_number IS NULL)
EXECUTE FUNCTION generate_ticket_number();
