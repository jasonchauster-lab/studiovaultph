-- Migration: Create platform_announcements table for dynamic dashboard notifications
CREATE TYPE announcement_type AS ENUM ('banner', 'sidebar_card');
CREATE TYPE announcement_target AS ENUM ('studio', 'instructor', 'all');

CREATE TABLE IF NOT EXISTS platform_announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    type announcement_type DEFAULT 'banner',
    target_role announcement_target DEFAULT 'all',
    is_active BOOLEAN DEFAULT false,
    action_label TEXT,
    action_url TEXT,
    video_url TEXT,
    icon_name TEXT DEFAULT 'Tag', -- Lucide icon name for sidebar cards
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

-- Policies
-- 1. Public (Authenticated) read active announcements
CREATE POLICY "Users can read active announcements" ON platform_announcements
    FOR SELECT USING (is_active = true);

-- 2. Admin full access
-- Assuming 'admin' role in profiles table
CREATE POLICY "Admins have full access to announcements" ON platform_announcements
    FOR ALL USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE role = 'admin'
        )
    );
