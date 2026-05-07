-- Migration for Customer Stats View and Performance Indexes
-- This migration optimizes the CRM for large datasets and speeds up multi-location queries.

-- 1. Create a View for Customer Stats
-- This prevents fetching thousands of booking rows just to calculate 'total_bookings' and 'last_visit'
CREATE OR REPLACE VIEW customer_stats_view AS
SELECT 
    sc.studio_id,
    p.id AS profile_id,
    p.full_name,
    p.avatar_url,
    p.email,
    p.contact_number,
    sc.created_at AS joined_date,
    (SELECT COUNT(*) FROM bookings b WHERE b.client_id = p.id AND b.studio_id = sc.studio_id AND b.status IN ('approved', 'completed')) AS total_bookings,
    (SELECT MAX(s.date) FROM bookings b JOIN slots s ON b.slot_id = s.id WHERE b.client_id = p.id AND b.studio_id = sc.studio_id AND b.status IN ('approved', 'completed')) AS last_visit_date,
    (SELECT COUNT(*) FROM referrals r WHERE r.referrer_id = p.id AND r.studio_id = sc.studio_id) AS referral_count
FROM studio_customers sc
JOIN profiles p ON sc.profile_id = p.id;

-- 2. Performance Indexes
-- Composite index for multi-location calendar performance
CREATE INDEX IF NOT EXISTS idx_slots_outlet_date ON public.slots(outlet_id, date);

-- Index for studio_customers lookup
CREATE INDEX IF NOT EXISTS idx_studio_customers_studio_id ON public.studio_customers(studio_id);
CREATE INDEX IF NOT EXISTS idx_studio_customers_profile_id ON public.studio_customers(profile_id);

-- Index for referral counts
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON public.referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_studio_id ON public.referrals(studio_id);
