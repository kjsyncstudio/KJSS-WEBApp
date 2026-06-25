-- Timestamp of when a project was marked Completed (for "latest completed" sorting
-- and the dashboard's 7-day grace window). Null while not completed.
alter table public.projects add column if not exists completed_at timestamptz;

-- Backfill: any already-completed project gets "now" so it isn't lost
update public.projects set completed_at = timezone('utc', now())
where status = 'Completed' and completed_at is null;
