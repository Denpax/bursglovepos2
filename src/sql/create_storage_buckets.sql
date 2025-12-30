
-- Create storage buckets if they don't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for products bucket (public read, authenticated upload)
CREATE POLICY "Public Access Products"
ON storage.objects FOR SELECT
USING ( bucket_id = 'products' );

CREATE POLICY "Authenticated Upload Products"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'products' );

CREATE POLICY "Authenticated Update Products"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'products' );

CREATE POLICY "Authenticated Delete Products"
ON storage.objects FOR DELETE
USING ( bucket_id = 'products' );

-- Policy for logos bucket (public read, authenticated upload)
CREATE POLICY "Public Access Logos"
ON storage.objects FOR SELECT
USING ( bucket_id = 'logos' );

CREATE POLICY "Authenticated Upload Logos"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'logos' );

CREATE POLICY "Authenticated Update Logos"
ON storage.objects FOR UPDATE
WITH CHECK ( bucket_id = 'logos' );

CREATE POLICY "Authenticated Delete Logos"
ON storage.objects FOR DELETE
USING ( bucket_id = 'logos' );
