-- ULTIMATE RLS RECURSION SWEEP (PHASE 2.3)
-- This script replaces EVERY remaining direct 'role = admin' check in the database
-- to eliminate the "server-side exception" (500) once and for all.

-- 1. FIX: Profiles table (The most common cause of recursion)
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.check_is_admin())
    WITH CHECK (public.check_is_admin());

-- 2. FIX: Wallet Top-ups
DROP POLICY IF EXISTS "Admins can do everything on top-ups" ON public.wallet_top_ups;
CREATE POLICY "Admins can do everything on top-ups"
    ON public.wallet_top_ups FOR ALL
    TO authenticated
    USING (public.check_is_admin())
    WITH CHECK (public.check_is_admin());

-- 3. FIX: Payout Requests
DROP POLICY IF EXISTS "Admins can view all payout requests" ON public.payout_requests;
CREATE POLICY "Admins can view all payout requests"
    ON public.payout_requests FOR SELECT
    TO authenticated
    USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can update payout requests" ON public.payout_requests;
CREATE POLICY "Admins can update payout requests"
    ON public.payout_requests FOR UPDATE
    TO authenticated
    USING (public.check_is_admin())
    WITH CHECK (public.check_is_admin());

-- 4. FIX: Reviews
DROP POLICY IF EXISTS "Admins have full access to reviews" ON public.reviews;
CREATE POLICY "Admins have full access to reviews"
    ON public.reviews FOR ALL
    TO authenticated
    USING (public.check_is_admin())
    WITH CHECK (public.check_is_admin());

-- 5. FIX: Slots (Admins need full access for management tools)
DROP POLICY IF EXISTS "Admins can all slots" ON public.slots;
CREATE POLICY "Admins can view and manage all slots"
    ON public.slots FOR ALL
    TO authenticated
    USING (public.check_is_admin())
    WITH CHECK (public.check_is_admin());

-- 6. FIX: Support Center (Redundant check just in case)
DROP POLICY IF EXISTS "Admins can view all tickets" ON public.support_tickets;
CREATE POLICY "Admins can view all tickets"
ON public.support_tickets FOR SELECT
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can update tickets" ON public.support_tickets;
CREATE POLICY "Admins can update tickets"
ON public.support_tickets FOR UPDATE
USING (public.check_is_admin());

DROP POLICY IF EXISTS "Admins can view all messages" ON public.support_messages;
CREATE POLICY "Admins can view all messages"
ON public.support_messages FOR SELECT
USING (public.check_is_admin());

-- 7. CLEANUP: Remove any other identified recursive leaks found in audit
-- These are often legacy or duplicate policies
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.check_is_admin())
    WITH CHECK (public.check_is_admin());

-- 8. STORAGE: Ensure admin can view everything in private buckets
DROP POLICY IF EXISTS "Admin can view all certifications" ON storage.objects;
CREATE POLICY "Admin can view all certifications"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'certifications' AND public.check_is_admin());

DROP POLICY IF EXISTS "Admin can view all payment proofs" ON storage.objects;
CREATE POLICY "Admin can view all payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs' AND public.check_is_admin());
