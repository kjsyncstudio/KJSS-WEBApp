-- Per-project media gallery: uploaded images + embedded video links.
-- First image (lowest sort) drives the project's cover/thumbnail.
create table if not exists public.project_media (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  kind text not null check (kind in ('image', 'video')),
  url text not null,
  sort int not null default 0,
  created_at timestamptz default timezone('utc', now()) not null
);
create index if not exists project_media_project_idx on public.project_media (project_id, sort);

alter table public.project_media enable row level security;

-- READ: mirrors project visibility (admin / permitted client / guest-viewable for anon)
do $$ begin
  create policy "Read project media." on public.project_media
    for select using (
      exists (select 1 from public.projects p where p.id = project_media.project_id and (
        p.guest_viewable
        or exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
        or exists (select 1 from public.client_permissions cp where cp.user_id = auth.uid() and cp.client_id = p.client_id and cp.can_read)
      ))
    );
exception when duplicate_object then null; end $$;

-- WRITE: admin, or write permission on the project's client
do $$ begin
  create policy "Write project media." on public.project_media
    for all using (
      exists (select 1 from public.projects p where p.id = project_media.project_id and (
        exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
        or exists (select 1 from public.client_permissions cp where cp.user_id = auth.uid() and cp.client_id = p.client_id and cp.can_write)
      ))
    )
    with check (
      exists (select 1 from public.projects p where p.id = project_media.project_id and (
        exists (select 1 from public.profiles pr where pr.id = auth.uid() and pr.role = 'admin')
        or exists (select 1 from public.client_permissions cp where cp.user_id = auth.uid() and cp.client_id = p.client_id and cp.can_write)
      ))
    );
exception when duplicate_object then null; end $$;
