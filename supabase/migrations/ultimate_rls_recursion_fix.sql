-- ==========================================
-- ULTIMATE NON-RECURSIVE ADMIN FIX
-- Breaks the RLS loop by using Metadata
-- ==========================================

-- 1. Redefine check_is_admin to query auth.users directly.
-- Since auth.users does not have public RLS, this is non-recursive.
-- SECURITY DEFINER allows accessing the 'auth' schema.
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  u_role text;
BEGIN
  -- Query role from metadata in auth.users
  -- This is SAFE and NON-RECURSIVE because it does not touch the 'profiles' table.
  SELECT (raw_user_meta_data ->> 'role') INTO u_role
  FROM auth.users
  WHERE id = auth.uid();
  
  RETURN COALESCE(u_role, '') = 'admin';
END;
$$;

ALTER FUNCTION public.check_is_admin() OWNER TO postgres;

-- 2. Re-apply the 'Admin Full Access' policy to core tables.
-- Now that check_is_admin() is non-recursive, these will work perfectly.
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN SELECT unnest(ARRAY[
        'profiles', 'bookings', 'payout_requests', 'wallet_top_ups', 
        'admin_activity_logs', 'studios', 'certifications'
    ]) LOOP
        EXECUTE format('DROP POLICY IF EXISTS "Admin Full Access" ON public.%I', t);
        EXECUTE format('CREATE POLICY "Admin Full Access" ON public.%I FOR ALL TO authenticated USING (check_is_admin())', t);
    END LOOP;
END $$;

-- 3. Specific fix for Profiles table (ensure user can always see themselves)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile" ON public.profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id);

-- 4. Refresh PostgREST cache
NOTIFY pgrst, 'reload schema';
