-- Performance Optimization: Add missing database indexes
-- These indexes dramatically speed up the most frequent queries across the platform.

-- ── bookings ──────────────────────────────────────────────────────────────
-- Admin page, customer bookings page, instructor dashboard all filter by status
CREATE INDEX IF NOT EXISTS idx_bookings_status ON public.bookings(status);

-- Customer bookings page: .eq('client_id', user.id)
CREATE INDEX IF NOT EXISTS idx_bookings_client_id ON public.bookings(client_id);

-- Instructor dashboard: .eq('instructor_id', user.id)
CREATE INDEX IF NOT EXISTS idx_bookings_instructor_id ON public.bookings(instructor_id);

-- Composite index for the most common query: bookings by client + status
CREATE INDEX IF NOT EXISTS idx_bookings_client_status ON public.bookings(client_id, status);

-- ── slots ──────────────────────────────────────────────────────────────────
-- Calendar views heavily filter by date
CREATE INDEX IF NOT EXISTS idx_slots_date ON public.slots(date);

-- Studio calendar: .eq('studio_id', studio.id)  
CREATE INDEX IF NOT EXISTS idx_slots_studio_id ON public.slots(studio_id);

-- ── profiles ──────────────────────────────────────────────────────────────
-- Admin Customers tab + negative balance query: .eq('role', ...)
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Suspended studios query: .eq('is_suspended', true)
CREATE INDEX IF NOT EXISTS idx_profiles_is_suspended ON public.profiles(is_suspended) WHERE is_suspended = true;

-- Negative balance instructors: .lt('available_balance', 0)
CREATE INDEX IF NOT EXISTS idx_profiles_available_balance ON public.profiles(available_balance);

-- ── payout_requests ───────────────────────────────────────────────────────
-- All payout queries filter by status = 'pending'
CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON public.payout_requests(status);

-- Instructor payout queries: .not('instructor_id', 'is', null)
CREATE INDEX IF NOT EXISTS idx_payout_requests_instructor_id ON public.payout_requests(instructor_id);

-- Studio payout queries: .not('studio_id', 'is', null)
CREATE INDEX IF NOT EXISTS idx_payout_requests_studio_id ON public.payout_requests(studio_id);

-- User/customer payout queries
CREATE INDEX IF NOT EXISTS idx_payout_requests_user_id ON public.payout_requests(user_id);

-- ── certifications ────────────────────────────────────────────────────────
-- Admin verification queue: .eq('verified', false)
CREATE INDEX IF NOT EXISTS idx_certifications_verified ON public.certifications(verified) WHERE verified = false;

-- Instructor dashboard check: .eq('instructor_id', user.id)
CREATE INDEX IF NOT EXISTS idx_certifications_instructor_id ON public.certifications(instructor_id);

-- ── studios ───────────────────────────────────────────────────────────────
-- Admin verification queue: .eq('verified', false)
CREATE INDEX IF NOT EXISTS idx_studios_verified ON public.studios(verified) WHERE verified = false;

-- Studio payout setup queue: .eq('payout_approval_status', 'pending')
CREATE INDEX IF NOT EXISTS idx_studios_payout_status ON public.studios(payout_approval_status);

-- Studio lookup by owner: .eq('owner_id', ...)
CREATE INDEX IF NOT EXISTS idx_studios_owner_id ON public.studios(owner_id);

-- ── admin_activity_logs ───────────────────────────────────────────────────
-- Reports tab fetches 500 rows ordered by created_at DESC
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON public.admin_activity_logs(created_at DESC);

-- Filter by admin_id in joins
CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_admin_id ON public.admin_activity_logs(admin_id);

-- ── wallet_top_ups ────────────────────────────────────────────────────────
-- Already has idx_wallet_top_ups_user_id and idx_wallet_top_ups_status
-- Adding composite for the pending top_up query: status + type
CREATE INDEX IF NOT EXISTS idx_wallet_top_ups_status_type ON public.wallet_top_ups(status, type);
