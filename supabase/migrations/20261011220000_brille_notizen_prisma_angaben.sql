-- Notizen der Brillenaufträge enthalten nur noch echte Notizen.
-- Der Prisma-Import (supabase/scripts/prisma_import) hatte zusätzlich in die
-- Notizen geschrieben:
--   - "Leistungen:" mit den Freitext-Leistungen ("- Glaseinschliff: 29,50 €")
--   - "Kassenabrechnung: …", "Kassenpositionen: …", "Zuzahlung: …"
--   - "Merkmal: …", "Rechnungsdatum: …"
-- Diese Zeilen werden in die neue Spalte "PrismaAngaben" verschoben (nicht
-- gelöscht). Rechnung, Kostenvoranschlag und Karteikarte lesen die
-- Einzelleistungen von dort (my-admin/src/leistungenAusNotizen.ts), die
-- Karteikarte zeigt die Angaben klein am Ende.
--
-- Der Trigger brille_calc_summe rechnet bei jedem UPDATE die Summe neu; für
-- diese reine Textverschiebung wird er ausgesetzt, damit keine Summe sich
-- ändert.

alter table public.brille
  add column if not exists "PrismaAngaben" text;

comment on column public.brille."PrismaAngaben" is
  'Aus Prisma übernommene Zusatzangaben (Freitext-Leistungen, Kassenabrechnung, Merkmale, Rechnungsdatum), früher Teil der Notizen. Die Leistungszeilen ("Leistungen:" / "- Name: 29,50 €") schlüsseln brille."WeitereLeistungen" auf Rechnungen auf.';

alter table public.brille disable trigger brille_calc_summe_trigger;

with zeilen as (
  select
    b.id,
    t.zeile,
    t.nr,
    -- Gruppe = eine Zeile ohne führendes "- " und die direkt folgenden
    -- "- "-Zeilen (so gehören die Leistungszeilen zu "Leistungen:")
    sum(case when t.zeile like '- %' then 0 else 1 end)
      over (partition by b.id order by t.nr) as gruppe
  from public.brille b,
    unnest(string_to_array(b."Notizen", E'\n')) with ordinality as t(zeile, nr)
  where b."Notizen" is not null
),
markiert as (
  select
    z.*,
    first_value(btrim(z.zeile, E' \r\t'))
      over (partition by z.id, z.gruppe order by z.nr) = 'Leistungen:'
    or z.zeile ~ '^(Kassenabrechnung|Kassenpositionen|Zuzahlung|Merkmal|Rechnungsdatum): '
      as verschieben
  from zeilen z
),
neu as (
  select
    id,
    string_agg(zeile, E'\n' order by nr) filter (where not verschieben) as notizen,
    string_agg(zeile, E'\n' order by nr) filter (where verschieben) as angaben
  from markiert
  group by id
)
update public.brille b
set
  "PrismaAngaben" = neu.angaben,
  "Notizen" = nullif(btrim(coalesce(neu.notizen, ''), E' \r\n\t'), '')
from neu
where neu.id = b.id
  and neu.angaben is not null;

alter table public.brille enable trigger brille_calc_summe_trigger;
