-- Add notification_sounds table
CREATE TABLE IF NOT EXISTS notification_sounds (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Insert default sounds
INSERT INTO notification_sounds (name, url, is_default)
VALUES 
  ('Campana', 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3', true),
  ('Timbre', 'https://assets.mixkit.co/active_storage/sfx/2870/2870-preview.mp3', true),
  ('Alerta', 'https://assets.mixkit.co/active_storage/sfx/2871/2871-preview.mp3', true)
ON CONFLICT DO NOTHING;

-- Add selected_notification_sound_id to settings table if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'selected_notification_sound_id') THEN 
        ALTER TABLE settings ADD COLUMN selected_notification_sound_id UUID REFERENCES notification_sounds(id); 
    END IF; 
END $$;
