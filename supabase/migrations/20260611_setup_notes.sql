-- Text Pad table (one per project)
create table public.project_text_notes (
  project_id uuid primary key references public.projects(id) on delete cascade not null,
  content text default '',
  last_edited_by uuid references public.profiles(id) on delete set null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Grid Columns (up to 5 per project)
create table public.project_grid_columns (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  col_index integer not null check (col_index >= 0 and col_index < 5),
  header text default '',
  unique(project_id, col_index)
);

-- Grid Cells
create table public.project_grid_cells (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  row_index integer not null check (row_index >= 0),
  col_index integer not null check (col_index >= 0 and col_index < 5),
  value text default '',
  last_edited_by uuid references public.profiles(id) on delete set null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(project_id, row_index, col_index)
);

-- Version History Log
create table public.project_notes_history (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  entity_type text not null check (entity_type in ('text', 'cell', 'column')),
  entity_id text not null, -- e.g., 'text', 'col_0', 'cell_0_1'
  old_value text,
  new_value text,
  changed_by uuid references public.profiles(id) on delete set null,
  changed_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.project_text_notes enable row level security;
alter table public.project_grid_columns enable row level security;
alter table public.project_grid_cells enable row level security;
alter table public.project_notes_history enable row level security;

-- Policies for project_text_notes
create policy "Users can view text notes of visible projects" on project_text_notes
  for select using (
    exists (select 1 from public.projects where projects.id = project_text_notes.project_id)
  );
create policy "Admins/Contractors can edit text notes" on project_text_notes
  for all using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'contractor'))
    and exists (select 1 from public.projects where projects.id = project_text_notes.project_id)
  );

-- Policies for project_grid_columns
create policy "Users can view grid cols of visible projects" on project_grid_columns
  for select using (
    exists (select 1 from public.projects where projects.id = project_grid_columns.project_id)
  );
create policy "Admins/Contractors can edit grid cols" on project_grid_columns
  for all using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'contractor'))
    and exists (select 1 from public.projects where projects.id = project_grid_columns.project_id)
  );

-- Policies for project_grid_cells
create policy "Users can view grid cells of visible projects" on project_grid_cells
  for select using (
    exists (select 1 from public.projects where projects.id = project_grid_cells.project_id)
  );
create policy "Admins/Contractors can edit grid cells" on project_grid_cells
  for all using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'contractor'))
    and exists (select 1 from public.projects where projects.id = project_grid_cells.project_id)
  );

-- Policies for project_notes_history
create policy "Users can view history of visible projects" on project_notes_history
  for select using (
    exists (select 1 from public.projects where projects.id = project_notes_history.project_id)
  );
create policy "Admins/Contractors can insert history" on project_notes_history
  for insert with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'contractor'))
  );

-- Enable Realtime for these tables
-- Run this in Supabase SQL editor:
-- alter publication supabase_realtime add table project_text_notes, project_grid_columns, project_grid_cells;
