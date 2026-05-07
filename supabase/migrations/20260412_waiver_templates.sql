-- ─── Waiver Templates Table ──────────────────────────────────────────────────
-- Allows studios to manage their own waiver form templates.

create table if not exists public.waiver_templates (
  id                uuid primary key default gen_random_uuid(),
  studio_id         uuid not null references public.studios(id) on delete cascade,
  
  title             text not null,
  content           text not null, -- Store HTML/Markdown content
  status            text not null default 'Active' check (status in ('Active', 'Draft', 'Archived')),
  
  updated_by        uuid references auth.users(id) on delete set null,
  
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- Row Level Security
alter table public.waiver_templates enable row level security;

-- Indexing for performance
create index if not exists idx_waiver_templates_studio_id on public.waiver_templates(studio_id);

-- Policies
create policy "Studios can view their own waiver templates"
  on public.waiver_templates
  for select
  using (
    exists (
      select 1 from public.studios s
      where s.id = waiver_templates.studio_id
      and s.owner_id = auth.uid()
    )
  );

create policy "Studios can create their own waiver templates"
  on public.waiver_templates
  for insert
  with check (
    exists (
      select 1 from public.studios s
      where s.id = studio_id
      and s.owner_id = auth.uid()
    )
  );

create policy "Studios can update their own waiver templates"
  on public.waiver_templates
  for update
  using (
    exists (
      select 1 from public.studios s
      where s.id = waiver_templates.studio_id
      and s.owner_id = auth.uid()
    )
  );

create policy "Studios can delete their own waiver templates"
  on public.waiver_templates
  for delete
  using (
    exists (
      select 1 from public.studios s
      where s.id = waiver_templates.studio_id
      and s.owner_id = auth.uid()
    )
  );

-- Trigger for updated_at
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tr_waiver_templates_updated_at
  before update on public.waiver_templates
  for each row
  execute function public.handle_updated_at();
