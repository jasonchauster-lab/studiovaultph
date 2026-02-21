-- Add review tracking columns to the bookings table.
-- We use two separate boolean columns because both parties can independently submit reviews.
alter table public.bookings
    add column if not exists customer_reviewed boolean not null default false,
    add column if not exists instructor_reviewed boolean not null default false;
