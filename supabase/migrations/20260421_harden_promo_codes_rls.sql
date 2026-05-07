-- Migration: 20260421_harden_promo_codes_rls.sql
-- Restrict public read access to active promo codes only.

DROP POLICY IF EXISTS "Public read promo_codes" ON public.promo_codes;

-- Allow public to see only active codes
CREATE POLICY "Public read active promo_codes" ON public.promo_codes
    FOR SELECT
    USING (
        is_active = true AND 
        (starts_at IS NULL OR starts_at <= NOW()) AND 
        (expires_at IS NULL OR expires_at >= NOW())
    );

-- Maintain owner access
DROP POLICY IF EXISTS "Owner manage promo_codes" ON public.promo_codes;
CREATE POLICY "Owner manage promo_codes" ON public.promo_codes
    FOR ALL
    TO authenticated
    USING (auth.uid() IN (
        SELECT owner_id FROM studios WHERE id = studio_id
    ))
    WITH CHECK (auth.uid() IN (
        SELECT owner_id FROM studios WHERE id = studio_id
    ));
