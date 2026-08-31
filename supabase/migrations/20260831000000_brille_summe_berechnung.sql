-- Issue #52: Summenberechnung automatisieren
--
-- `brille."Summe"` wurde bisher manuell über ein Zahlenfeld gepflegt. Diese
-- Migration macht sie zu einem serverseitig berechneten Wert, unabhängig
-- davon, über welchen UI-Pfad Glas, Fassung, Rabatt oder Zusatzleistungen
-- geändert werden:
--
--   Summe = (GlasLinks.Betrag + GlasRechts.Betrag + Fassung.Betrag)
--           * (1 - RabattProzent / 100)
--           + Summe(Zusatzleistung.Betrag für alle ZusatzleistungIDs)
--
-- Der Rabatt (RabattBezeichnung/RabattProzent, siehe Issue #22) wirkt dabei
-- nur auf Glas links + Glas rechts + Fassung, nicht auf Zusatzleistungen.
--
-- Umsetzung:
--   - Eine BEFORE INSERT/UPDATE-Trigger-Funktion auf `brille` berechnet
--     "Summe" bei jeder Änderung der Zeile direkt neu (kein Rekursionsrisiko,
--     da sie nur NEW verändert statt ein separates UPDATE abzusetzen).
--   - AFTER-Trigger auf `glass`, `fassung` und `brille_hat_zusatzleistungen`
--     stoßen ein No-Op-Update ("Summe" = "Summe") auf die betroffene(n)
--     `brille`-Zeile(n) an, damit deren BEFORE-Trigger neu rechnet, sobald
--     sich ein referenzierter Preis oder eine Zusatzleistungs-Zuordnung
--     ändert.
--   - Ein abschließendes Backfill-Update berechnet "Summe" für alle
--     bestehenden Aufträge einmalig neu, statt sie auf 0 zurückzusetzen.

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

  select coalesce(sum(z."Betrag"), 0) into v_zusatzleistungen_summe
  from public.brille_hat_zusatzleistungen bhz
  join public.zusatzleistung z on z.id = bhz."ZusatzleistungID"
  where bhz."BrillenID" = new.id;

  new."Summe" := round(
    (
      (v_glas_links_betrag + v_glas_rechts_betrag + v_fassung_betrag)
      * (1 - coalesce(new."RabattProzent", 0) / 100.0)
    ) + v_zusatzleistungen_summe,
    2
  );

  return new;
end;
$$;

drop trigger if exists brille_calc_summe_trigger on public.brille;
create trigger brille_calc_summe_trigger
  before insert or update
  on public.brille
  for each row
  execute function public.brille_calc_summe();

-- Ein referenzierter Glas-Preis hat sich geändert: alle Aufträge neu rechnen,
-- die dieses Glas links oder rechts verbaut haben.
create or replace function public.trg_glass_recalc_brille_summe()
returns trigger
language plpgsql
as $$
begin
  update public.brille
  set "Summe" = "Summe"
  where "GlasLinks" = new.id or "GlasRechts" = new.id;

  return null;
end;
$$;

drop trigger if exists glass_recalc_brille_summe_trigger on public.glass;
create trigger glass_recalc_brille_summe_trigger
  after update of "Betrag"
  on public.glass
  for each row
  execute function public.trg_glass_recalc_brille_summe();

-- Ein referenzierter Fassungs-Preis hat sich geändert: betroffene Aufträge
-- neu rechnen.
create or replace function public.trg_fassung_recalc_brille_summe()
returns trigger
language plpgsql
as $$
begin
  update public.brille
  set "Summe" = "Summe"
  where "Fassung" = new.id;

  return null;
end;
$$;

drop trigger if exists fassung_recalc_brille_summe_trigger on public.fassung;
create trigger fassung_recalc_brille_summe_trigger
  after update of "Betrag"
  on public.fassung
  for each row
  execute function public.trg_fassung_recalc_brille_summe();

-- Eine Zusatzleistungs-Zuordnung wurde hinzugefügt, entfernt oder geändert:
-- den zugehörigen Auftrag neu rechnen.
create or replace function public.trg_zusatzleistung_join_recalc_brille_summe()
returns trigger
language plpgsql
as $$
declare
  v_brille_id bigint;
begin
  v_brille_id := coalesce(new."BrillenID", old."BrillenID");

  update public.brille
  set "Summe" = "Summe"
  where id = v_brille_id;

  return null;
end;
$$;

drop trigger if exists brille_hat_zusatzleistungen_recalc_summe_trigger
  on public.brille_hat_zusatzleistungen;
create trigger brille_hat_zusatzleistungen_recalc_summe_trigger
  after insert or update or delete
  on public.brille_hat_zusatzleistungen
  for each row
  execute function public.trg_zusatzleistung_join_recalc_brille_summe();

-- Backfill: bestehende Aufträge einmalig neu berechnen (kein Reset auf 0).
update public.brille set "Summe" = "Summe";

comment on column public.brille."Summe" is
  'Berechnet aus (GlasLinks.Betrag + GlasRechts.Betrag + Fassung.Betrag) * (1 - RabattProzent / 100) + Summe(Zusatzleistung.Betrag). Wird per Trigger (siehe brille_calc_summe) automatisch gepflegt, Issue #52.';
