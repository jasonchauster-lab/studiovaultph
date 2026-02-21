-- ─── Admin Support Policies ────────────────────────────────────────────────────
-- Grants admins full access to support tickets and messages.
-- Required because default RLS usually only allows users to see their own data.

-- 1. Enable RLS (just in case)
alter table support_tickets enable row level security;
alter table support_messages enable row level security;

-- 2. Drop existing policies to avoid conflicts if re-running
drop policy if exists "Admins can view all tickets" on support_tickets;
drop policy if exists "Admins can update tickets" on support_tickets;
drop policy if exists "Admins can view all messages" on support_messages;
drop policy if exists "Admins can insert messages" on support_messages;
drop policy if exists "Admins can update messages" on support_messages;

-- 3. Create Policy for Tickets
create policy "Admins can view all tickets"
on support_tickets
for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

create policy "Admins can update tickets"
on support_tickets
for update
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

-- 4. Create Policy for Messages
create policy "Admins can view all messages"
on support_messages
for select
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

create policy "Admins can insert messages"
on support_messages
for insert
with check (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);

create policy "Admins can update messages"
on support_messages
for update
using (
  exists (
    select 1 from profiles
    where profiles.id = auth.uid()
    and profiles.role = 'admin'
  )
);
