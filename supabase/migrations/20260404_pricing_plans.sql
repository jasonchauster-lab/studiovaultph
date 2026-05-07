-- Migration: Add Pricing Plans (Memberships & Packages)
-- This follows the standard pricing model where plans are managed separately and then listed on the storefront.

-- 1. Create memberships table
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    credits INTEGER, -- Number of sessions included (NULL for unlimited)
    validity_days INTEGER, -- e.g., 30 for 1 month
    is_private BOOLEAN DEFAULT false, -- If true, won't show on public site
    features JSONB DEFAULT '[]', -- List of features/bullets
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create packages table
CREATE TABLE IF NOT EXISTS packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    credits INTEGER NOT NULL, -- Number of sessions
    validity_days INTEGER, -- e.g., 90 for 3 months
    is_private BOOLEAN DEFAULT false,
    features JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read memberships" ON memberships FOR SELECT USING (true);
CREATE POLICY "Public read packages" ON packages FOR SELECT USING (true);

CREATE POLICY "Owner manage memberships" ON memberships
    FOR ALL USING (auth.uid() IN (
        SELECT owner_id FROM studios WHERE id = memberships.studio_id
    ));

CREATE POLICY "Owner manage packages" ON packages
    FOR ALL USING (auth.uid() IN (
        SELECT owner_id FROM studios WHERE id = packages.studio_id
    ));
