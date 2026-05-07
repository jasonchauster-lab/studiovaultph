-- Migration: Add Promo Code and Price Tracking to Customer Plans
-- This allows us to "freeze" the amount a customer is expected to pay at the time of purchase.

-- 1. Add fields to customer_plans
ALTER TABLE public.customer_plans 
ADD COLUMN IF NOT EXISTS total_amount DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS promo_code_id UUID REFERENCES public.promo_codes(id) ON DELETE SET NULL;

-- 2. Backfill: Set total_amount for existing active plans (optional, but good for data consistency)
-- This logic assumes memberships/packages have a price field. Adjust if table names differ.
UPDATE public.customer_plans cp
SET total_amount = COALESCE(p.price, m.price, 0)
FROM (SELECT id, price FROM public.packages) p
FULL OUTER JOIN (SELECT id, price FROM public.memberships) m ON true
WHERE (cp.package_id = p.id OR cp.membership_id = m.id)
AND cp.total_amount IS NULL;

-- 3. Trigger to keep updated_at in sync (if not already handled)
-- (Found existing updated_at columns in migration 20260408)
