-- Add the "Expedite" status (urgent work). Admin + contractors set it.
insert into public.project_settings (kind, value, sort) values ('status', 'Expedite', 4)
on conflict (kind, value) do nothing;
