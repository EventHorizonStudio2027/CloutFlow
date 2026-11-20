# CloutFlow backend activation checklist

**Status: SCHEMA DRAFT ONLY — NOT DEPLOYED.** The connected Supabase organization currently exposes only a project named **Social Eyes**. Never run CloutFlow migrations there.

## Scope: make existing workflows real
1. Authenticated accounts and isolated financial records.
2. Income ledger and imports with idempotent source identifiers.
3. Deposits and reconciliation with transactional currency/account/balance checks.
4. Reliable backup, restore, and cross-device persistence.

## Security gate
- Create a **dedicated CloutFlow** Supabase project and confirm it is visible in the connected Supabase app.
- Review `backend/schema.sql`; execute on the new project only, then verify schema, policies, grants, and RLS with two separate real test users. Never treat SQL written to GitHub as deployed.
- No secret/service-role keys in GitHub Pages, JavaScript, or committed files. Browser may use only a publishable key and authenticated JWT, subject to RLS.
- Allocation inserts now have a draft **invoker-rights trigger** checking user ownership, matching account and currency, source balances, and serialized concurrent writes. Direct allocation UPDATE/DELETE and earning/deposit UPDATE/DELETE remain blocked. These guards are **not database-tested or deployed**; validate with separate users and concurrent transactions before enabling cloud sync.
- Build an explicit migration from localStorage, with backup first, record counts, conflict preview, idempotency, rollback and post-import verification. Do not silently overwrite existing local data.
- Confirm a new browser/device can sign in and retrieve the same records, while another user cannot.
- Add tests for missing auth, forged user_id, cross-user foreign keys, duplicate import, mismatched currency, concurrent allocations, and network failures.
- Keep the current local app working until the new backend passes these gates.

## Owner action
Create a Supabase project called **CloutFlow** in the connected account and say it is ready. Do not send credentials or passwords in chat.

## Release rule
No claim of live synchronization or fully functional connected accounts until the production path is verified end-to-end.
