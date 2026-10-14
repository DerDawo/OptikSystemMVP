-- Rabatt als fester Euro-Betrag (Brillenkartei, Feld "Betrag" in der
-- Rabattzeile): wird von der Summe abgezogen - unabhängig davon, ob schon
-- Glas- oder Fassungspreise eingetragen sind. Ein Prozent-Rabatt wirkt wie
-- bisher auf Glas rechts + Glas links + Fassung.
-- Nur eine neue, leere Spalte; bestehende Summen ändern sich nicht (ohne
-- Euro-Rabatt rechnet die Funktion genau wie bisher).

alter table public.brille
  add column if not exists "RabattBetrag" numeric(10, 2);

comment on column public.brille."RabattBetrag" is
  'Fester Rabatt in Euro, wird von der Summe abgezogen (zusätzlich zu RabattProzent).';

create or replace function public.brille_calc_summe()
returns trigger
language plpgsql
as $function$
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
    ) + v_zusatzleistungen_summe + coalesce(new."WeitereLeistungen", 0)
      - coalesce(new."RabattBetrag", 0),
    2
  );

  return new;
end;
$function$;
