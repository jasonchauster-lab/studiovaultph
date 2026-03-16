-- Performance Optimizations: Ratings View + Missing Indexes
-- Created: 2026-03-16

-- ── 1. Aggregated ratings view (replaces fetching 2000+ raw review rows) ──────
-- Customer discovery page was doing: SELECT reviewee_id, rating LIMIT 2000
-- then computing averages in JS. This view does it in the DB in a single scan.
CREATE OR REPLACE VIEW public.reviewer_ratings AS
SELECT
    reviewee_id,
    ROUND(AVG(rating)::numeric, 2)  AS average,
    COUNT(*)                         AS count
FROM public.reviews
GROUP BY reviewee_id;

-- Grant public read (matches existing reviews RLS policy)
GRANT SELECT ON public.reviewer_ratings TO anon, authenticated;

-- ── 2. Index on reviews.reviewee_id (speeds up the view above + individual lookups) ──
CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id
    ON public.reviews(reviewee_id);

-- ── 3. Composite index: slots by studio + date + availability ─────────────────
-- Discovery slot view + studio calendar both filter on all three columns
CREATE INDEX IF NOT EXISTS idx_slots_studio_date_available
    ON public.slots(studio_id, date, is_available);

-- ── 4. Slots by date + availability (discovery page time filters) ─────────────
CREATE INDEX IF NOT EXISTS idx_slots_date_available
    ON public.slots(date, is_available)
    WHERE is_available = true;

-- ── 5. Bookings by studio_id (instructor session list + studio dashboard) ──────
CREATE INDEX IF NOT EXISTS idx_bookings_studio_id
    ON public.bookings(studio_id);

-- Composite for common studio dashboard query: studio_id + status
CREATE INDEX IF NOT EXISTS idx_bookings_studio_id_status
    ON public.bookings(studio_id, status);

-- ── 6. Instructor availability indexes ────────────────────────────────────────
-- Discovery page filters availability by instructor_id
CREATE INDEX IF NOT EXISTS idx_instructor_availability_instructor_id
    ON public.instructor_availability(instructor_id);

-- Discovery page day-of-week filter
CREATE INDEX IF NOT EXISTS idx_instructor_availability_day_of_week
    ON public.instructor_availability(day_of_week);

-- Composite for the most common availability query: instructor + day + date
CREATE INDEX IF NOT EXISTS idx_instructor_availability_instructor_day
    ON public.instructor_availability(instructor_id, day_of_week, date);

-- ── 7. Instructor bookings composite (instructor sessions page) ───────────────
CREATE INDEX IF NOT EXISTS idx_bookings_instructor_status
    ON public.bookings(instructor_id, status);
