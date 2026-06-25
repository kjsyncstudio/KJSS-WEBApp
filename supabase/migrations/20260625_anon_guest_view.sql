-- Let anonymous (not-logged-in) visitors READ guest-viewable projects and
-- their child data, so a shared link opens read-only without a login.
-- Writes stay blocked (no anon insert/update/delete policies exist).

do $$ begin
  create policy "Anon read guest projects." on public.projects
    for select to anon using (guest_viewable = true);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "Anon read guest project clients." on public.clients
    for select to anon using (
      exists (select 1 from public.projects p where p.client_id = clients.id and p.guest_viewable));
exception when duplicate_object then null; end $$;

-- Child tables — readable when the parent project is guest-viewable
do $$
declare t text;
begin
  foreach t in array array[
    'project_text_notes','project_grid_columns','project_grid_cells',
    'project_upload_links','project_final_urls'
  ] loop
    execute format('drop policy if exists "Anon read guest %1$s." on public.%1$s;', t);
    execute format($f$
      create policy "Anon read guest %1$s." on public.%1$s
      for select to anon using (
        exists (select 1 from public.projects p where p.id = %1$s.project_id and p.guest_viewable));
    $f$, t);
  end loop;
end $$;
