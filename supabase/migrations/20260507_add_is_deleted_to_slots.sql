-- Migration: Add is_deleted to slots for soft-delete consistency
-- Date: 2026-05-07

ALTER TABLE public.slots ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_slots_is_deleted ON public.slots(is_deleted) WHERE is_deleted = false;
