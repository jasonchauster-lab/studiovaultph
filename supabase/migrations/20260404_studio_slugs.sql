-- Migration: Add Studio Slugs and Subscriptions
-- This supports the "studiovault.co/[slug]" routing and the onboarding "logic".

-- 1. Add new columns to studios table
ALTER TABLE studios
ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'starter',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'trial',
ADD COLUMN IF NOT EXISTS trial_ends_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 month');

-- 2. Create a function to validate and clean slugs
-- Slugs must be lowercase, alphanumeric, and hyphens only.
CREATE OR REPLACE FUNCTION validate_studio_slug()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure slug is lowercase
    NEW.slug := LOWER(NEW.slug);
    
    -- Replace spaces and underscores with hyphens
    NEW.slug := REGEXP_REPLACE(NEW.slug, '[\s_]+', '-', 'g');
    
    -- Remove non-alphanumeric/hyphen characters
    NEW.slug := REGEXP_REPLACE(NEW.slug, '[^a-z0-9-]', '', 'g');
    
    -- Trim leading/trailing hyphens
    NEW.slug := BTRIM(NEW.slug, '-');
    
    -- If slug is empty after cleaning, use a default based on name
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := LOWER(REGEXP_REPLACE(NEW.name, '[^a-zA-Z0-9]', '', 'g')) || '-' || floor(random() * 10000)::text;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Create trigger for slug validation
DROP TRIGGER IF EXISTS tr_validate_studio_slug ON studios;
CREATE TRIGGER tr_validate_studio_slug
BEFORE INSERT OR UPDATE OF slug ON studios
FOR EACH ROW
EXECUTE FUNCTION validate_studio_slug();

-- 4. Set initial slugs for existing studios (if any) based on their names
UPDATE studios SET slug = LOWER(REGEXP_REPLACE(name, '[^a-zA-Z0-9]', '', 'g')) WHERE slug IS NULL;

-- 5. Enable RLS or update policies if necessary (Public can read slugs)
-- (Existing policy "Public read studios" likely exists, but ensure slug is visible)
ALTER TABLE studios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public read studios" ON studios;
CREATE POLICY "Public read studios" ON studios FOR SELECT USING (true);
