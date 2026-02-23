-- Add instructor legal document columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gov_id_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gov_id_expiry DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bir_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS tin TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;
