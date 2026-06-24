-- 1. Rename role value contractor → project_manager
-- Drop the check constraint, update values, re-add constraint

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

UPDATE public.profiles SET role = 'project_manager' WHERE role = 'contractor';

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'project_manager', 'guest'));

-- Update the handle_new_user trigger (no change needed — default is 'guest')

-- Update RLS policies that reference 'contractor'

-- projects table
DROP POLICY IF EXISTS "Contractors can view assigned projects." ON projects;
CREATE POLICY "Project managers can view assigned projects." ON projects
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'project_manager')
    AND EXISTS (SELECT 1 FROM public.project_members WHERE project_members.project_id = projects.id AND project_members.user_id = auth.uid())
  );

-- notes
DROP POLICY IF EXISTS "Admins/Contractors can edit text notes" ON project_text_notes;
CREATE POLICY "Admins/PMs can edit text notes" ON project_text_notes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'project_manager'))
    AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_text_notes.project_id)
  );

DROP POLICY IF EXISTS "Admins/Contractors can edit grid cols" ON project_grid_columns;
CREATE POLICY "Admins/PMs can edit grid cols" ON project_grid_columns
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'project_manager'))
    AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_grid_columns.project_id)
  );

DROP POLICY IF EXISTS "Admins/Contractors can edit grid cells" ON project_grid_cells;
CREATE POLICY "Admins/PMs can edit grid cells" ON project_grid_cells
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'project_manager'))
    AND EXISTS (SELECT 1 FROM public.projects WHERE projects.id = project_grid_cells.project_id)
  );

DROP POLICY IF EXISTS "Admins/Contractors can insert history" ON project_notes_history;
CREATE POLICY "Admins/PMs can insert history" ON project_notes_history
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'project_manager'))
  );

DROP POLICY IF EXISTS "Admins/Contractors can insert upload links" ON project_upload_links;
CREATE POLICY "Admins/PMs can insert upload links" ON project_upload_links
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'project_manager'))
  );

DROP POLICY IF EXISTS "Admins/Contractors can delete upload links" ON project_upload_links;
CREATE POLICY "Admins/PMs can delete upload links" ON project_upload_links
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'project_manager'))
  );

DROP POLICY IF EXISTS "Admins/Contractors can insert final urls" ON project_final_urls;
CREATE POLICY "Admins/PMs can insert final urls" ON project_final_urls
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'project_manager'))
  );

DROP POLICY IF EXISTS "Admins/Contractors can delete final urls" ON project_final_urls;
CREATE POLICY "Admins/PMs can delete final urls" ON project_final_urls
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('admin', 'project_manager'))
  );
