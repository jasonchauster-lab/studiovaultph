-- Add slug and subscription fields to studios
ALTER TABLE studios ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'free';
ALTER TABLE studios ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active'; -- Defaulting to active for existing studios initially
ALTER TABLE studios ADD COLUMN IF NOT EXISTS website_config JSONB DEFAULT '{
  "theme": { "primaryColor": "#4A5D4E", "fontFamily": "serif" },
  "sections": [
    { "id": "hero", "type": "hero", "enabled": true, "content": { "title": "", "subtitle": "" } },
    { "id": "about", "type": "about", "enabled": true, "content": { "text": "" } },
    { "id": "booking", "type": "booking", "enabled": true, "content": {} },
    { "id": "gallery", "type": "gallery", "enabled": true, "content": {} },
    { "id": "reviews", "type": "reviews", "enabled": true, "content": {} }
  ]
}'::jsonb;

-- Add slug and portfolio_config to profiles for instructors
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS portfolio_config JSONB DEFAULT '{
  "theme": { "primaryColor": "#4A5D4E" },
  "sections": [
    { "id": "hero", "type": "hero", "enabled": true, "content": {} },
    { "id": "about", "type": "about", "enabled": true, "content": {} },
    { "id": "experience", "type": "experience", "enabled": true, "content": {} }
  ]
}'::jsonb;

-- Create indexes for fast looking up by slug
CREATE INDEX IF NOT EXISTS idx_studios_slug ON studios(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug);

-- Function to generate a default slug from name if missing
CREATE OR REPLACE FUNCTION generate_studio_slug() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Handle collisions (simplified)
    IF EXISTS (SELECT 1 FROM studios WHERE slug = NEW.slug) THEN
      NEW.slug := NEW.slug || '-' || substr(md5(random()::text), 1, 4);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for new studios
CREATE TRIGGER trg_generate_studio_slug
BEFORE INSERT ON studios
FOR EACH ROW EXECUTE FUNCTION generate_studio_slug();
