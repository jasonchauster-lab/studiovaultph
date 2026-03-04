-- SQL Migration: Allow 'refund' type in wallet_top_ups
-- Date: 2026-03-04

-- 1. Drop the old restrictive check
ALTER TABLE public.wallet_top_ups DROP CONSTRAINT IF EXISTS wallet_top_ups_type_check;

-- 2. Add the updated check including 'refund'
ALTER TABLE public.wallet_top_ups ADD CONSTRAINT wallet_top_ups_type_check 
    CHECK (type IN ('top_up', 'admin_adjustment', 'refund'));
