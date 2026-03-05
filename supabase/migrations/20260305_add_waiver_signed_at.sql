-- Add waiver_signed_at column to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS waiver_signed_at TIMESTAMPTZ;

-- Index for faster lookups in admin dashboard
CREATE INDEX IF NOT EXISTS idx_profiles_waiver_signed_at ON public.profiles(waiver_signed_at);

COMMENT ON COLUMN public.profiles.waiver_signed_at IS 'Timestamp when the user last signed/uploaded their waiver.';
