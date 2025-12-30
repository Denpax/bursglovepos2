-- Create storage bucket for notification sounds if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('sounds', 'sounds', true)
ON CONFLICT (id) DO NOTHING;

-- Policy to allow public access to sounds
CREATE POLICY "Public Access Sounds"
ON storage.objects FOR SELECT
USING ( bucket_id = 'sounds' );

-- Policy to allow authenticated users to upload sounds
CREATE POLICY "Authenticated Upload Sounds"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'sounds' AND auth.role() = 'authenticated' );

-- Policy to allow authenticated users to delete sounds
CREATE POLICY "Authenticated Delete Sounds"
ON storage.objects FOR DELETE
USING ( bucket_id = 'sounds' AND auth.role() = 'authenticated' );
