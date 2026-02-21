-- Create the reviews table for the bilateral review system
create table if not exists public.reviews (
    id uuid primary key default gen_random_uuid(),
    booking_id uuid not null references public.bookings(id) on delete cascade,
    reviewer_id uuid not null references public.profiles(id) on delete cascade,
    reviewee_id uuid not null references public.profiles(id) on delete cascade,
    rating integer not null check (rating >= 1 and rating <= 5),
    comment text,
    tags text[] default '{}',
    created_at timestamptz not null default now(),
    -- Prevent a user from submitting more than one review per booking
    unique (booking_id, reviewer_id)
);

-- Enable Row Level Security
alter table public.reviews enable row level security;

-- Policy: Users can insert their own reviews
create policy "Users can submit reviews" on public.reviews
    for insert
    with check (auth.uid() = reviewer_id);

-- Policy: Reviews are publicly readable ONLY if:
--   a) The other party has also reviewed (mutual), OR
--   b) The review was created more than 48 hours ago (double-blind expiry)
-- We implement this in the application layer via a server action to keep the logic flexible.
-- For now, we allow authenticated users to read all reviews but filter in application layer.
create policy "Authenticated users can read reviews" on public.reviews
    for select
    using (auth.role() = 'authenticated');

-- Policy: Admins can do everything
create policy "Admins have full access to reviews" on public.reviews
    for all
    using (
        exists (
            select 1 from public.profiles
            where id = auth.uid() and role = 'admin'
        )
    );
