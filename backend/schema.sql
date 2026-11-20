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
-- Next gate: implement a transaction-safe allocation RPC enforcing currency,
-- account ownership and sum(amount_minor) <= source balances before enabling writes.
revoke insert,update,delete on public.cf_allocations from authenticated;
