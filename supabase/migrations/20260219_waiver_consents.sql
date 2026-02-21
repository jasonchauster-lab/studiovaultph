-- ─── Waiver Consents Audit Table ─────────────────────────────────────────────
-- Stores a timestamped clickwrap record every time a customer agrees to the
-- Health Waiver and T&C at checkout. This is the primary legal defence record.

create table if not exists waiver_consents (
  id                              uuid primary key default gen_random_uuid(),
  booking_id                      uuid references bookings(id) on delete cascade,
  user_id                         uuid references auth.users(id) on delete cascade,

  -- Clickwrap record
  waiver_agreed                   boolean not null default false,
  terms_agreed                    boolean not null default false,

  -- PAR-Q answers stored as JSON for full auditability
  -- e.g. { "heart_condition": false, "chest_pain": false, "pregnant_postpartum": true, ... }
  parq_answers                    jsonb not null default '{}',

  -- Risk flags derived from PAR-Q answers
  has_risk_flags                  boolean not null default false,
  medical_clearance_acknowledged  boolean not null default false,

  -- Version of the waiver text the user agreed to (use ISO date of last update)
  waiver_version                  text not null default '2026-02-19',

  -- Audit timestamps
  agreed_at                       timestamptz not null default now(),

  created_at                      timestamptz not null default now()
);

-- Row Level Security
alter table waiver_consents enable row level security;

-- Clients can only insert their own consent records
create policy "Users can insert own consent records"
  on waiver_consents
  for insert
  with check (auth.uid() = user_id);

-- Clients can view their own consents
create policy "Users can view own consent records"
  on waiver_consents
  for select
  using (auth.uid() = user_id);

-- Admins (service role) have full access — handled automatically via service role key
