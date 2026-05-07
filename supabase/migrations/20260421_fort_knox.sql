-- Phase 7: Fort Knox Protection

-- 1. Idempotency for Payouts
ALTER TABLE public.payout_requests 
ADD COLUMN IF NOT EXISTS idempotency_key text UNIQUE;

-- 2. Missing Soft Delete Columns
ALTER TABLE public.service_categories ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_service_categories_is_deleted ON public.service_categories(is_deleted) WHERE is_deleted = false;

-- 3. Session Versioning & Account Status
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS session_version int DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_suspended boolean DEFAULT false;

-- 3. Trigger to bump session version on role change or suspension
CREATE OR REPLACE FUNCTION increment_session_version()
RETURNS TRIGGER AS $$
BEGIN
    IF (OLD.role IS DISTINCT FROM NEW.role) OR (OLD.is_suspended IS DISTINCT FROM NEW.is_suspended) THEN
        NEW.session_version := OLD.session_version + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_increment_session_version ON public.profiles;
CREATE TRIGGER tr_increment_session_version
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION increment_session_version();

-- 4. Supabase-backed Rate Limiting (Fixed Window)
CREATE TABLE IF NOT EXISTS public.rate_limits (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    key text NOT NULL, -- e.g. "payout:studio_id"
    hits int DEFAULT 1,
    window_start timestamp with time zone DEFAULT now(),
    UNIQUE(key, window_start)
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON public.rate_limits(key);

-- 5. RPC for atomic rate limit check
CREATE OR REPLACE FUNCTION check_rate_limit(
    p_key text,
    p_limit int,
    p_window_seconds int
)
RETURNS boolean AS $$
DECLARE
    v_window_start timestamp with time zone;
    v_hits int;
BEGIN
    -- Calculate window start (rounded to window size)
    -- This is a fixed-window implementation
    v_window_start := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);

    INSERT INTO public.rate_limits (key, window_start, hits)
    VALUES (p_key, v_window_start, 1)
    ON CONFLICT (key, window_start)
    DO UPDATE SET hits = rate_limits.hits + 1
    RETURNING hits INTO v_hits;

    RETURN v_hits <= p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
