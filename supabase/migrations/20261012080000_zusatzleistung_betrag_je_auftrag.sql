-- Zusatzleistungen: Betrag je Auftrag änderbar (z. B. Glaseinschliff zu
-- einem anderen Preis als im Katalog), ohne den Katalogpreis für alle
-- Aufträge zu ändern.
--
-- Neue, leere Spalte brille_hat_zusatzleistungen."Betrag": leer = Preis aus
-- dem Katalog (zusatzleistung."Betrag"), gesetzt = Preis für diesen Auftrag.
-- brille_calc_summe() nimmt den Auftragspreis, falls gesetzt; sonst wie
-- bisher den Katalogpreis. Da die Spalte überall leer ist, ändert sich keine
-- bestehende Summe. Der vorhandene Trigger auf brille_hat_zusatzleistungen
-- rechnet den Auftrag nach einer Änderung neu.

alter table public.brille_hat_zusatzleistungen
  add column if not exists "Betrag" numeric(10, 2);

comment on column public.brille_hat_zusatzleistungen."Betrag" is
  'Preis dieser Zusatzleistung für diesen Auftrag; leer = Katalogpreis (zusatzleistung.Betrag).';

create or replace function public.brille_calc_summe()
returns trigger
language plpgsql
as $$
declare
  v_glas_links_betrag numeric := 0;
  v_glas_rechts_betrag numeric := 0;
  v_fassung_betrag numeric := 0;
  v_zusatzleistungen_summe numeric := 0;
begin
  if new."GlasLinks" is not null then
    select coalesce("Betrag", 0) into v_glas_links_betrag
    from public.glass where id = new."GlasLinks";
  end if;

  if new."GlasRechts" is not null then
    select coalesce("Betrag", 0) into v_glas_rechts_betrag
    from public.glass where id = new."GlasRechts";
  end if;

  if new."Fassung" is not null then
    select coalesce("Betrag", 0) into v_fassung_betrag
    from public.fassung where id = new."Fassung";
  end if;

  select coalesce(sum(coalesce(bhz."Betrag", z."Betrag")), 0)
    into v_zusatzleistungen_summe
  from public.brille_hat_zusatzleistungen bhz
  join public.zusatzleistung z on z.id = bhz."ZusatzleistungID"
  where bhz."BrillenID" = new.id;

  new."Summe" := round(
    (
      (v_glas_links_betrag + v_glas_rechts_betrag + v_fassung_betrag)
      * (1 - coalesce(new."RabattProzent", 0) / 100.0)
    ) + v_zusatzleistungen_summe + coalesce(new."WeitereLeistungen", 0),
    2
  );

  return new;
end;
$$;
