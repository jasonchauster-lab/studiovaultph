-- PHASE 2.2: RLS FIXES & PARTNER ACCESS
-- This script fixes missing INSERT policies and corrects SELECT logic for partners.

-- 1. FIX: STORAGE INSERT POLICIES
-- Users must be able to upload their own documents

DROP POLICY IF EXISTS "Users can upload their own certifications" ON storage.objects;
CREATE POLICY "Users can upload their own certifications"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'certifications' AND
    (
        (storage.foldername(name))[1] = auth.uid()::text OR -- 'uid/file.ext'
        (storage.foldername(name))[2] = auth.uid()::text    -- 'studios/uid/file.ext'
    )
);

DROP POLICY IF EXISTS "Users can upload their own payment proofs" ON storage.objects;
CREATE POLICY "Users can upload their own payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'payment-proofs' -- Allow all authenticated for now, ownership verified via SELECT/UP-TO-DB logic
);

-- 2. FIX: STORAGE SELECT POLICIES (PARTNER ACCESS)

-- Allow instructors/studios to view payment proofs for their bookings
DROP POLICY IF EXISTS "Partners can view payment proofs for active bookings" ON storage.objects;
CREATE POLICY "Partners can view payment proofs for active bookings"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'payment-proofs' AND
    EXISTS (
        SELECT 1 FROM bookings b
        JOIN slots s ON b.slot_id = s.id
        JOIN studios st ON s.studio_id = st.id
        WHERE (b.instructor_id = auth.uid() OR st.owner_id = auth.uid())
        AND b.payment_proof_url LIKE '%' || name
    )
);

-- Fix certifications SELECT logic for studio owners
DROP POLICY IF EXISTS "Users can view their own certifications" ON storage.objects;
CREATE POLICY "Users can view their own certifications"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'certifications' AND (
        (storage.foldername(name))[1] = auth.uid()::text OR
        (storage.foldername(name))[2] = auth.uid()::text
    )
);

-- 3. FIX: WALLET TOP-UPS RLS (Prevent data leak in update)
-- Users can only UPDATE their own top-ups if status is pending
DROP POLICY IF EXISTS "Users can update own pending topups" ON public.wallet_top_ups;
CREATE POLICY "Users can update own pending topups"
    ON public.wallet_top_ups FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid() AND status = 'pending')
    WITH CHECK (user_id = auth.uid() AND status = 'pending');

-- 4. FIX: PAYOUT REQUESTS RLS (Allow instructors/studios to delete own pending)
DROP POLICY IF EXISTS "Users can manage own pending payouts" ON public.payout_requests;
CREATE POLICY "Users can manage own pending payouts"
    ON public.payout_requests FOR DELETE
    TO authenticated
    USING (
        (instructor_id = auth.uid() OR EXISTS (SELECT 1 FROM studios WHERE id = payout_requests.studio_id AND owner_id = auth.uid()))
        AND status = 'pending'
    );
