-- Create project status enum
create type public.project_status as enum ('Active', 'Done', 'Shelved', 'Pending');

-- Create projects table
create table public.projects (
  id uuid default gen_random_uuid() primary key,
  title text not null,
  status public.project_status default 'Pending' not null,
  type text not null, -- Can be expanded later or kept as text for dropdown
  client_id uuid references public.clients(id) on delete restrict not null,
  description text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create project members table for RBAC linkage
create table public.project_members (
  project_id uuid references public.projects(id) on delete cascade not null,
  user_id uuid references public.profiles(id) on delete cascade not null,
  primary key (project_id, user_id)
);

-- Turn on Row Level Security
alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- Policies for project_members
-- Everyone can view members if they are authenticated
create policy "Project members are viewable by authenticated users." on project_members
  for select using (auth.role() = 'authenticated');

create policy "Admins can manage project members." on project_members
  for all using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- Policies for projects
-- Admins can do everything
create policy "Admins have full access to projects." on projects
  for all using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- Contractors can only view projects they are assigned to
create policy "Contractors can view assigned projects." on projects
  for select using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'contractor')
    and exists (select 1 from public.project_members where project_members.project_id = projects.id and project_members.user_id = auth.uid())
  );

-- Guests can only view projects (maybe all or none? Let's say guests can only view "Done" projects or assigned. For now, let's allow them to view all for simplicity, or we can restrict it. The plan says "Guest (View-only access or limited view)". Let's restrict it to assigned projects just like contractors, or if they have no assignments, they see nothing unless given explicit access. Actually, to be safe, let's just use the same logic as contractors for viewing.)
create policy "Guests can view assigned projects." on projects
  for select using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'guest')
    and exists (select 1 from public.project_members where project_members.project_id = projects.id and project_members.user_id = auth.uid())
  );
