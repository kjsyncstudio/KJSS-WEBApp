-- Block anonymous reads of internal project data at the DB level.
-- Guests keep anon read on projects + clients (thumbnail, description, client
-- name) but NOT on notes / sheet / links.
drop policy if exists "Anon read guest project_text_notes." on public.project_text_notes;
drop policy if exists "Anon read guest project_grid_columns." on public.project_grid_columns;
drop policy if exists "Anon read guest project_grid_cells." on public.project_grid_cells;
drop policy if exists "Anon read guest project_upload_links." on public.project_upload_links;
drop policy if exists "Anon read guest project_final_urls." on public.project_final_urls;
