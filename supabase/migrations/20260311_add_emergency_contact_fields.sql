-- ADD EMERGENCY CONTACT FIELDS TO PROFILES
-- Split the single 'emergency_contact' field into 'emergency_contact_name' and 'emergency_contact_phone'

ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS emergency_contact_name TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact_phone TEXT;

-- Optional: try to migrate data if it exists in the old column
-- We'll just copy the current string to 'emergency_contact_name' for now.
UPDATE public.profiles 
SET emergency_contact_name = emergency_contact
WHERE emergency_contact IS NOT NULL AND emergency_contact_name IS NULL;

-- Note: We'll keep 'emergency_contact' for backward compatibility for now if needed, 
-- but the UI will use the new fields.
