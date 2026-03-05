-- Migration: Phase 2 RLS Lockdown
-- Date: 2026-03-05

-- ==========================================
-- 1. PROFILES Table Security
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to start fresh
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
DROP POLICY IF EXISTS "Public can view instructor and studio profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own full profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Partners can view client profiles for active bookings" ON public.profiles;
DROP POLICY IF EXISTS "Admins have full access to profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;

-- Policy: Everyone (Anon + Auth) can view minimal instructor/studio details
CREATE POLICY "Public can view instructor and studio profiles"
    ON public.profiles FOR SELECT
    USING (role IN ('instructor', 'studio'));

-- Policy: Authenticated users can see their own full profile
CREATE POLICY "Users can view own full profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

-- Policy: Users can update their own profile
CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy: Instructors and studios can view profiles of clients who have booked their slots
CREATE POLICY "Partners can view client profiles for active bookings"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.bookings b
            LEFT JOIN public.slots s ON b.slot_id = s.id
            LEFT JOIN public.studios st ON s.studio_id = st.id
            WHERE b.client_id = public.profiles.id
            AND (b.instructor_id = auth.uid() OR st.owner_id = auth.uid())
        )
    );

-- Policy: Admins can do everything
CREATE POLICY "Admins have full access to profiles"
    ON public.profiles FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ==========================================
-- 2. BOOKINGS Table Security
-- ==========================================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
DROP POLICY IF EXISTS "Instructors can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Studio owners can view their bookings" ON public.bookings;
DROP POLICY IF EXISTS "Interested parties can view bookings" ON public.bookings;

-- Policy: Related parties can view the booking
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
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- ==========================================
-- 3. SLOTS & AVAILABILITY
-- ==========================================
ALTER TABLE public.slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.instructor_availability ENABLE ROW LEVEL SECURITY;

-- Slots are viewable by all authenticated users (to book)
DROP POLICY IF EXISTS "Slots are viewable by everyone" ON public.slots;
DROP POLICY IF EXISTS "Authenticated users can view slots" ON public.slots;
CREATE POLICY "Authenticated users can view slots"
    ON public.slots FOR SELECT
    TO authenticated
    USING (true);

-- Only studio owners can manage their slots
DROP POLICY IF EXISTS "Studio owners can manage their slots" ON public.slots;
CREATE POLICY "Studio owners can manage their slots"
    ON public.slots FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.studios 
            WHERE id = slots.studio_id AND owner_id = auth.uid()
        )
    );

-- Instructor Availability
DROP POLICY IF EXISTS "Authenticated users can view instructor availability" ON public.instructor_availability;
CREATE POLICY "Authenticated users can view instructor availability"
    ON public.instructor_availability FOR SELECT
    TO authenticated
    USING (true);

DROP POLICY IF EXISTS "Instructors can manage their own availability" ON public.instructor_availability;
CREATE POLICY "Instructors can manage their own availability"
    ON public.instructor_availability FOR ALL
    TO authenticated
    USING (auth.uid() = instructor_id);

-- ==========================================
-- 4. FINANCIAL TABLES (Top-ups, Payouts)
-- ==========================================
ALTER TABLE public.wallet_top_ups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payout_requests ENABLE ROW LEVEL SECURITY;

-- Wallet Top-ups: Owner and Admin only
DROP POLICY IF EXISTS "Users can view own topups" ON public.wallet_top_ups;
CREATE POLICY "Users can view own topups"
    ON public.wallet_top_ups FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Payout Requests: Owner and Admin only
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
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- ==========================================
-- 5. STUDIOS
-- ==========================================
ALTER TABLE public.studios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view studios" ON public.studios;
CREATE POLICY "Public can view studios"
    ON public.studios FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Owners can manage their studios" ON public.studios;
CREATE POLICY "Owners can manage their studios"
    ON public.studios FOR ALL
    TO authenticated
    USING (owner_id = auth.uid());

-- ==========================================
-- 6. STORAGE (Buckets and Objects)
-- ==========================================
-- Note: This requires the storage schema extensions to be enabled.

-- 6a. Ensure Buckets are Private (Best done via Dashboard, but we can set up policies)
-- The following policies apply to the storage.objects table.

-- Payment Proofs: Owner and Admin only
DROP POLICY IF EXISTS "Users can only view their own payment proofs" ON storage.objects;
CREATE POLICY "Users can only view their own payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'payment-proofs' AND (
        owner = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
);

-- Certifications: Owner and Admin only
DROP POLICY IF EXISTS "Users can only view their own certifications" ON storage.objects;
CREATE POLICY "Users can only view their own certifications"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'certifications' AND (
        owner = auth.uid() OR
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    )
);

-- Avatars: Publicly viewable, owner-writable
DROP POLICY IF EXISTS "Avatars are publicly viewable" ON storage.objects;
CREATE POLICY "Avatars are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

DROP POLICY IF EXISTS "Users can manage their own avatars" ON storage.objects;
CREATE POLICY "Users can manage their own avatars"
ON storage.objects FOR ALL
TO authenticated
USING (
    bucket_id = 'avatars' AND owner = auth.uid()
);
