-- Issue #57: Mahnungen - Mahnstufe je Auftrag tracken und eine ableitbare
-- "Restbetrag"-Spalte ergänzen, damit offene/überfällige Zahlungen serverseitig
-- gefiltert werden können (Mahnungen.tsx).
--
-- "Mahnstufe" zählt analog zum Muster der Rechnungsnummer-Vergabe (#56,
-- assign_rechnungsnummer) hoch, sobald in der Brillenkartei/Mahnungen-Übersicht
-- eine Mahnung erstellt wird - hier reicht ein einfaches Hochzählen ohne
-- globalen Zähler, da die Stufe nur je Auftrag (nicht fortlaufend über alle
-- Aufträge) zählt. Sie ist auf 3 begrenzt (0 = keine Mahnung, 1/2/3 = erste/
-- zweite/dritte Mahnung), da nur bis zur dritten Mahnungsstufe Vorlagen
-- vorgesehen sind (siehe Seed-Migration).
--
-- "Restbetrag" ist als generierte Spalte (statt nur clientseitig berechnet
-- wie {{brille.restbetrag}} in documentTemplateEngine.ts) angelegt, damit sie
-- über PostgREST-Filter (z. B. "Restbetrag@gt": 0) in der Mahnungen-Übersicht
-- genutzt werden kann.
--
-- See: https://github.com/DerDawo/OptikSystemMVP/issues/57

alter table public.brille
  add column if not exists "Mahnstufe" integer not null default 0;

alter table public.brille
  drop constraint if exists brille_mahnstufe_check;
alter table public.brille
  add constraint brille_mahnstufe_check check ("Mahnstufe" between 0 and 3);

alter table public.brille
  add column if not exists "Restbetrag" numeric(10, 2)
  generated always as (
    round(coalesce("Summe", 0) - coalesce("Anzahlung", 0) - coalesce("KKAnteil", 0), 2)
  ) stored;

comment on column public.brille."Mahnstufe" is
  'Mahnstufe des Auftrags (0 = keine Mahnung, 1/2/3 = erste/zweite/dritte Mahnung). Wird ausschließlich über increment_mahnstufe() hochgezählt, Issue #57.';
comment on column public.brille."Restbetrag" is
  'Generierte Spalte = Summe - Anzahlung - KKAnteil, für serverseitige Filter/Sortierung (z. B. Mahnungen-Übersicht), Issue #57.';

create or replace function public.increment_mahnstufe(p_brille_id bigint)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_neue_mahnstufe integer;
begin
  update public.brille
  set "Mahnstufe" = least("Mahnstufe" + 1, 3)
  where id = p_brille_id
  returning "Mahnstufe" into v_neue_mahnstufe;

  if v_neue_mahnstufe is null then
    raise exception 'Auftrag % nicht gefunden', p_brille_id;
  end if;

  return v_neue_mahnstufe;
end;
$$;

grant execute on function public.increment_mahnstufe(bigint) to authenticated;

comment on function public.increment_mahnstufe(bigint) is
  'Zählt beim Erstellen einer Mahnung die Mahnstufe eines Auftrags um 1 hoch (max. 3) und gibt die neue Stufe zurück, Issue #57.';
