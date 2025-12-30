ALTER TABLE coupons ADD COLUMN IF NOT EXISTS store_type TEXT DEFAULT 'retail';
UPDATE coupons SET store_type = 'retail' WHERE store_type IS NULL;