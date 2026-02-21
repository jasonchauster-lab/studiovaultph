-- Change the unique constraint on reviews to allow one review per reviewee per booking.
-- This enables a customer to submit separate reviews for the instructor AND the studio.

-- Drop old constraint (booking_id, reviewer_id)
ALTER TABLE public.reviews
    DROP CONSTRAINT IF EXISTS reviews_booking_id_reviewer_id_key;

-- Add new constraint (booking_id, reviewer_id, reviewee_id) 
ALTER TABLE public.reviews
    ADD CONSTRAINT reviews_booking_reviewer_reviewee_unique
    UNIQUE (booking_id, reviewer_id, reviewee_id);

-- Also add tracking columns for studio reviews on bookings
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS customer_reviewed_studio boolean NOT NULL DEFAULT false;

-- Rename old customer_reviewed to customer_reviewed_instructor for clarity
-- Note: we keep customer_reviewed for backwards compat and add the new column
ALTER TABLE public.bookings
    ADD COLUMN IF NOT EXISTS customer_reviewed_instructor boolean NOT NULL DEFAULT false;

-- Sync existing data: if customer_reviewed is true, set customer_reviewed_instructor too
UPDATE public.bookings
    SET customer_reviewed_instructor = true
    WHERE customer_reviewed = true;
