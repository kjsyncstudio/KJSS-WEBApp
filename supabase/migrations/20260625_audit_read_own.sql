-- Allow users to read their own audit rows (needed so change-logging can
-- throttle: skip inserting if this user already logged a recent change).
do $$ begin
  create policy "Users read own audit entries." on public.audit_log
    for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;
