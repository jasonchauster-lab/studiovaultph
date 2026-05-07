-- ==========================================
-- CONSOLIDATED STUDIO VITAL MIGRATIONS
-- 1. SaaS Website Builder (Fields & Slug Trigger)
-- 2. Custom Domain Support
-- 3. Studio Members (Staff/Instructor Management)
-- ==========================================

-- 1. SaaS WEBSITE BUILDER & SLUGS
-- Add slug and subscription fields to studios
ALTER TABLE studios ADD COLUMN IF NOT EXISTS slug TEXT UNIQUE;
ALTER TABLE studios ADD COLUMN IF NOT EXISTS subscription_tier TEXT DEFAULT 'premium'; -- Updated to 'premium' for website access
ALTER TABLE studios ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
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

-- Create indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_studios_slug ON studios(slug);
CREATE INDEX IF NOT EXISTS idx_profiles_slug ON profiles(slug);

-- Slug Generation Function
CREATE OR REPLACE FUNCTION generate_studio_slug() RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    IF EXISTS (SELECT 1 FROM studios WHERE slug = NEW.slug) THEN
      NEW.slug := NEW.slug || '-' || substr(md5(random()::text), 1, 4);
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_generate_studio_slug') THEN
        CREATE TRIGGER trg_generate_studio_slug
        BEFORE INSERT ON studios
        FOR EACH ROW EXECUTE FUNCTION generate_studio_slug();
    END IF;
END $$;

-- 2. CUSTOM DOMAINS
ALTER TABLE studios ADD COLUMN IF NOT EXISTS custom_domain TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS idx_studios_custom_domain ON studios(custom_domain);

-- 3. STUDIO MEMBERS (STAFF MANAGEMENT)
CREATE TABLE IF NOT EXISTS public.studio_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'instructor')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(studio_id, profile_id)
);

ALTER TABLE public.studio_members ENABLE ROW LEVEL SECURITY;

-- Member RLS Policies
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Studio owners can manage members' AND polrelid = 'public.studio_members'::regclass) THEN
        CREATE POLICY "Studio owners can manage members" ON public.studio_members
            FOR ALL TO authenticated
            USING (EXISTS (SELECT 1 FROM public.studios WHERE id = studio_members.studio_id AND owner_id = auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policy WHERE polname = 'Members can view studio colleagues' AND polrelid = 'public.studio_members'::regclass) THEN
        CREATE POLICY "Members can view studio colleagues" ON public.studio_members
            FOR SELECT TO authenticated
            USING (EXISTS (SELECT 1 FROM public.studio_members AS self WHERE self.studio_id = studio_members.studio_id AND self.profile_id = auth.uid()));
    END IF;
END $$;
