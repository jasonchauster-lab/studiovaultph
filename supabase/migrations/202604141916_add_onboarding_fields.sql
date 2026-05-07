-- Add columns for onboarding refinements
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS gender text,
ADD COLUMN IF NOT EXISTS marketing_consent boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS first_name text,
ADD COLUMN IF NOT EXISTS last_name text;

-- Update existing profiles' first/last name if possible (optional)
-- UPDATE profiles SET 
--     first_name = split_part(full_name, ' ', 1),
--     last_name = substring(full_name from ' .*');
