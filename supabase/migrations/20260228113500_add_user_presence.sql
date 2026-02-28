-- Migration: Add user presence tracking fields to profiles table
-- Created at: 2026-02-28 11:35:00+08

-- 1. Add columns to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_online BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS last_seen_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for faster querying of online users if needed later
CREATE INDEX IF NOT EXISTS idx_profiles_is_online ON public.profiles(is_online);

-- 2. Create RPC to securely update own presence
CREATE OR REPLACE FUNCTION public.update_user_presence(is_online_status BOOLEAN)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET 
        is_online = is_online_status,
        last_seen_at = NOW()
    WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution permission
GRANT EXECUTE ON FUNCTION public.update_user_presence(BOOLEAN) TO authenticated;
