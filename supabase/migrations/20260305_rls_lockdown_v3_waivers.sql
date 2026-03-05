-- PHASE 2.1: STORAGE LOCKDOWN (WAIVERS)
-- This script secures the 'waivers' bucket and ensures sensitive documents are private.

-- 1. Ensure 'waivers' bucket exists and is private
INSERT INTO storage.buckets (id, name, public) 
VALUES ('waivers', 'waivers', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- 2. LOCK DOWN PUBLIC ACCESS (Just in case)
-- No public access should be allowed for sensitive buckets
UPDATE storage.buckets SET public = false WHERE id IN ('payment-proofs', 'certifications', 'waivers');

-- 3. RLS POLICIES FOR 'waivers' BUCKET

-- Policy: Users can upload their own waivers
-- Format expected: waivers/{user_id}/filename.pdf
DROP POLICY IF EXISTS "Users can upload their own waivers" ON storage.objects;
CREATE POLICY "Users can upload their own waivers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'waivers' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own waivers
DROP POLICY IF EXISTS "Users can view their own waivers" ON storage.objects;
CREATE POLICY "Users can view their own waivers"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'waivers' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Admin can view all waivers
DROP POLICY IF EXISTS "Admin can view all waivers" ON storage.objects;
CREATE POLICY "Admin can view all waivers"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'waivers' AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role = 'admin'
    )
);

-- Policy: Instructors/Studios can view client waivers if there's a booking
-- This allows partners to check waivers for clients they are actually serving.
DROP POLICY IF EXISTS "Partners can view client waivers for active bookings" ON storage.objects;
CREATE POLICY "Partners can view client waivers for active bookings"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'waivers' AND
    EXISTS (
        SELECT 1 FROM bookings b
        JOIN slots s ON b.slot_id = s.id
        JOIN studios st ON s.studio_id = st.id
        WHERE (b.instructor_id = auth.uid() OR st.owner_id = auth.uid())
        AND b.client_id::text = (storage.foldername(storage.objects.name))[1]
        AND b.status IN ('approved', 'completed')
    )
);

-- 4. RE-ASSERT 'payment-proofs' and 'certifications' POLICIES (Idempotent)
-- (Ensuring we haven't missed anything from the previous migration)

DROP POLICY IF EXISTS "Users can view their own certifications" ON storage.objects;
CREATE POLICY "Users can view their own certifications"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'certifications' AND
    (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "Admin can view all certifications" ON storage.objects;
CREATE POLICY "Admin can view all certifications"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'certifications' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);

DROP POLICY IF EXISTS "Users can view their own payment proofs" ON storage.objects;
CREATE POLICY "Users can view their own payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'payment-proofs' AND
    EXISTS (
        SELECT 1 FROM wallet_top_ups wtu WHERE wtu.user_id = auth.uid() AND wtu.payment_proof_url LIKE '%' || name
        UNION
        SELECT 1 FROM bookings b WHERE b.client_id = auth.uid() AND b.payment_proof_url LIKE '%' || name
    )
);

DROP POLICY IF EXISTS "Admin can view all payment proofs" ON storage.objects;
CREATE POLICY "Admin can view all payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'payment-proofs' AND
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
);
