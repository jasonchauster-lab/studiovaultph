-- RESTORE USER PERMISSIONS (PHASE 2.7)
-- This script restores the ability for Studio Owners, Instructors, and Customers 
-- to manage their own records, while maintaining the recursion-free admin checks.

-- 1. STUDIOS: Restore owner management
DROP POLICY IF EXISTS "Admins manage studios" ON public.studios;
CREATE POLICY "Admins manage studios" ON public.studios FOR ALL TO authenticated USING (check_is_admin());

DROP POLICY IF EXISTS "Owners manage own studio" ON public.studios;
CREATE POLICY "Owners manage own studio" ON public.studios 
    FOR ALL TO authenticated 
    USING (auth.uid() = owner_id)
    WITH CHECK (auth.uid() = owner_id);

-- 2. SLOTS: Restore studio owner management
DROP POLICY IF EXISTS "Admins manage slots" ON public.slots;
CREATE POLICY "Admins manage slots" ON public.slots FOR ALL TO authenticated USING (check_is_admin());

-- Allow studio owners to manage slots for their own studios
DROP POLICY IF EXISTS "Studio owners manage own slots" ON public.slots;
CREATE POLICY "Studio owners manage own slots" ON public.slots
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.studios 
            WHERE id = slots.studio_id AND owner_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.studios 
            WHERE id = slots.studio_id AND owner_id = auth.uid()
        )
    );

-- 3. BOOKINGS: Restore participant viewing and management
DROP POLICY IF EXISTS "Users view own bookings" ON public.bookings;
CREATE POLICY "Users view own bookings" ON public.bookings 
    FOR SELECT TO authenticated 
    USING (
        auth.uid() = client_id OR 
        auth.uid() = instructor_id OR
        EXISTS (
            SELECT 1 FROM public.slots 
            JOIN public.studios ON slots.studio_id = studios.id
            WHERE slots.id = slot_id AND studios.owner_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS "Participants update relevant bookings" ON public.bookings;
CREATE POLICY "Participants update relevant bookings" ON public.bookings
    FOR UPDATE TO authenticated
    USING (
        auth.uid() = client_id OR 
        auth.uid() = instructor_id OR
        EXISTS (
            SELECT 1 FROM public.slots 
            JOIN public.studios ON slots.studio_id = studios.id
            WHERE slots.id = slot_id AND studios.owner_id = auth.uid()
        )
    );

-- 4. PAYOUT REQUESTS: Allow users to create their own requests
DROP POLICY IF EXISTS "Users view own payouts" ON public.payout_requests;
CREATE POLICY "Users view own payouts" ON public.payout_requests 
    FOR SELECT TO authenticated 
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users create own payout requests" ON public.payout_requests;
CREATE POLICY "Users create own payout requests" ON public.payout_requests
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- 5. WALLET TOP-UPS: Allow users to create their own top-ups
DROP POLICY IF EXISTS "Users view own topups" ON public.wallet_top_ups;
CREATE POLICY "Users view own topups" ON public.wallet_top_ups 
    FOR SELECT TO authenticated 
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users create own top-ups" ON public.wallet_top_ups;
CREATE POLICY "Users create own top-ups" ON public.wallet_top_ups
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users update own top-ups" ON public.wallet_top_ups;
CREATE POLICY "Users update own top-ups" ON public.wallet_top_ups
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- 6. CERTIFICATIONS: Allow instructors to manage their own certs
DROP POLICY IF EXISTS "Instructors manage own certifications" ON public.certifications;
CREATE POLICY "Instructors manage own certifications" ON public.certifications
    FOR ALL TO authenticated
    USING (instructor_id = auth.uid())
    WITH CHECK (instructor_id = auth.uid());

-- 7. PROFILES: Restore public visibility for search/booking flows
DROP POLICY IF EXISTS "Profiles are publicly viewable" ON public.profiles;
CREATE POLICY "Profiles are publicly viewable" ON public.profiles FOR SELECT TO authenticated USING (true);

-- 8. STORAGE: Allow users to upload and view their own documents
DROP POLICY IF EXISTS "Users can manage own certifications storage" ON storage.objects;
CREATE POLICY "Users can manage own certifications storage" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'certifications' AND owner = auth.uid())
    WITH CHECK (bucket_id = 'certifications' AND owner = auth.uid());

DROP POLICY IF EXISTS "Users can manage own payment-proofs storage" ON storage.objects;
CREATE POLICY "Users can manage own payment-proofs storage" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'payment-proofs' AND owner = auth.uid())
    WITH CHECK (bucket_id = 'payment-proofs' AND owner = auth.uid());

DROP POLICY IF EXISTS "Users can manage own waivers storage" ON storage.objects;
CREATE POLICY "Users can manage own waivers storage" ON storage.objects
    FOR ALL TO authenticated
    USING (bucket_id = 'waivers' AND (owner = auth.uid() OR public.check_is_admin()))
    WITH CHECK (bucket_id = 'waivers' AND (owner = auth.uid() OR public.check_is_admin()));

-- Refresh schema
NOTIFY pgrst, 'reload schema';
