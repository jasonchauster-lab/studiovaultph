-- Add document columns to studios table
ALTER TABLE studios ADD COLUMN IF NOT EXISTS bir_certificate_url TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS gov_id_url TEXT;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS space_photos_urls TEXT[];
