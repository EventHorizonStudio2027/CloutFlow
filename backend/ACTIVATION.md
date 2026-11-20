# CloutFlow backend activation checklist

**Status: SCHEMA DRAFT ONLY — NOT DEPLOYED.** The connected Supabase organization currently exposes only a project named **Social Eyes**. Never run CloutFlow migrations there.

## Scope: make existing workflows real
1. Authenticated accounts and isolated financial records.
2. Income ledger and imports with idempotent source identifiers.
3. Deposits and reconciliation with transactional currency/account/balance checks.
4. Reliable backup, restore, and cross-device persistence.

## Security gate
- **Completed:** Dedicated CloutFlow project created; keep Social Eyes isolated.
- **Partially completed:** Applied `backend/schema.sql` to CloutFlow; verified four tables have RLS, four ownership policies exist, anonymous reads are denied, and direct allocation updates are denied. **Still required:** two separate authenticated test users, transaction concurrency tests and real API verification.
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

## Verification record — 2026-11-20
- Repaired invalid PL/pgSQL function dollar-quoting discovered during source review. Added a structural regression assertion; **database execution remains unverified**.
- Prevented concurrent GitHub Pages deployments from cancelling one another while artifacts are handed off. The preceding Pages run failed to find its uploaded artifact even though the upload step reported success; recheck the newest run before claiming deployment.
- Do not run the SQL in the Social Eyes project. A dedicated CloutFlow project is still required.

## Live deployment record — 2026-11-20
- Supabase project: `CloutFlow` (`us-east-2`). Do not use the Social Eyes project.
- Financial foundation migration applied successfully. Live queries confirmed RLS on all four tables and owner policies for authenticated users.
- Security advisor initially flagged publicly executable `public.rls_auto_enable()` (existing event trigger function). Applied `backend/security-hardening.sql`; rechecked security advisors: **0 findings**.
- No real creator financial records migrated. No credentials, passwords or secret service-role keys committed.
- Website now accurately labels the backend as provisioned while sign-in and cloud sync remain pending.

## Account access increment — 2026-11-20
- Added email/password sign-in, sign-up and sign-out UI backed by the CloutFlow Supabase Auth REST API and a **publishable** browser key.
- Access tokens remain in page memory and are cleared on sign-out; refresh requires signing in again. This is a deliberately limited initial authentication step, not full session persistence.
- No financial data is sent to Supabase by this account panel. Existing records remain local and are not linked to the account until migration and authorization testing are complete.
- Automated static checks cover the public-key boundary and truthful storage disclosure. Real account creation/sign-in and two-user RLS tests still require end-to-end verification.
