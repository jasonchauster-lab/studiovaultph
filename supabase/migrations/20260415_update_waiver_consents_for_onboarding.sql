-- ─── Update Waiver Consents for Studio Onboarding ─────────────────────────────
-- Enhances the waiver_consents table to support studio-specific onboarding
-- independent of bookings, and stores signature vectors and content snapshots.

-- 1. Modify Columns
ALTER TABLE public.waiver_consents 
    ALTER COLUMN booking_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS studio_id UUID REFERENCES public.studios(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS signature_svg TEXT,
    ADD COLUMN IF NOT EXISTS waiver_title_snapshot TEXT,
    ADD COLUMN IF NOT EXISTS waiver_content_snapshot TEXT;

-- 2. Indexing
CREATE INDEX IF NOT EXISTS idx_waiver_consents_studio_id ON public.waiver_consents(studio_id);
CREATE INDEX IF NOT EXISTS idx_waiver_consents_user_id ON public.waiver_consents(user_id);

-- 3. Update RLS Policies
-- Allow studio owners to view consents for their studio
DROP POLICY IF EXISTS "Studio owners can view their customers waivers" ON public.waiver_consents;
CREATE POLICY "Studio owners can view their customers waivers" 
    ON public.waiver_consents
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.studios s
            WHERE s.id = waiver_consents.studio_id
            AND s.owner_id = auth.uid()
        )
    );

-- 4. Update existing booking-based consents (Backfill studio_id if possible)
-- This ensures existing records are visible to owners in the CMS
UPDATE public.waiver_consents
SET studio_id = b.studio_id
FROM public.bookings b
WHERE waiver_consents.booking_id = b.id
AND waiver_consents.studio_id IS NULL;
