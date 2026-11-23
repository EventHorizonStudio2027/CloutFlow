-- One snapshot per signed-in user, preserving the current complete local ledger shape.
-- This is an opt-in backup, not automatic sync.
create table public.cf_workspace_backups (
 user_id uuid primary key references auth.users(id) on delete cascade default auth.uid(),
 snapshot jsonb not null check (jsonb_typeof(snapshot) = 'object'),
 revision bigint not null default 1 check (revision >= 1),
 updated_at timestamptz not null default now()
);
alter table public.cf_workspace_backups enable row level security;
revoke all on public.cf_workspace_backups from anon;
grant select,insert on public.cf_workspace_backups to authenticated;
create policy cf_workspace_backups_read on public.cf_workspace_backups for select to authenticated using ((select auth.uid())=user_id);
create policy cf_workspace_backups_insert on public.cf_workspace_backups for insert to authenticated with check ((select auth.uid())=user_id);
-- No update or delete: existing cloud backups cannot be silently overwritten.
