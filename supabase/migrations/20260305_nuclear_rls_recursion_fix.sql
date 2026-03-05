-- FINAL NUCLEAR RLS RECURSION FIX (PHASE 2.4)
-- This script uses a "nuke and rebuild" approach for every problematic table
-- to ensure NO residual recursive policies remain.

-- 1. BOOKINGS TABLE (Major cause of Dashboard hang)
DO $$ 
BEGIN
    -- Drop EVERY policy on bookings starting with 'Admin' or 'Admins'
    PERFORM (
        SELECT string_agg('DROP POLICY IF EXISTS "' || policyname || '" ON public.bookings;', ' ')
        FROM pg_policies 
        WHERE tablename = 'bookings' AND policyname ILIKE '%Admin%'
    );
END $$;

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings"
    ON public.bookings FOR SELECT
    TO authenticated
    USING (public.check_is_admin());

-- 2. STORAGE OBJECTS (Private bucket recursion)
DROP POLICY IF EXISTS "Admins can view waivers" ON storage.objects;
DROP POLICY IF EXISTS "Admin can view all certifications" ON storage.objects;
DROP POLICY IF EXISTS "Admin can view all payment proofs" ON storage.objects;
DROP POLICY IF EXISTS "Users can only view their own certifications" ON storage.objects;
DROP POLICY IF EXISTS "Users can only view their own payment proofs" ON storage.objects;

-- Rebuild Storage Policies safely
CREATE POLICY "Admins can view all private objects"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (public.check_is_admin());

CREATE POLICY "Users can only view their own certifications"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'certifications' AND ((owner = auth.uid()) OR public.check_is_admin()));

CREATE POLICY "Users can only view their own payment proofs"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'payment-proofs' AND ((owner = auth.uid()) OR public.check_is_admin()));

-- 3. PAYOUT REQUESTS
DROP POLICY IF EXISTS "Admins can view all payout requests" ON public.payout_requests;
DROP POLICY IF EXISTS "Admins can update payout requests" ON public.payout_requests;

CREATE POLICY "Admins can manage all payouts"
    ON public.payout_requests FOR ALL
    TO authenticated
    USING (public.check_is_admin())
    WITH CHECK (public.check_is_admin());

-- 4. REVIEWS
DROP POLICY IF EXISTS "Admins have full access to reviews" ON public.reviews;
CREATE POLICY "Admins manage reviews"
    ON public.reviews FOR ALL
    TO authenticated
    USING (public.check_is_admin())
    WITH CHECK (public.check_is_admin());

-- 5. WALLET TOP-UPS
DROP POLICY IF EXISTS "Admins can do everything on top-ups" ON public.wallet_top_ups;
CREATE POLICY "Admins manage top-ups"
    ON public.wallet_top_ups FOR ALL
    TO authenticated
    USING (public.check_is_admin())
    WITH CHECK (public.check_is_admin());

-- 6. CERTIFICATIONS TABLE (NOT STORAGE)
DROP POLICY IF EXISTS "Admins can view all certifications" ON public.certifications;
CREATE POLICY "Admins view certs"
    ON public.certifications FOR SELECT
    TO authenticated
    USING (public.check_is_admin());
