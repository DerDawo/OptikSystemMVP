-- Restrict access to application data to authenticated Supabase users.
--
-- Until now, Row Level Security (RLS) was not enabled on the application
-- tables. Since the frontend talks to Supabase directly with the public
-- anon key, this meant that anybody with that key (which ships inside the
-- frontend bundle) could read, create, update and delete all data without
-- ever logging in.
--
-- See: https://github.com/DerDawo/OptikSystemMVP/issues/40

alter table public.kunde enable row level security;
alter table public.brille enable row level security;
alter table public.glass enable row level security;
alter table public.glastyp enable row level security;
alter table public.fassung enable row level security;
alter table public.brille_hat_zusatzleistungen enable row level security;
alter table public.kunde_leistet_zauzahlung_fuer_brille enable row level security;
alter table public.zusatzleistung enable row level security;

drop policy if exists "Authenticated users can manage kunde" on public.kunde;
create policy "Authenticated users can manage kunde" on public.kunde
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can manage brille" on public.brille;
create policy "Authenticated users can manage brille" on public.brille
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can manage glass" on public.glass;
create policy "Authenticated users can manage glass" on public.glass
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can manage glastyp" on public.glastyp;
create policy "Authenticated users can manage glastyp" on public.glastyp
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can manage fassung" on public.fassung;
create policy "Authenticated users can manage fassung" on public.fassung
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can manage brille_hat_zusatzleistungen" on public.brille_hat_zusatzleistungen;
create policy "Authenticated users can manage brille_hat_zusatzleistungen" on public.brille_hat_zusatzleistungen
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can manage kunde_leistet_zauzahlung_fuer_brille" on public.kunde_leistet_zauzahlung_fuer_brille;
create policy "Authenticated users can manage kunde_leistet_zauzahlung_fuer_brille" on public.kunde_leistet_zauzahlung_fuer_brille
  for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Authenticated users can manage zusatzleistung" on public.zusatzleistung;
create policy "Authenticated users can manage zusatzleistung" on public.zusatzleistung
  for all
  to authenticated
  using (true)
  with check (true);
