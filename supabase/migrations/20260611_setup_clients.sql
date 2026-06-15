-- Create clients table
create table public.clients (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  industry text not null,
  year_start integer not null,
  year_end integer,
  logo_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Turn on Row Level Security
alter table public.clients enable row level security;

-- Create policies
-- Everyone (who is logged in) can view clients
create policy "Clients are viewable by authenticated users." on clients
  for select using (auth.role() = 'authenticated');

-- Only admins can insert clients
create policy "Admins can insert clients." on clients
  for insert with check (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- Only admins can update clients
create policy "Admins can update clients." on clients
  for update using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );

-- Only admins can delete clients
create policy "Admins can delete clients." on clients
  for delete using (
    exists (select 1 from public.profiles where profiles.id = auth.uid() and profiles.role = 'admin')
  );
