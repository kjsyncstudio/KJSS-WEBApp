-- ============================================================
-- Part 1: let users with can_write on a client edit that
-- client's project + all its child rows. Idempotent.
-- ============================================================

-- projects UPDATE: add WITH CHECK (was USING only)
drop policy if exists "Write permitted client projects." on public.projects;
create policy "Write permitted client projects." on public.projects
  for update
  using (exists (select 1 from public.client_permissions cp where cp.user_id = auth.uid() and cp.client_id = projects.client_id and cp.can_write))
  with check (exists (select 1 from public.client_permissions cp where cp.user_id = auth.uid() and cp.client_id = projects.client_id and cp.can_write));

-- Child tables: grant full write to users with can_write on the parent project's client
do $$
declare t text;
begin
  foreach t in array array[
    'project_text_notes','project_grid_columns','project_grid_cells',
    'project_notes_history','project_upload_links','project_final_urls'
  ] loop
    execute format('drop policy if exists "Permitted client can write %1$s." on public.%1$s;', t);
    execute format($f$
      create policy "Permitted client can write %1$s." on public.%1$s
      for all
      using (exists (
        select 1 from public.projects p
        join public.client_permissions cp on cp.client_id = p.client_id
        where p.id = %1$s.project_id and cp.user_id = auth.uid() and cp.can_write))
      with check (exists (
        select 1 from public.projects p
        join public.client_permissions cp on cp.client_id = p.client_id
        where p.id = %1$s.project_id and cp.user_id = auth.uid() and cp.can_write));
    $f$, t);
  end loop;
end $$;

-- ============================================================
-- Part 2: enable Realtime on the collaborated tables
-- (runs on Supabase, no Vercel cost). Safe to re-run.
-- ============================================================
do $$
declare t text;
begin
  foreach t in array array['projects','project_text_notes','project_grid_cells','project_grid_columns'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I;', t);
    end if;
  end loop;
end $$;
