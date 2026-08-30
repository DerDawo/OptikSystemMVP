-- Remove leftover "public"/"anon" policies and make sure every table in the
-- public schema only grants access to authenticated users.
--
-- Root cause: Supabase Studio auto-creates a policy scoped to the Postgres
-- "public" pseudo-role (or to "anon") whenever a table is created through
-- the UI without RLS configured. Postgres combines multiple permissive
-- policies on the same table with OR, so even after the migration in
-- 20260828000000_restrict_access_to_authenticated_users.sql added
-- authenticated-only policies, any leftover public/anon policy on the same
-- table still let unauthenticated requests through the anon API key.
--
-- This migration drops every policy that is not scoped exclusively to the
-- "authenticated" role, then ensures RLS is enabled and an authenticated-only
-- policy exists on every table in the public schema (not just the 8 tables
-- covered by the earlier migration), so newly added tables are covered too.

do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and not (roles = array['authenticated']::name[])
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
    raise notice 'Dropped non-authenticated policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
  end loop;
end $$;

do $$
declare
  tbl record;
begin
  for tbl in
    select tablename from pg_tables where schemaname = 'public'
  loop
    execute format('alter table public.%I enable row level security', tbl.tablename);

    if not exists (
      select 1 from pg_policies
      where schemaname = 'public'
        and tablename = tbl.tablename
        and roles = array['authenticated']::name[]
    ) then
      execute format(
        'create policy %I on public.%I for all to authenticated using (true) with check (true)',
        'Authenticated users can manage ' || tbl.tablename,
        tbl.tablename
      );
    end if;
  end loop;
end $$;
