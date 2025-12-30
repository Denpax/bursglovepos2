-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase Auth)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'cashier', -- 'admin' or 'cashier'
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS public.products (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category TEXT,
  stock INTEGER DEFAULT 0,
  barcode TEXT,
  image_url TEXT,
  points_price INTEGER, -- Points required to redeem this product
  is_redeemable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  points_balance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sales/Tickets table
CREATE TABLE IF NOT EXISTS public.sales (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id),
  customer_id UUID REFERENCES public.customers(id),
  total_amount DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  points_redeemed INTEGER DEFAULT 0,
  payment_method TEXT DEFAULT 'cash',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Sale Items table
CREATE TABLE IF NOT EXISTS public.sale_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sale_id UUID REFERENCES public.sales(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  is_redemption BOOLEAN DEFAULT FALSE, -- True if paid with points
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Settings table for points configuration
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  points_per_currency_unit DECIMAL(10, 2) DEFAULT 1, -- How many points earned per $1 spent
  currency_per_point_redemption DECIMAL(10, 2) DEFAULT 0.1, -- Value of 1 point in currency
  store_name TEXT DEFAULT 'Bursglove',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default settings
INSERT INTO public.settings (store_name) VALUES ('Bursglove') ON CONFLICT DO NOTHING;

-- Add columns to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS tax_rate DECIMAL(5, 2) DEFAULT 16.0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS color TEXT;

-- Create product variants table
CREATE TABLE IF NOT EXISTS public.product_variants (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price_adjustment DECIMAL(10, 2) DEFAULT 0,
  stock INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns to settings
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ticket_header TEXT DEFAULT 'Bienvenido';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS ticket_footer TEXT DEFAULT 'Gracias por su compra';
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS business_phone TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS business_logo_url TEXT;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS vat_rate DECIMAL(5, 2) DEFAULT 16.0;

-- Create terminals table
CREATE TABLE IF NOT EXISTS public.terminals (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  location TEXT,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add columns to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS terminal_id UUID REFERENCES public.terminals(id);
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cost_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cashier_name TEXT;

-- Add columns to sale_items
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS variant_id UUID REFERENCES public.product_variants(id);
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS tax_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS cost_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS refunded_quantity INTEGER DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS refund_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS refund_reason TEXT;
ALTER TABLE public.sale_items ADD COLUMN IF NOT EXISTS discount_amount DECIMAL(10, 2) DEFAULT 0;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS refund_status TEXT DEFAULT 'none';

-- RLS for new tables
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read variants" ON public.product_variants;
CREATE POLICY "Public read variants" ON public.product_variants FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated insert variants" ON public.product_variants;
CREATE POLICY "Authenticated insert variants" ON public.product_variants FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated update variants" ON public.product_variants;
CREATE POLICY "Authenticated update variants" ON public.product_variants FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated delete variants" ON public.product_variants;
CREATE POLICY "Authenticated delete variants" ON public.product_variants FOR DELETE TO authenticated USING (true);

ALTER TABLE public.terminals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read terminals" ON public.terminals;
CREATE POLICY "Public read terminals" ON public.terminals FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated insert terminals" ON public.terminals;
CREATE POLICY "Authenticated insert terminals" ON public.terminals FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated update terminals" ON public.terminals;
CREATE POLICY "Authenticated update terminals" ON public.terminals FOR UPDATE TO authenticated USING (true);

-- Insert default terminal
INSERT INTO public.terminals (name, location) VALUES ('Caja Principal', 'Mostrador') ON CONFLICT DO NOTHING;

-- Disable RLS for users to allow registration
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;

-- Create policies for other tables (simplified for MVP)
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read products" ON public.products FOR SELECT USING (true);
CREATE POLICY "Authenticated insert products" ON public.products FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update products" ON public.products FOR UPDATE TO authenticated USING (true);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read customers" ON public.customers FOR SELECT USING (true);
CREATE POLICY "Authenticated insert customers" ON public.customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update customers" ON public.customers FOR UPDATE TO authenticated USING (true);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sales" ON public.sales FOR SELECT USING (true);
CREATE POLICY "Authenticated insert sales" ON public.sales FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update sales" ON public.sales FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete sales" ON public.sales FOR DELETE TO authenticated USING (true);

ALTER TABLE public.sale_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read sale_items" ON public.sale_items FOR SELECT USING (true);
CREATE POLICY "Authenticated insert sale_items" ON public.sale_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated update sale_items" ON public.sale_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated delete sale_items" ON public.sale_items FOR DELETE TO authenticated USING (true);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read settings" ON public.settings FOR SELECT USING (true);
CREATE POLICY "Authenticated update settings" ON public.settings FOR UPDATE TO authenticated USING (true);

-- Storage Policies for 'logos' bucket
CREATE POLICY "Public read logos" ON storage.objects FOR SELECT TO public USING (bucket_id = 'logos');
CREATE POLICY "Authenticated upload logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');
CREATE POLICY "Authenticated update logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'logos');
CREATE POLICY "Authenticated delete logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'logos');

-- Insert mock products
INSERT INTO public.products (name, price, category, stock, points_price, is_redeemable) VALUES
('Hamburguesa Clásica', 120.00, 'Alimentos', 50, 1200, true),
('Papas Fritas', 45.00, 'Complementos', 100, 450, true),
('Refresco Cola', 25.00, 'Bebidas', 200, 250, true),
('Agua Mineral', 20.00, 'Bebidas', 150, 200, true),
('Combo Familiar', 350.00, 'Combos', 20, 3500, true);

-- Insert mock customers
INSERT INTO public.customers (full_name, email, phone, points_balance) VALUES
('Juan Pérez', 'juan@example.com', '555-0101', 150),
('María López', 'maria@example.com', '555-0102', 500),
('Carlos Ruiz', 'carlos@example.com', '555-0103', 0);

-- Function to increment points
CREATE OR REPLACE FUNCTION public.increment_points(c_id UUID, p_amount INTEGER)
RETURNS VOID AS $
BEGIN
  UPDATE public.customers
  SET points_balance = points_balance + p_amount
  WHERE id = c_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to decrement stock
CREATE OR REPLACE FUNCTION public.decrement_stock(p_id UUID, p_quantity INTEGER)
RETURNS VOID AS $
BEGIN
  UPDATE public.products
  SET stock = stock - p_quantity
  WHERE id = p_id;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;

-- Discounts table
CREATE TABLE IF NOT EXISTS public.discounts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  value DECIMAL(10, 2) NOT NULL,
  type TEXT DEFAULT 'percentage', -- 'percentage' or 'fixed'
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for discounts
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read discounts" ON public.discounts;
CREATE POLICY "Public read discounts" ON public.discounts FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated insert discounts" ON public.discounts;
CREATE POLICY "Authenticated insert discounts" ON public.discounts FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated update discounts" ON public.discounts;
CREATE POLICY "Authenticated update discounts" ON public.discounts FOR UPDATE TO authenticated USING (true);
DROP POLICY IF EXISTS "Authenticated delete discounts" ON public.discounts;
CREATE POLICY "Authenticated delete discounts" ON public.discounts FOR DELETE TO authenticated USING (true);

-- Insert default discounts
INSERT INTO public.discounts (name, value, type) VALUES 
('10% Descuento', 10, 'percentage'),
('20% Descuento', 20, 'percentage'),
('Empleado', 15, 'percentage')
ON CONFLICT DO NOTHING;

-- Categories table
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for categories
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read categories" ON public.categories;
CREATE POLICY "Public read categories" ON public.categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Authenticated insert categories" ON public.categories;
CREATE POLICY "Authenticated insert categories" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "Authenticated delete categories" ON public.categories;
CREATE POLICY "Authenticated delete categories" ON public.categories FOR DELETE TO authenticated USING (true);

-- Insert default categories
INSERT INTO public.categories (name) VALUES ('Alimentos'), ('Bebidas'), ('Complementos'), ('Combos') ON CONFLICT DO NOTHING;

-- Add ticket_number to sales
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS ticket_number BIGINT GENERATED BY DEFAULT AS IDENTITY;

-- Add customer_info and notes to sales for Shared Store orders
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS customer_info TEXT;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS notes TEXT;
