-- Fortlaufende Verordnungsnummer (Format JJJJ-NNNN) für die kurze
-- optometrische Verordnung. Vergeben beim ersten Öffnen der Verordnung zu
-- einem Auftrag und in brille."Verordnungsnummer" gespeichert, damit ein
-- erneuter Druck dieselbe Nummer trägt. Ein Zähler pro Jahr, gesperrt beim
-- Hochzählen (wie assign_rechnungsnummer). Neue Spalte und Tabelle, keine
-- Änderung an bestehenden Daten.

alter table public.brille
  add column if not exists "Verordnungsnummer" text unique;

comment on column public.brille."Verordnungsnummer" is
  'Fortlaufende Nummer der optometrischen Verordnung (JJJJ-NNNN); nur über assign_verordnungsnummer() gesetzt.';

create table if not exists public.verordnungsnummer_zaehler (
  jahr integer primary key,
  letzte_nummer integer not null default 0
);

comment on table public.verordnungsnummer_zaehler is
  'Zähler je Jahr für die Verordnungsnummer; wird ausschließlich über assign_verordnungsnummer() gepflegt.';

alter table public.verordnungsnummer_zaehler enable row level security;

drop policy if exists "Authenticated users can read verordnungsnummer_zaehler"
  on public.verordnungsnummer_zaehler;
create policy "Authenticated users can read verordnungsnummer_zaehler"
  on public.verordnungsnummer_zaehler
  for select
  to authenticated
  using (true);

create or replace function public.assign_verordnungsnummer(p_brille_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bestehende text;
  v_jahr integer := extract(year from now())::integer;
  v_naechste integer;
  v_neu text;
begin
  select "Verordnungsnummer" into v_bestehende
  from public.brille
  where id = p_brille_id
  for update;

  if not found then
    raise exception 'Auftrag % nicht gefunden', p_brille_id;
  end if;

  if v_bestehende is not null and v_bestehende <> '' then
    return v_bestehende;
  end if;

  insert into public.verordnungsnummer_zaehler (jahr, letzte_nummer)
  values (v_jahr, 1)
  on conflict (jahr) do update
    set letzte_nummer = public.verordnungsnummer_zaehler.letzte_nummer + 1
  returning letzte_nummer into v_naechste;

  v_neu := v_jahr || '-' || lpad(v_naechste::text, 4, '0');

  update public.brille
  set "Verordnungsnummer" = v_neu
  where id = p_brille_id;

  return v_neu;
end;
$$;

revoke all on function public.assign_verordnungsnummer(bigint) from public;
grant execute on function public.assign_verordnungsnummer(bigint) to authenticated;
