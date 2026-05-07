-- Migration: 20260414_create_studio_taxes.sql

-- 1. Add tax_inclusive toggle to studios
ALTER TABLE studios ADD COLUMN IF NOT EXISTS tax_inclusive BOOLEAN DEFAULT false;

-- 2. Create studio_taxes table
CREATE TABLE IF NOT EXISTS studio_taxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    studio_id UUID NOT NULL REFERENCES studios(id) ON DELETE CASCADE,
    country TEXT NOT NULL,
    name TEXT NOT NULL,
    percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
    registration_number TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE studio_taxes ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies
DROP POLICY IF EXISTS "Owners can manage studio taxes" ON studio_taxes;
DROP POLICY IF EXISTS "Staff can manage studio taxes" ON studio_taxes;
DROP POLICY IF EXISTS "Owners can view studio taxes" ON studio_taxes;
DROP POLICY IF EXISTS "Owners can insert studio taxes" ON studio_taxes;
DROP POLICY IF EXISTS "Owners can update studio taxes" ON studio_taxes;
DROP POLICY IF EXISTS "Owners can delete studio taxes" ON studio_taxes;
DROP POLICY IF EXISTS "Staff can view studio taxes" ON studio_taxes;
DROP POLICY IF EXISTS "Staff can insert studio taxes" ON studio_taxes;
DROP POLICY IF EXISTS "Staff can update studio taxes" ON studio_taxes;
DROP POLICY IF EXISTS "Staff can delete studio taxes" ON studio_taxes;

-- Granular policies for owners
CREATE POLICY "Owners can view studio taxes"
    ON studio_taxes FOR SELECT
    USING (EXISTS (SELECT 1 FROM studios s WHERE s.id = studio_taxes.studio_id AND s.owner_id = auth.uid()));

CREATE POLICY "Owners can insert studio taxes"
    ON studio_taxes FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM studios s WHERE s.id = studio_id AND s.owner_id = auth.uid()));

CREATE POLICY "Owners can update studio taxes"
    ON studio_taxes FOR UPDATE
    USING (EXISTS (SELECT 1 FROM studios s WHERE s.id = studio_taxes.studio_id AND s.owner_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM studios s WHERE s.id = studio_taxes.studio_id AND s.owner_id = auth.uid()));

CREATE POLICY "Owners can delete studio taxes"
    ON studio_taxes FOR DELETE
    USING (EXISTS (SELECT 1 FROM studios s WHERE s.id = studio_taxes.studio_id AND s.owner_id = auth.uid()));

-- Granular policies for staff
CREATE POLICY "Staff can view studio taxes"
    ON studio_taxes FOR SELECT
    USING (public.check_studio_access(studio_id, auth.uid(), ARRAY['owner', 'manager', 'admin']));

CREATE POLICY "Staff can insert studio taxes"
    ON studio_taxes FOR INSERT
    WITH CHECK (public.check_studio_access(studio_id, auth.uid(), ARRAY['owner', 'manager', 'admin']));

CREATE POLICY "Staff can update studio taxes"
    ON studio_taxes FOR UPDATE
    USING (public.check_studio_access(studio_id, auth.uid(), ARRAY['owner', 'manager', 'admin']))
    WITH CHECK (public.check_studio_access(studio_id, auth.uid(), ARRAY['owner', 'manager', 'admin']));

CREATE POLICY "Staff can delete studio taxes"
    ON studio_taxes FOR DELETE
    USING (public.check_studio_access(studio_id, auth.uid(), ARRAY['owner', 'manager', 'admin']));

-- 5. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_studio_taxes_updated_at ON studio_taxes;
CREATE TRIGGER update_studio_taxes_updated_at
    BEFORE UPDATE ON studio_taxes
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();
