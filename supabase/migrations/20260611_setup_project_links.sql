-- Upload Links Table (Google Drive, Dropbox, etc)
create table public.project_upload_links (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  title text default 'Upload Link',
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Final Project URLs Table (YouTube, Instagram, Facebook, etc)
create table public.project_final_urls (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references public.projects(id) on delete cascade not null,
  platform text not null default 'Custom', -- e.g., YouTube, Instagram, Facebook, Custom
  url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.project_upload_links enable row level security;
alter table public.project_final_urls enable row level security;

-- Policies for project_upload_links
create policy "Users can view upload links of visible projects" on project_upload_links
  for select using (
    exists (select 1 from public.projects where projects.id = project_upload_links.project_id)
  );
create policy "Admins/Contractors can insert upload links" on project_upload_links
  for insert with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'contractor'))
  );
create policy "Admins/Contractors can delete upload links" on project_upload_links
  for delete using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'contractor'))
  );

-- Policies for project_final_urls
create policy "Users can view final urls of visible projects" on project_final_urls
  for select using (
    exists (select 1 from public.projects where projects.id = project_final_urls.project_id)
  );
create policy "Admins/Contractors can insert final urls" on project_final_urls
  for insert with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'contractor'))
  );
create policy "Admins/Contractors can delete final urls" on project_final_urls
  for delete using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role in ('admin', 'contractor'))
  );
