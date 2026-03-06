-- ==========================================
-- FINAL ADMIN DASHBOARD STABILITY FIX
-- 1. Corrects Payout Requests Schema (FKey mismatch)
-- 2. Restores Safe RLS Policies (Recursion-free)
-- ==========================================

-- ── 1. SCHEMA FIX: PAYOUT_REQUESTS ───────────────────────────────────
-- The current FKeys point to auth.users, which prevents joining to profiles in PostgREST.

-- Drop old constraints (pointing to auth.users)
ALTER TABLE IF EXISTS public.payout_requests 
DROP CONSTRAINT IF EXISTS payout_requests_instructor_id_fkey,
DROP CONSTRAINT IF EXISTS payout_requests_user_id_fkey;

-- Add correct constraints (pointing to public.profiles)
ALTER TABLE public.payout_requests
ADD CONSTRAINT payout_requests_instructor_id_fkey 
    FOREIGN KEY (instructor_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD CONSTRAINT payout_requests_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ── 2. ENSURE SECURITY DEFINER FUNCTIONS ─────────────────────────────
-- Must be owned by postgres to bypass RLS internally.

CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  RETURN (
    SELECT (role = 'admin')
    FROM public.profiles
    WHERE id = auth.uid()
  );
END;
$$;

ALTER FUNCTION public.check_is_admin() OWNER TO postgres;

-- ── 3. REINSTALL SAFE POLICIES (CLEAN SLATE) ─────────────────────────

DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'profiles', 'bookings', 'payout_requests', 'wallet_top_ups', 
        'admin_activity_logs', 'studios', 'certifications'
    ]) LOOP
        -- Drop all naming variations of admin policies to avoid conflicts
        EXECUTE format('DROP POLICY IF EXISTS "Admins can view all" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Admins can manage all" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Admins can view all private objects" ON public.%I', t);
        EXECUTE format('DROP POLICY IF EXISTS "Admin Full Access" ON public.%I', t);
        
        -- Create the single, definitive safe policy
        EXECUTE format('CREATE POLICY "Admin Full Access" ON public.%I FOR ALL TO authenticated USING (check_is_admin())', t);
    END LOOP;
END $$;

-- ── 4. SPECIFIC FIX FOR PROFILES TABLE ──────────────────────────────
-- profiles needs a specific policy for users to view their own profile safely.

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- ── 5. SPECIFIC FIX FOR ACTIVITY LOGS ────────────────────────────────
-- Admin activity logs should ONLY be visible to admins. (Handled by loop above)
ALTER TABLE public.admin_activity_logs ENABLE ROW LEVEL SECURITY;

-- ── 6. ENSURE RLS IS ENABLED ─────────────────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_top_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- ── 7. REFRESH SCHEMA CACHING ────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
