-- Add guest_viewable flag to projects
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS guest_viewable boolean NOT NULL DEFAULT false;

-- Update guest RLS policy: guests see projects where guest_viewable = true (no project_members needed)
DROP POLICY IF EXISTS "Guests can view assigned projects." ON projects;
CREATE POLICY "Guests can view guest-enabled projects." ON projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'guest')
    AND guest_viewable = true
  );

-- Audit log table
CREATE TABLE public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  user_email text,
  action text NOT NULL,          -- e.g. 'create', 'update', 'delete', 'login', 'logout', 'invite', 'role_change'
  entity_type text NOT NULL,     -- e.g. 'project', 'client', 'user', 'note', 'link'
  entity_id text,
  entity_name text,
  metadata jsonb,                -- extra context (old_value, new_value, etc.)
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit log
CREATE POLICY "Admins can view audit log." ON audit_log
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
  );

-- Service role (server actions) can insert — anon/authenticated cannot insert directly
CREATE POLICY "Service role can insert audit log." ON audit_log
  FOR INSERT WITH CHECK (true);
