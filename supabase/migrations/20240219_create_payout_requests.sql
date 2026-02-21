-- Handle Types (idempotent)
do $$ begin
    create type payout_status as enum ('pending', 'approved', 'rejected', 'paid');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type payment_method as enum ('bank_transfer', 'gcash');
exception
    when duplicate_object then null;
end $$;

-- Handle Table Creation / Update
create table if not exists payout_requests (
  id uuid default gen_random_uuid() primary key,
  amount decimal(10, 2) not null,
  status payout_status default 'pending' not null,
  payment_method payment_method not null,
  account_name text not null,
  account_number text not null,
  bank_name text,
  notes text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- Add instructor_id if missing (it might be there from previous feature)
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'payout_requests' and column_name = 'instructor_id') then
        alter table payout_requests add column instructor_id uuid references auth.users(id); -- Assuming links to auth or profiles
    end if;
end $$;

-- Add studio_id for this feature
do $$
begin
    if not exists (select 1 from information_schema.columns where table_name = 'payout_requests' and column_name = 'studio_id') then
        alter table payout_requests add column studio_id uuid references studios(id) on delete cascade;
    end if;
end $$;

-- Enable RLS
alter table payout_requests enable row level security;

-- Policies for Studios
drop policy if exists "Studios can view their own payout requests" on payout_requests;
create policy "Studios can view their own payout requests"
  on payout_requests for select
  using (auth.uid() in (select owner_id from studios where id = payout_requests.studio_id));

drop policy if exists "Studios can insert payout requests" on payout_requests;
create policy "Studios can insert payout requests"
  on payout_requests for insert
  with check (auth.uid() in (select owner_id from studios where id = payout_requests.studio_id));
