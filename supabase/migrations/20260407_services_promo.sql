-- Migration: Add Services and Promo Codes Tables
-- This aligns Studiovault with standard multi-field definitions for classes and discounts.

-- 1. Create services table
CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    sub_category TEXT,
    duration_minutes INTEGER DEFAULT 60,
    difficulty TEXT DEFAULT 'All Levels', -- e.g., Beginner, Intermediate, Advanced, All Levels
    media_urls JSONB DEFAULT '[]', -- List of image/video URLs
    requirements TEXT, -- "What to bring"
    pricing_type TEXT DEFAULT 'paid', -- paid, free
    is_visible_in_store BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    studio_id UUID REFERENCES studios(id) ON DELETE CASCADE,
    code TEXT NOT NULL,
    description TEXT,
    discount_type TEXT NOT NULL, -- percentage, fixed_amount
    discount_value DECIMAL(10, 2) NOT NULL,
    applies_to_type TEXT DEFAULT 'all', -- all, specific_plans, specific_services
    applicable_ids UUID[] DEFAULT '{}', -- List of membership/package/service IDs
    usage_limit INTEGER, -- NULL for unlimited
    current_usage INTEGER DEFAULT 0,
    starts_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(studio_id, code)
);

-- Enable RLS
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Policies for services
CREATE POLICY "Public read services" ON services FOR SELECT USING (true);
CREATE POLICY "Owner manage services" ON services
    FOR ALL USING (auth.uid() IN (
        SELECT owner_id FROM studios WHERE id = services.studio_id
    ));

-- Policies for promo_codes
CREATE POLICY "Public read promo_codes" ON promo_codes FOR SELECT USING (true);
CREATE POLICY "Owner manage promo_codes" ON promo_codes
    FOR ALL USING (auth.uid() IN (
        SELECT owner_id FROM studios WHERE id = promo_codes.studio_id
    ));
