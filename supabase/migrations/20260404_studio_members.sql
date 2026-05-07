-- Create studio_members table for staff management
CREATE TABLE IF NOT EXISTS public.studio_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff', 'instructor')),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(studio_id, profile_id)
);

-- Enable RLS
ALTER TABLE public.studio_members ENABLE ROW LEVEL SECURITY;

-- Policies for studio_members
DROP POLICY IF EXISTS "Studio owners can manage members" ON public.studio_members;
DROP POLICY IF EXISTS "Members can view studio colleagues" ON public.studio_members;

-- 1. Studio owners can manage all members of their studio
CREATE POLICY "Studio owners can manage members" ON public.studio_members
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.studios
            WHERE id = studio_members.studio_id
            AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.studios
            WHERE id = studio_members.studio_id
            AND owner_id = auth.uid()
        )
    );

-- 2. Members can view other members of the same studio
DROP POLICY IF EXISTS "Members can view studio colleagues" ON public.studio_members;
CREATE POLICY "Members can view studio colleagues" ON public.studio_members
    FOR SELECT TO authenticated
    USING (public.check_studio_access(studio_id, auth.uid()));

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER trg_studio_members_updated_at
    BEFORE UPDATE ON public.studio_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Update studios RLS to allow members access to the dashboard
-- We need to modify existing policies for studios, slots, bookings etc.
-- For now, let's just make sure the studio_members table exists.
