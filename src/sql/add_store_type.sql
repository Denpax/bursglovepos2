-- Add store_type column to distinguish between retail and wholesale
-- Default to 'retail' for existing data

-- Products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'retail';
CREATE INDEX IF NOT EXISTS idx_products_store_type ON public.products(store_type);

-- Sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'retail';
CREATE INDEX IF NOT EXISTS idx_sales_store_type ON public.sales(store_type);

-- Customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'retail';
CREATE INDEX IF NOT EXISTS idx_customers_store_type ON public.customers(store_type);

-- Categories
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'retail';
CREATE INDEX IF NOT EXISTS idx_categories_store_type ON public.categories(store_type);

-- Discounts
ALTER TABLE public.discounts ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'retail';
CREATE INDEX IF NOT EXISTS idx_discounts_store_type ON public.discounts(store_type);

-- Update RLS policies to allow access based on store_type if needed
-- For now, we rely on the application logic to filter, but RLS is safer.
-- Since we are using a simple role-based system (admin/cashier), we can keep RLS open for authenticated users
-- and filter in the frontend/backend queries.
