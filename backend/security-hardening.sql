-- Applied to the dedicated CloutFlow Supabase project on 2026-11-20.
-- Restrict execution of an existing public SECURITY DEFINER event-trigger function.
-- The event trigger still executes as part of DDL; this blocks API invocation.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
