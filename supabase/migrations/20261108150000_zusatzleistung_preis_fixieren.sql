-- Katalogpreise der Zusatzleistungen dauerhaft ändern, ohne alte Aufträge
-- zu verändern: Ändert sich zusatzleistung."Betrag", bekommen alle
-- Zuordnungen, die bisher den Katalogpreis nutzten (Betrag leer), den alten
-- Preis fest eingetragen. Deren Auftragssumme wird dabei nicht neu
-- berechnet (sonst könnten aus Prisma übernommene Summen kippen). Neue
-- Aufträge bekommen den neuen Preis.
-- Danach: Glaseinschliff von 28,90 € auf 24,95 €.

create or replace function public.trg_zusatzleistung_join_recalc_brille_summe()
returns trigger
language plpgsql
as $$
declare
  v_brille_id bigint;
begin
  -- beim Festschreiben alter Preise (zusatzleistung_preis_fixieren) nicht
  -- neu rechnen: der Betrag bleibt derselbe
  if coalesce(current_setting('unicorn.preis_fixieren', true), '') = 'an' then
    return null;
  end if;

  v_brille_id := coalesce(new."BrillenID", old."BrillenID");

  update public.brille
  set "Summe" = "Summe"
  where id = v_brille_id;

  return null;
end;
$$;

create or replace function public.zusatzleistung_preis_fixieren()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old."Betrag" is not distinct from new."Betrag" then
    return new;
  end if;
  perform set_config('unicorn.preis_fixieren', 'an', true);
  update public.brille_hat_zusatzleistungen
  set "Betrag" = old."Betrag"
  where "ZusatzleistungID" = old.id
    and "Betrag" is null;
  perform set_config('unicorn.preis_fixieren', '', true);
  return new;
end;
$$;

drop trigger if exists zusatzleistung_preis_fixieren_trigger
  on public.zusatzleistung;
create trigger zusatzleistung_preis_fixieren_trigger
  before update of "Betrag" on public.zusatzleistung
  for each row
  execute function public.zusatzleistung_preis_fixieren();

update public.zusatzleistung
set "Betrag" = 24.95
where "Bezeichnung" = 'Glaseinschliff';
