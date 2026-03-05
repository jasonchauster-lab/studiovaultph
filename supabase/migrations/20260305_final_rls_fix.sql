-- COMPREHENSIVE RLS RECURSION FIX
-- This script replaces all recursive 'role = admin' checks with a safe SECURITY DEFINER function.

-- 1. Ensure the helper function exists and is safe
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. FIX BOOKINGS
DROP POLICY IF EXISTS "Interested parties can view bookings" ON public.bookings;
CREATE POLICY "Interested parties can view bookings"
    ON public.bookings FOR SELECT
    TO authenticated
    USING (
        auth.uid() = client_id OR 
        auth.uid() = instructor_id OR
        EXISTS (
            SELECT 1 FROM public.slots s
            JOIN public.studios st ON s.studio_id = st.id
            WHERE s.id = bookings.slot_id AND st.owner_id = auth.uid()
        ) OR
        public.check_is_admin() -- Safe check
    );

-- 3. FIX PROFILES (Re-asserting the fix for all policies)
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.check_is_admin());

-- 4. FIX WALLET TOP-UPS
DROP POLICY IF EXISTS "Users can view own topups" ON public.wallet_top_ups;
CREATE POLICY "Users can view own topups"
    ON public.wallet_top_ups FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR public.check_is_admin());

-- 5. FIX PAYOUT REQUESTS
DROP POLICY IF EXISTS "Users can view own payouts" ON public.payout_requests;
CREATE POLICY "Users can view own payouts"
    ON public.payout_requests FOR SELECT
    TO authenticated
    USING (
        auth.uid() = instructor_id OR 
        EXISTS (
            SELECT 1 FROM public.studios 
            WHERE id = payout_requests.studio_id AND owner_id = auth.uid()
        ) OR
        public.check_is_admin()
    );

-- 6. FIX STORAGE OBJECTS
DROP POLICY IF EXISTS "Users can only view their own payment proofs" ON storage.objects;
CREATE POLICY "Users can only view their own payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'payment-proofs' AND (
        owner = auth.uid() OR
        public.check_is_admin()
    )
);

DROP POLICY IF EXISTS "Users can only view their own certifications" ON storage.objects;
CREATE POLICY "Users can only view their own certifications"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'certifications' AND (
        owner = auth.uid() OR
        public.check_is_admin()
    )
);

DROP POLICY IF EXISTS "Admin can view all waivers" ON storage.objects;
CREATE POLICY "Admin can view all waivers"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'waivers' AND
    public.check_is_admin()
);

DROP POLICY IF EXISTS "Admin can view all certifications" ON storage.objects;
CREATE POLICY "Admin can view all certifications"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'certifications' AND
    public.check_is_admin()
);

DROP POLICY IF EXISTS "Admin can view all payment proofs" ON storage.objects;
CREATE POLICY "Admin can view all payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'payment-proofs' AND
    public.check_is_admin()
);
