-- Production Performance Tuning: Trigram Search & Routing Optimization
-- This migration adds specialized indexes for fuzzy searching and high-speed domain resolution.

-- 1. Enable pg_trgm for fuzzy text matching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. CRM Search Optimization
-- Dramatically speeds up searching for customers by name or email in the Studio CRM.
CREATE INDEX IF NOT EXISTS idx_profiles_search_trgm 
ON public.profiles USING gin (full_name gin_trgm_ops, email gin_trgm_ops);

-- 3. Studio Discovery Optimization
-- Speeds up searching for studios by name in the marketplace.
CREATE INDEX IF NOT EXISTS idx_studios_name_search_trgm 
ON public.studios USING gin (name gin_trgm_ops);

-- 4. Custom Domain Routing Optimization
-- Since middleware checks the custom_domain on every request, this partial index 
-- ensures that lookups are extremely fast and don't scan studios without domains.
CREATE INDEX IF NOT EXISTS idx_studios_custom_domain_lookup 
ON public.studios(custom_domain) 
WHERE custom_domain IS NOT NULL;

-- 5. Notification Performance
-- Speeds up fetching the "unread" count for the notification badge.
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
ON public.notifications(recipient_id) 
WHERE is_read = false;

-- 6. Audit & Activity Performance
-- Speeds up dashboard activity feeds that filter by studio.
CREATE INDEX IF NOT EXISTS idx_audit_logs_studio_created 
ON public.audit_logs(studio_id, created_at DESC);

-- 7. Payout Queue Performance
-- Speeds up the admin payout approval queue.
CREATE INDEX IF NOT EXISTS idx_payout_requests_pending_queue 
ON public.payout_requests(status) 
WHERE status = 'pending';

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
