-- MEGA NUKE RLS RECURSION FIX (PHASE 2.6)
-- This script WIPE EVERY POLICY on affected tables to ensure NO recursion remains.
-- This is the definitive fix for the Admin Dashboard 500 error.

DO $$
DECLARE
    pol_rec record;
BEGIN
    -- 1. Loop through and DROP EVERY POLICY on the core dashboard tables
    FOR pol_rec IN 
        SELECT policyname, tablename, schemaname
        FROM pg_policies 
        WHERE schemaname = 'public' 
          AND tablename IN ('bookings', 'payout_requests', 'profiles', 'reviews', 'wallet_top_ups', 'support_tickets', 'support_messages', 'certifications', 'studios', 'slots')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol_rec.policyname, pol_rec.schemaname, pol_rec.tablename);
    END LOOP;

    -- 2. Also nuke EVERYTHING on Storage objects that might be recursive
    FOR pol_rec IN 
        SELECT policyname, tablename, schemaname
        FROM pg_policies 
        WHERE schemaname = 'storage' AND tablename = 'objects'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol_rec.policyname, pol_rec.schemaname, pol_rec.tablename);
    END LOOP;
END $$;

-- 3. REBUILD ONLY THE SAFE POLICIES

-- PROFILES: Everyone can view public parts, Admins can do everything
CREATE POLICY "Public profiles are viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Admins manage everything on profiles" ON public.profiles FOR ALL USING (public.check_is_admin());

-- BOOKINGS: Users see own, Admins see all
CREATE POLICY "Users view own bookings" ON public.bookings FOR SELECT USING (auth.uid() = client_id OR auth.uid() = instructor_id);
CREATE POLICY "Admins view all bookings" ON public.bookings FOR SELECT USING (public.check_is_admin());
CREATE POLICY "Admins update bookings" ON public.bookings FOR UPDATE USING (public.check_is_admin());

-- PAYOUTS
CREATE POLICY "Users view own payouts" ON public.payout_requests FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins manage payouts" ON public.payout_requests FOR ALL USING (public.check_is_admin());

-- WALLET
CREATE POLICY "Users view own topups" ON public.wallet_top_ups FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Admins manage topups" ON public.wallet_top_ups FOR ALL USING (public.check_is_admin());

-- STORAGE
CREATE POLICY "Public can view avatars" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "Admins can view all objects" ON storage.objects FOR SELECT USING (public.check_is_admin());
CREATE POLICY "Users can view own certs" ON storage.objects FOR SELECT USING (bucket_id = 'certifications' AND owner = auth.uid());

-- STUDIOS/SLOTS
CREATE POLICY "Public view studios" ON public.studios FOR SELECT USING (true);
CREATE POLICY "Public view slots" ON public.slots FOR SELECT USING (true);
CREATE POLICY "Admins manage studios" ON public.studios FOR ALL USING (public.check_is_admin());
CREATE POLICY "Admins manage slots" ON public.slots FOR ALL USING (public.check_is_admin());

-- SUPPORT
CREATE POLICY "Users manage own tickets" ON public.support_tickets FOR ALL USING (user_id = auth.uid());
CREATE POLICY "Admins manage all tickets" ON public.support_tickets FOR ALL USING (public.check_is_admin());
CREATE POLICY "Admins manage all support messages" ON public.support_messages FOR ALL USING (public.check_is_admin());
CREATE POLICY "Users can view messages for own tickets" ON public.support_messages FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_tickets WHERE id = ticket_id AND user_id = auth.uid())
);
