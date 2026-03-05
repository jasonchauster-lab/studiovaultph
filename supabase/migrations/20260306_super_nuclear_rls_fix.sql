-- SUPER NUCLEAR RLS RECURSION FIX (PHASE 2.5)
-- This script uses a robust PL/pgSQL loop to find and destroy ALL recursive policies.
-- It addresses naming variations (Admin vs Admins) and hidden subqueries.

DO $$
DECLARE
    pol_cmd text;
BEGIN
    -- 1. Search and DESTROY every policy that has a recursive 'profiles' check
    -- or matches 'Admin' naming patterns on the core dashboard tables.
    FOR pol_cmd IN 
        SELECT 'DROP POLICY IF EXISTS "' || policyname || '" ON ' || schemaname || '.' || tablename
        FROM pg_policies 
        WHERE (policyname ILIKE '%Admin%' OR qual ILIKE '%profiles%' OR with_check ILIKE '%profiles%')
          AND schemaname = 'public'
          AND tablename IN ('bookings', 'payout_requests', 'profiles', 'reviews', 'wallet_top_ups', 'support_tickets', 'support_messages', 'certifications', 'studios', 'slots')
    LOOP
        EXECUTE pol_cmd;
    END LOOP;

    -- 2. Also nuke specific Storage policies that might be recursive
    DROP POLICY IF EXISTS "Admins can view waivers" ON storage.objects;
    DROP POLICY IF EXISTS "Admin can view all certifications" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can view all certifications" ON storage.objects;
    DROP POLICY IF EXISTS "Admin can view all payment proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can view all payment proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Users can only view their own certifications" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view their own certifications" ON storage.objects;
    DROP POLICY IF EXISTS "Users can only view their own payment proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Users can view their own payment proofs" ON storage.objects;
    DROP POLICY IF EXISTS "Admin can view all private objects" ON storage.objects;
    DROP POLICY IF EXISTS "Admins can view all private objects" ON storage.objects;
END $$;

-- 3. REBUILD all Admin policies safely using the helper function
-- This helper bypasses RLS because it is SECURITY DEFINER.

-- Bookings
CREATE POLICY "Admins can view all bookings" ON public.bookings FOR SELECT TO authenticated USING (public.check_is_admin());
CREATE POLICY "Admins can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (public.check_is_admin());

-- Payouts
CREATE POLICY "Admins manage all payouts" ON public.payout_requests FOR ALL TO authenticated USING (public.check_is_admin());

-- Profiles
CREATE POLICY "Admins manage all profiles" ON public.profiles FOR ALL TO authenticated USING (public.check_is_admin());

-- Wallet
CREATE POLICY "Admins manage all topups" ON public.wallet_top_ups FOR ALL TO authenticated USING (public.check_is_admin());

-- Storage (Waivers/Certs/Proofs)
CREATE POLICY "Admins can view all private objects" ON storage.objects FOR SELECT TO authenticated USING (public.check_is_admin());

-- Certifications/Studios/Slots
CREATE POLICY "Admins view all certifications" ON public.certifications FOR SELECT TO authenticated USING (public.check_is_admin());
CREATE POLICY "Admins view all studios" ON public.studios FOR SELECT TO authenticated USING (public.check_is_admin());
CREATE POLICY "Admins manage all slots" ON public.slots FOR ALL TO authenticated USING (public.check_is_admin());

-- Support System
CREATE POLICY "Admins manage tickets" ON public.support_tickets FOR ALL TO authenticated USING (public.check_is_admin());
CREATE POLICY "Admins manage messages" ON public.support_messages FOR ALL TO authenticated USING (public.check_is_admin());
