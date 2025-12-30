-- Update product_variants table
ALTER TABLE public.product_variants 
DROP COLUMN IF EXISTS price_adjustment,
ADD COLUMN IF NOT EXISTS price DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS cost DECIMAL(10, 2) NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Update sale_items table
ALTER TABLE public.sale_items
ADD COLUMN IF NOT EXISTS variant_cost_amount DECIMAL(10, 2) DEFAULT 0;

-- Update decrement_stock function to handle variants
CREATE OR REPLACE FUNCTION public.decrement_stock(p_id UUID, p_quantity INTEGER, v_id UUID DEFAULT NULL)
RETURNS VOID AS $
BEGIN
  IF v_id IS NOT NULL THEN
    UPDATE public.product_variants
    SET stock = stock - p_quantity
    WHERE id = v_id AND product_id = p_id;
  ELSE
    UPDATE public.products
    SET stock = stock - p_quantity
    WHERE id = p_id;
  END IF;
END;
$ LANGUAGE plpgsql SECURITY DEFINER;
