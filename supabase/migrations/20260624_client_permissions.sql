-- Per-user, per-client read/write delegation for project managers (contractors)
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

do $$ begin
  create policy "Admins manage client permissions." on public.client_permissions
    for all using (exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin'));
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Users read own client permissions." on public.client_permissions
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

-- Project managers can READ projects of clients they are granted read on
do $$ begin
  create policy "PM read permitted client projects." on public.projects
    for select using (
      exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'project_manager')
      and exists (
        select 1 from public.client_permissions cp
        where cp.user_id = auth.uid() and cp.client_id = projects.client_id and cp.can_read
      )
    );
exception when duplicate_object then null; end $$;

-- Project managers can UPDATE projects of clients they are granted write on
do $$ begin
  create policy "PM write permitted client projects." on public.projects
    for update using (
      exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'project_manager')
      and exists (
        select 1 from public.client_permissions cp
        where cp.user_id = auth.uid() and cp.client_id = projects.client_id and cp.can_write
      )
    );
exception when duplicate_object then null; end $$;
