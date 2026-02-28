-- Add essential statuses to booking_status enum
-- We only add statuses that are genuinely missing and needed for logic.
-- Redundant "confirmed" variants will be consolidated in the code instead.

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'expired';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'cancelled';
