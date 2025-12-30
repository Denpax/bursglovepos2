-- Add selected_notification_sound_id to settings table
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'settings' AND column_name = 'selected_notification_sound_id') THEN 
        ALTER TABLE settings ADD COLUMN selected_notification_sound_id UUID REFERENCES notification_sounds(id); 
    END IF; 
END $$;