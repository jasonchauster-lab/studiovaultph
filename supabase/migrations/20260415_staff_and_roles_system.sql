-- Migration: Staff and Roles System Expansion
-- Description: Adds custom roles and rich staff metadata tracking

-- 1. Create studio_roles table
CREATE TABLE IF NOT EXISTS public.studio_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES public.studios(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'custom' CHECK (type IN ('system', 'custom')),
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    permissions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(studio_id, name)
);

-- 2. Add metadata and invited_by_id to studio_members
ALTER TABLE public.studio_members 
ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS invited_by_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Loosen the role check constraint on studio_members
-- First find the constraint name. In the 20240404 migration it was inline.
-- We'll drop it if it exists and add a more flexible one or just allow any text 
-- for now since we'll be using studio_roles names or system roles.
ALTER TABLE public.studio_members DROP CONSTRAINT IF EXISTS studio_members_role_check;

-- 4. Enable RLS for studio_roles
ALTER TABLE public.studio_roles ENABLE ROW LEVEL SECURITY;

-- 5. Policies for studio_roles
DROP POLICY IF EXISTS "Owners can manage studio roles" ON public.studio_roles;
CREATE POLICY "Owners can manage studio roles" ON public.studio_roles
    FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.studios WHERE id = studio_roles.studio_id AND owner_id = auth.uid()));

DROP POLICY IF EXISTS "Members can view studio roles" ON public.studio_roles;
CREATE POLICY "Members can view studio roles" ON public.studio_roles
    FOR SELECT TO authenticated
    USING (public.check_studio_access(studio_id, auth.uid()));

-- 6. Insert default system roles for existing studios
INSERT INTO public.studio_roles (studio_id, name, type)
SELECT id, 'Admin', 'system' FROM public.studios
ON CONFLICT (studio_id, name) DO NOTHING;

INSERT INTO public.studio_roles (studio_id, name, type)
SELECT id, 'Instructor', 'system' FROM public.studios
ON CONFLICT (studio_id, name) DO NOTHING;

-- 7. Add updated_at trigger for studio_roles
CREATE TRIGGER trg_studio_roles_updated_at
    BEFORE UPDATE ON public.studio_roles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
