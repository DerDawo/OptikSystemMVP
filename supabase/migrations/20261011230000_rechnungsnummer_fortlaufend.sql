-- Rechnungsnummern fortlaufend als reine Zahl, im Anschluss an die letzte
-- Rechnungsnummer aus Prisma (114877): die nächste Rechnung erhält 114878.
-- Ersetzt das Format R-JJJJ-NNNN (Migration 20260831020000), das nicht zum
-- Nummernkreis des Betriebs passt.
--
-- - Ein einziger Zähler (Zeile id = 1) statt eines Zählers je Jahr; das
--   Hochzählen sperrt die Zeile, parallele Aufrufe vergeben keine doppelten
--   und keine übersprungenen Nummern.
-- - Bereits vergebene Nummern im alten Format werden in der Reihenfolge ihrer
--   Vergabe umnummeriert (R-2026-0001 -> 114878, R-2026-0002 -> 114879, ...),
--   der Zähler steht danach auf der letzten vergebenen Nummer.
-- - Startwert ist mindestens die höchste vorhandene numerische Nummer, damit
--   keine Nummer doppelt vorkommt.
-- - Der Summen-Trigger wird beim Umnummerieren ausgesetzt (reine
--   Nummernänderung, keine Summe ändert sich).

create table if not exists public.rechnungsnummer_stand (
  id smallint primary key default 1 check (id = 1),
  letzte_nummer bigint not null
);

comment on table public.rechnungsnummer_stand is
  'Letzte vergebene Rechnungsnummer (fortlaufend, im Anschluss an Prisma 114877). Wird ausschließlich über assign_rechnungsnummer() gepflegt.';

alter table public.rechnungsnummer_stand enable row level security;

drop policy if exists "Authenticated users can read rechnungsnummer_stand" on public.rechnungsnummer_stand;
create policy "Authenticated users can read rechnungsnummer_stand" on public.rechnungsnummer_stand
  for select
  to authenticated
  using (true);

insert into public.rechnungsnummer_stand (id, letzte_nummer)
select 1, greatest(
  114877,
  coalesce((select max("Rechnungsnummer"::bigint) from public.brille where "Rechnungsnummer" ~ '^\d+$'), 0)
)
on conflict (id) do nothing;

-- Umnummerieren der Nummern im alten Format
alter table public.brille disable trigger brille_calc_summe_trigger;

with alt as (
  select id, row_number() over (order by "Rechnungsnummer") as nr
  from public.brille
  where "Rechnungsnummer" like 'R-%'
),
stand as (
  select letzte_nummer from public.rechnungsnummer_stand where id = 1
)
update public.brille b
set "Rechnungsnummer" = (stand.letzte_nummer + alt.nr)::text
from alt, stand
where b.id = alt.id;

alter table public.brille enable trigger brille_calc_summe_trigger;

update public.rechnungsnummer_stand
set letzte_nummer = greatest(
  letzte_nummer,
  coalesce((select max("Rechnungsnummer"::bigint) from public.brille where "Rechnungsnummer" ~ '^\d+$'), 0)
)
where id = 1;

create or replace function public.assign_rechnungsnummer(p_brille_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bestehende_nummer text;
  v_neue_rechnungsnummer text;
begin
  select "Rechnungsnummer" into v_bestehende_nummer
  from public.brille
  where id = p_brille_id
  for update;

  if not found then
    raise exception 'Auftrag % nicht gefunden', p_brille_id;
  end if;

  if v_bestehende_nummer is not null and v_bestehende_nummer <> '' then
    return v_bestehende_nummer;
  end if;

  update public.rechnungsnummer_stand
  set letzte_nummer = letzte_nummer + 1
  where id = 1
  returning letzte_nummer::text into v_neue_rechnungsnummer;

  if v_neue_rechnungsnummer is null then
    raise exception 'Rechnungsnummer-Zähler fehlt (Tabelle rechnungsnummer_stand)';
  end if;

  update public.brille
  set "Rechnungsnummer" = v_neue_rechnungsnummer
  where id = p_brille_id;

  return v_neue_rechnungsnummer;
end;
$$;

grant execute on function public.assign_rechnungsnummer(bigint) to authenticated;

comment on function public.assign_rechnungsnummer(bigint) is
  'Vergibt beim ersten Aufruf für einen Auftrag die nächste fortlaufende Rechnungsnummer (reine Zahl, Anschluss an Prisma 114877) und speichert sie in brille."Rechnungsnummer". Ist bereits eine Nummer gesetzt, wird diese unverändert zurückgegeben.';

comment on table public.rechnungsnummer_zaehler is
  'Nicht mehr verwendet (früher Zähler je Jahr für das Format R-JJJJ-NNNN); ersetzt durch rechnungsnummer_stand.';
