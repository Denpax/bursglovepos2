-- Fix unique constraint on categories table to allow same category name in different store types

-- First, drop the existing unique constraint on name
ALTER TABLE public.categories DROP CONSTRAINT IF EXISTS categories_name_key;

-- Add a new unique constraint on (name, store_type)
-- This allows 'Bebidas' in 'retail' and 'Bebidas' in 'wholesale' to coexist
ALTER TABLE public.categories ADD CONSTRAINT categories_name_store_type_key UNIQUE (name, store_type);

-- Fix unique constraint on coupons table as well
ALTER TABLE public.coupons DROP CONSTRAINT IF EXISTS coupons_code_key;
ALTER TABLE public.coupons ADD CONSTRAINT coupons_code_store_type_key UNIQUE (code, store_type);

