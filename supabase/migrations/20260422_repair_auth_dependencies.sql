-- Migration: Repair Auth Trigger and Dependencies
-- Description: Ensures pgcrypto is enabled and handle_new_user is robust.
-- Date: 2026-04-22

-- 1. Enable pgcrypto (required for gen_random_bytes in referral code generation)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Repair the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_role public.user_role;
  v_full_name text;
  v_first_name text;
  v_last_name text;
BEGIN
  -- Determine the role (default to 'customer' if not provided)
  -- We wrap this in a sub-block to handle potential enum casting errors
  BEGIN
    v_role := (COALESCE(new.raw_user_meta_data->>'role', 'customer'))::public.user_role;
  EXCEPTION WHEN OTHERS THEN
    v_role := 'customer'::public.user_role;
  END;
  
  -- Determine full name
  v_full_name := COALESCE(
    new.raw_user_meta_data->>'full_name', 
    new.raw_user_meta_data->>'name',
    split_part(new.email, '@', 1)
  );

  -- Split full name into first and last
  v_first_name := COALESCE(new.raw_user_meta_data->>'first_name', split_part(v_full_name, ' ', 1));
  v_last_name := COALESCE(new.raw_user_meta_data->>'last_name', NULLIF(substring(v_full_name from position(' ' in v_full_name) + 1), v_first_name));

  -- Insert profile with error handling
  BEGIN
    INSERT INTO public.profiles (
      id, 
      email, 
      full_name, 
      first_name,
      last_name,
      avatar_url, 
      role, 
      origin_portal,
      date_of_birth,
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
      NULLIF(new.raw_user_meta_data->>'date_of_birth', '')::date,
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE SET
      email = EXCLUDED.email,
      full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
      first_name = COALESCE(profiles.first_name, EXCLUDED.first_name),
      last_name = COALESCE(profiles.last_name, EXCLUDED.last_name),
      avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
      date_of_birth = COALESCE(profiles.date_of_birth, EXCLUDED.date_of_birth),
      updated_at = now();
  EXCEPTION WHEN OTHERS THEN
    -- Fallback: If the above fails (e.g. column mismatch or type error), try a minimal insertion to at least let the user sign up
    INSERT INTO public.profiles (id, email, role)
    VALUES (new.id, new.email, v_role)
    ON CONFLICT (id) DO NOTHING;
  END;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ensure the trigger is attached correctly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Manual Sync for potentially orphaned users
-- This ensures anyone who signed up while the trigger was broken gets a profile.
INSERT INTO public.profiles (id, email, full_name, role, origin_portal, date_of_birth)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)),
    (COALESCE(raw_user_meta_data->>'role', 'customer'))::public.user_role,
    COALESCE(raw_user_meta_data->>'origin_portal', 'marketplace'),
    NULLIF(raw_user_meta_data->>'date_of_birth', '')::date
FROM auth.users
ON CONFLICT (id) DO NOTHING;
