-- Issue #131: Prisma-Altaufträge behalten ihre Summe, Belege gehen auf.
--
-- Bei den aus Prisma übernommenen Aufträgen (#80) ist "Summe" die
-- Prisma-Summe. Sie enthält Freitext-Leistungen (Einschleifen, Refraktion,
-- Rabatte, ...), die nur in den Notizen stehen, weil es dafür keinen
-- Katalogbezug gibt. brille_calc_summe() rechnet bei JEDER Änderung einer
-- brille-Zeile neu (auch bei Rechnungsnummer-Vergabe oder Zahlungsstatus)
-- und ließ diese Leistungen dabei weg; Rechnung, Kostenvoranschlag und
-- Werkstattauftrag listeten sie ebenfalls nicht als Position.
--
-- Neu: "WeitereLeistungen" - ein Betrag für Leistungen bzw. Nachlässe ohne
-- Katalogbezug. Er zählt zur Summe (ohne Rabatt, wie Zusatzleistungen) und
-- erscheint auf den Belegen als eigene Position. Für die Prisma-Altaufträge
-- wird er einmalig als Differenz zwischen Prisma-Summe und den Einzelposten
-- befüllt, sodass sich keine Summe ändert.

alter table public.brille
  add column if not exists "WeitereLeistungen" numeric(10, 2) default 0;

comment on column public.brille."WeitereLeistungen" is
  'Leistungen/Nachlässe ohne Katalogbezug (z. B. aus Prisma übernommene Freitext-Leistungen, siehe Notizen). Zählt ohne Rabatt zur Summe (#131).';

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
    ) + v_zusatzleistungen_summe + coalesce(new."WeitereLeistungen", 0),
    2
  );

  return new;
end;
$$;

-- Backfill nur für Prisma-Altaufträge (erkennbar an der Import-Notiz) mit
-- vorhandener Summe. Der BEFORE-Trigger rechnet beim Update
-- Summe = Einzelposten + WeitereLeistungen = bisherige Summe.
with basis as (
  select
    b.id,
    round(
      (
        coalesce(gl."Betrag", 0) + coalesce(gr."Betrag", 0) + coalesce(f."Betrag", 0)
      ) * (1 - coalesce(b."RabattProzent", 0) / 100.0)
      + coalesce((
          select sum(z."Betrag")
          from public.brille_hat_zusatzleistungen bhz
          join public.zusatzleistung z on z.id = bhz."ZusatzleistungID"
          where bhz."BrillenID" = b.id
        ), 0),
      2
    ) as einzelposten
  from public.brille b
  left join public.glass gl on gl.id = b."GlasLinks"
  left join public.glass gr on gr.id = b."GlasRechts"
  left join public.fassung f on f.id = b."Fassung"
  where b."Summe" is not null
    and b."Notizen" like '%Übernommen aus Prisma (Auftrag Nr.%'
)
update public.brille b
set "WeitereLeistungen" = round(b."Summe" - basis.einzelposten, 2)
from basis
where b.id = basis.id
  and b."Summe" <> basis.einzelposten;
