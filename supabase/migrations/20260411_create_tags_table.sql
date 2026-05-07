-- Migration: Create Tags System
-- This migration sets up the tags table and junction tables for profiles and pricing groups.

-- 1. Create tags table
CREATE TABLE IF NOT EXISTS public.tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#C4C4C4',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create profile_tags junction table (Customers)
CREATE TABLE IF NOT EXISTS public.profile_tags (
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (profile_id, tag_id, studio_id)
);

-- 3. Create pricing_groups_tags junction table
CREATE TABLE IF NOT EXISTS public.pricing_groups_tags (
    pricing_group_id UUID NOT NULL REFERENCES public.pricing_groups(id) ON DELETE CASCADE,
    tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (pricing_group_id, tag_id, studio_id)
);

-- Enable RLS
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_groups_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
DROP POLICY IF EXISTS "Owners can manage their studio tags" ON public.tags;
CREATE POLICY "Owners can manage their studio tags" ON public.tags
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.studios
            WHERE id = tags.studio_id
            AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.studios
            WHERE id = tags.studio_id
            AND owner_id = auth.uid()
        )
    );

-- RLS Policies for profile_tags
DROP POLICY IF EXISTS "Owners can manage their studio profile tags" ON public.profile_tags;
CREATE POLICY "Owners can manage their studio profile tags" ON public.profile_tags
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.studios
            WHERE id = profile_tags.studio_id
            AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.studios
            WHERE id = profile_tags.studio_id
            AND owner_id = auth.uid()
        )
    );

-- RLS Policies for pricing_groups_tags
DROP POLICY IF EXISTS "Owners can manage their studio pricing group tags" ON public.pricing_groups_tags;
CREATE POLICY "Owners can manage their studio pricing group tags" ON public.pricing_groups_tags
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.studios
            WHERE id = pricing_groups_tags.studio_id
            AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.studios
            WHERE id = pricing_groups_tags.studio_id
            AND owner_id = auth.uid()
        )
    );

-- Add updated_at trigger for tags
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_tags_updated_at
    BEFORE UPDATE ON public.tags
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
