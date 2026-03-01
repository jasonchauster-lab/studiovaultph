-- SQL Migration: Add processed_at to wallet_top_ups
-- Date: 2026-03-02

ALTER TABLE public.wallet_top_ups ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone;
