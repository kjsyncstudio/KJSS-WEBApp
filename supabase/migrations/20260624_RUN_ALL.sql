-- ============================================================
-- KJS Studio — consolidated 2026-06-24 migration (idempotent)
-- Run once in Supabase SQL Editor. Safe to re-run.
-- ============================================================

-- 1. Role rename contractor -> project_manager -----------------
alter table public.profiles drop constraint if exists profiles_role_check;
update public.profiles set role = 'project_manager' where role = 'contractor';
alter table public.profiles add constraint profiles_role_check check (role in ('admin','project_manager','guest'));

-- 2. Project columns -------------------------------------------
alter table public.projects add column if not exists guest_viewable boolean not null default false;
alter table public.projects add column if not exists project_date date;
alter table public.projects add column if not exists thumbnail_url text;
alter table public.projects add column if not exists deleted_at timestamptz;

-- 3. status enum -> text (allow custom statuses) ---------------
alter table public.projects alter column status drop default;
alter table public.projects alter column status type text using status::text;
alter table public.projects alter column status set default 'Pending';
drop type if exists public.project_status;

-- 4. Audit log -------------------------------------------------
create table if not exists public.audit_log (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete set null,
  user_email text,
  action text not null,
  entity_type text not null,
  entity_id text,
  entity_name text,
  metadata jsonb,
  created_at timestamptz default timezone('utc', now()) not null
);
alter table public.audit_log enable row level security;
do $$ begin create policy "Admins can view audit log." on public.audit_log
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
exception when duplicate_object then null; end $$;
do $$ begin create policy "Service role can insert audit log." on public.audit_log
  for insert with check (true);
exception when duplicate_object then null; end $$;

-- 5. Project settings (editable statuses/types) ----------------
create table if not exists public.project_settings (
  id uuid default gen_random_uuid() primary key,
  kind text not null check (kind in ('status','type')),
  value text not null,
  sort int not null default 0,
  created_at timestamptz default timezone('utc', now()) not null,
  unique (kind, value)
);
alter table public.project_settings enable row level security;
do $$ begin create policy "Authenticated can read project settings." on public.project_settings
  for select using (auth.role() = 'authenticated');
exception when duplicate_object then null; end $$;
do $$ begin create policy "Admins manage project settings." on public.project_settings
  for all using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
exception when duplicate_object then null; end $$;
insert into public.project_settings (kind, value, sort) values
  ('status','Pending',0),('status','Active',1),('status','Shelved',2),('status','Done',3),
  ('type','Media Production',0),('type','Event',1),('type','Consultant',2),('type','Other',3)
on conflict (kind, value) do nothing;

-- 6. Client permissions (delegation) ---------------------------
create table if not exists public.client_permissions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  client_id uuid references public.clients(id) on delete cascade not null,
  can_read boolean not null default true,
  can_write boolean not null default false,
  created_at timestamptz default timezone('utc', now()) not null,
  unique (user_id, client_id)
);
alter table public.client_permissions enable row level security;
do $$ begin create policy "Admins manage client permissions." on public.client_permissions
  for all using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
exception when duplicate_object then null; end $$;
do $$ begin create policy "Users read own client permissions." on public.client_permissions
  for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- projects read/write gated by client permission (any role)
do $$ begin create policy "Read permitted client projects." on public.projects
  for select using (exists (select 1 from public.client_permissions cp where cp.user_id = auth.uid() and cp.client_id = projects.client_id and cp.can_read));
exception when duplicate_object then null; end $$;
do $$ begin create policy "Write permitted client projects." on public.projects
  for update using (exists (select 1 from public.client_permissions cp where cp.user_id = auth.uid() and cp.client_id = projects.client_id and cp.can_write));
exception when duplicate_object then null; end $$;

-- 7. Guest visibility policy -----------------------------------
drop policy if exists "Guests can view assigned projects." on public.projects;
do $$ begin create policy "Guests can view guest-enabled projects." on public.projects
  for select using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'guest') and guest_viewable = true);
exception when duplicate_object then null; end $$;
