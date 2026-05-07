-- Migration: Add Promo Usage Tracking RPC
-- This atomically increments the usage count for a promo code.

CREATE OR REPLACE FUNCTION public.increment_promo_usage(p_code_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.promo_codes
    SET current_usage = COALESCE(current_usage, 0) + 1,
        updated_at = NOW()
    WHERE id = p_code_id;
END;
$$;
