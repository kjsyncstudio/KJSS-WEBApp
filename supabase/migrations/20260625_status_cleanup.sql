-- Final status set + order: Active, Pending, Expedite, Completed (drop Shelved)
-- Remap retired statuses on existing projects
update public.projects set status = 'Completed' where status = 'Done';
update public.projects set status = 'Pending'   where status = 'Shelved';

-- Keep only the 4 wanted statuses, with the requested order
delete from public.project_settings where kind = 'status' and value not in ('Active','Pending','Expedite','Completed');
insert into public.project_settings (kind, value, sort) values
  ('status','Active',0),('status','Pending',1),('status','Expedite',2),('status','Completed',3)
on conflict (kind, value) do update set sort = excluded.sort;
