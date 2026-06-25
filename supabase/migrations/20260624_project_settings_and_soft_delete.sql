-- 1. Convert projects.status from enum to text so custom statuses are allowed
alter table public.projects alter column status drop default;
alter table public.projects alter column status type text using status::text;
alter table public.projects alter column status set default 'Pending';
drop type if exists public.project_status;

-- 2. Soft delete: deleted projects keep a timestamp instead of being removed
alter table public.projects add column if not exists deleted_at timestamptz;

-- 3. Lookup table for editable Project Statuses and Types
create table if not exists public.project_settings (
  id uuid default gen_random_uuid() primary key,
  kind text not null check (kind in ('status', 'type')),
  value text not null,
  sort int not null default 0,
  created_at timestamptz default timezone('utc', now()) not null,
  unique (kind, value)
);

alter table public.project_settings enable row level security;

create policy "Authenticated can read project settings." on public.project_settings
  for select using (auth.role() = 'authenticated');

create policy "Admins manage project settings." on public.project_settings
  for all using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- 4. Seed current values
insert into public.project_settings (kind, value, sort) values
  ('status', 'Active', 0),
  ('status', 'Pending', 1),
  ('status', 'Expedite', 2),
  ('status', 'Completed', 3),
  ('type', 'Media Production', 0),
  ('type', 'Event', 1),
  ('type', 'Consultant', 2),
  ('type', 'Other', 3)
on conflict (kind, value) do nothing;
