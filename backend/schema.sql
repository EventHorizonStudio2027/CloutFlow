-- CloutFlow: isolated creator-finance foundation. Apply only to a dedicated CloutFlow project.
-- Money uses integer minor units; no float arithmetic.
create table if not exists public.cf_accounts (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 platform text not null check (length(trim(platform)) between 1 and 80),
 display_name text not null check (length(trim(display_name)) between 1 and 160),
 created_at timestamptz not null default now(),
 unique (id,user_id)
);
create table if not exists public.cf_earnings (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 account_id uuid not null,
 source_key text,
 earned_on date not null,
 currency text not null check (currency ~ '^[A-Z]{3}$'),
 gross_minor bigint not null check (gross_minor > 0),
 fee_minor bigint not null default 0 check (fee_minor >= 0),
 tax_minor bigint not null default 0 check (tax_minor >= 0),
 refund_minor bigint not null default 0 check (refund_minor >= 0),
 created_at timestamptz not null default now(),
 foreign key (account_id,user_id) references public.cf_accounts(id,user_id) on delete restrict,
 check (fee_minor + tax_minor + refund_minor <= gross_minor)
);
create unique index if not exists cf_earnings_source_key_unique on public.cf_earnings(user_id,account_id,source_key) where source_key is not null;
create table if not exists public.cf_deposits (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 account_id uuid not null,
 source_key text,
 received_on date not null,
 currency text not null check (currency ~ '^[A-Z]{3}$'),
 amount_minor bigint not null check (amount_minor > 0),
 created_at timestamptz not null default now(),
 unique (id,user_id),
 foreign key (account_id,user_id) references public.cf_accounts(id,user_id) on delete restrict
);
create unique index if not exists cf_deposits_source_key_unique on public.cf_deposits(user_id,account_id,source_key) where source_key is not null;
create table if not exists public.cf_allocations (
 id uuid primary key default gen_random_uuid(),
 user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 earning_id uuid not null,
 deposit_id uuid not null,
 amount_minor bigint not null check (amount_minor > 0),
 created_at timestamptz not null default now(),
 unique (user_id,earning_id,deposit_id),
 foreign key (earning_id,user_id) references public.cf_earnings(id,user_id) on delete restrict,
 foreign key (deposit_id,user_id) references public.cf_deposits(id,user_id) on delete restrict
);
alter table public.cf_earnings add constraint cf_earnings_id_user_unique unique (id,user_id);
alter table public.cf_accounts enable row level security;
alter table public.cf_earnings enable row level security;
alter table public.cf_deposits enable row level security;
alter table public.cf_allocations enable row level security;
revoke all on public.cf_accounts,public.cf_earnings,public.cf_deposits,public.cf_allocations from anon;
grant select,insert,update,delete on public.cf_accounts,public.cf_earnings,public.cf_deposits,public.cf_allocations to authenticated;
create policy cf_accounts_owner on public.cf_accounts for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy cf_earnings_owner on public.cf_earnings for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy cf_deposits_owner on public.cf_deposits for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy cf_allocations_owner on public.cf_allocations for all to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
-- Allocation writes are permitted only through an invoker-rights trigger that
-- serializes concurrent writers on both financial source rows.
create or replace function public.cf_validate_allocation()
returns trigger language plpgsql security invoker set search_path = '' as $
declare
  e record;
  d record;
  used_earning bigint;
  used_deposit bigint;
  lock_key bigint;
begin
  if new.user_id is distinct from (select auth.uid()) then
    raise exception 'Allocation owner mismatch';
  end if;
  -- Transaction advisory locks serialize competing allocations without
  -- granting clients permission to modify earning/deposit source rows.
  for lock_key in select unnest(array[
    hashtextextended('earning:'||new.earning_id::text,0),
    hashtextextended('deposit:'||new.deposit_id::text,0)
  ]) order by 1 loop
    perform pg_catalog.pg_advisory_xact_lock(lock_key);
  end loop;
  select account_id,currency,gross_minor-fee_minor-tax_minor-refund_minor as available
    into e from public.cf_earnings
    where id=new.earning_id and user_id=new.user_id;
  if not found then raise exception 'Earning not available'; end if;
  select account_id,currency,amount_minor as available
    into d from public.cf_deposits
    where id=new.deposit_id and user_id=new.user_id;
  if not found then raise exception 'Deposit not available'; end if;
  if e.account_id <> d.account_id or e.currency <> d.currency then
    raise exception 'Allocation account or currency mismatch';
  end if;
  select coalesce(sum(amount_minor),0) into used_earning
    from public.cf_allocations where user_id=new.user_id and earning_id=new.earning_id;
  select coalesce(sum(amount_minor),0) into used_deposit
    from public.cf_allocations where user_id=new.user_id and deposit_id=new.deposit_id;
  if used_earning + new.amount_minor > e.available
     or used_deposit + new.amount_minor > d.available then
    raise exception 'Allocation exceeds available balance';
  end if;
  return new;
end $;
revoke all on function public.cf_validate_allocation() from public,anon;
create trigger cf_allocation_guard before insert on public.cf_allocations
  for each row execute function public.cf_validate_allocation();
revoke update,delete on public.cf_allocations from authenticated;
-- The trigger uses invoker permissions and therefore respects RLS.
grant insert on public.cf_allocations to authenticated;
-- Restrict direct edits to monetary balances until guarded update workflows exist.
revoke update on public.cf_earnings, public.cf_deposits from authenticated;
-- Never allow a client to delete financial evidence outside an audited workflow.
revoke delete on public.cf_earnings, public.cf_deposits from authenticated;

