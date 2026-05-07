-- Migration: Fix Auth Trigger (Robust handle_new_user)
-- Description: Repairs the broken handle_new_user trigger which was referencing a deleted column 'debug_error'.
-- Date: 2026-04-15

-- 1. Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- 2. Re-create the function with robust logic
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
  v_full_name text;
  v_first_name text;
  v_last_name text;
BEGIN
  -- Determine the role (default to 'customer' if not provided)
  v_role := (COALESCE(new.raw_user_meta_data->>'role', 'customer'))::public.user_role;
  
  -- Determine full name (fallback to email if not provided)
  v_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Split full name into first and last if possible
  v_first_name := COALESCE(new.raw_user_meta_data->>'first_name', split_part(v_full_name, ' ', 1));
  v_last_name := COALESCE(new.raw_user_meta_data->>'last_name', substring(v_full_name from position(' ' in v_full_name) + 1));
  
  -- If there's no space, last_name might be same as first_name, so we clear it
  IF v_last_name = v_first_name THEN
    v_last_name := NULL;
  END IF;

  -- Insert or Update profile
  INSERT INTO public.profiles (
    id, 
    email, 
    full_name, 
    first_name,
    last_name,
    avatar_url, 
    role, 
    origin_portal,
    created_at,
    updated_at
  )
  VALUES (
    new.id,
    new.email,
    v_full_name,
    v_first_name,
    v_last_name,
    new.raw_user_meta_data->>'avatar_url',
    v_role,
    COALESCE(new.raw_user_meta_data->>'origin_portal', 'marketplace'),
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
    first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
    last_name = COALESCE(profiles.last_name, EXCLUDED.last_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = now();

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Re-create the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Manual Sync for potentially orphaned users (optional but good for safety)
-- This ensures anyone who signed up during the "broken" period gets a profile.
INSERT INTO public.profiles (id, email, full_name, role, origin_portal)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    (COALESCE(raw_user_meta_data->>'role', 'customer'))::public.user_role,
    COALESCE(raw_user_meta_data->>'origin_portal', 'marketplace')
FROM auth.users
ON CONFLICT (id) DO NOTHING;
