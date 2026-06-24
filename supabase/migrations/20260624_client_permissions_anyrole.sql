-- Relax: any user granted a client permission sees/edits that client's projects,
-- not just role='project_manager'. Admins keep full access via their own policy.
drop policy if exists "PM read permitted client projects." on public.projects;
drop policy if exists "PM write permitted client projects." on public.projects;

do $$ begin
  create policy "Read permitted client projects." on public.projects
    for select using (
      exists (select 1 from public.client_permissions cp
              where cp.user_id = auth.uid() and cp.client_id = projects.client_id and cp.can_read)
    );
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Write permitted client projects." on public.projects
    for update using (
      exists (select 1 from public.client_permissions cp
              where cp.user_id = auth.uid() and cp.client_id = projects.client_id and cp.can_write)
    );
exception when duplicate_object then null; end $$;
