-- Separate uploaded client logo from the manual URL.
-- Display priority: logo_upload_url > logo_url > placeholder.
alter table public.clients add column if not exists logo_upload_url text;

-- NOTE: create a PUBLIC storage bucket named "client-logos" in the Supabase
-- dashboard (Storage → New bucket → public). Uploaded client logos go there,
-- kept separate from the "images" bucket used for project thumbnails.
