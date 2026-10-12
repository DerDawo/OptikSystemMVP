-- Kundennotizen enthalten nur noch medizinische Angaben.
-- Alle übrigen Zeilen (aus Prisma: Protokolle von Kundenzusammenführungen,
-- "In Prisma als gelöscht markiert", "Anrede (Prisma): …",
-- "Telefon geschäftlich (Prisma): …", organisatorische Memos) wandern in die
-- neue Spalte kunde."PrismaAngaben" - verschoben, nicht gelöscht; die
-- Kundenseite zeigt sie klein am Ende.
-- Eine Zeile bleibt in den Notizen, wenn sie einen medizinischen Begriff
-- enthält (Liste unten, gleiche Liste in
-- supabase/scripts/prisma_import/prisma_import.py). Reine Trenn-/Leerzeilen
-- entfallen.

alter table public.kunde
  add column if not exists "PrismaAngaben" text;

comment on column public.kunde."PrismaAngaben" is
  'Aus Prisma übernommene, nicht medizinische Angaben (früher in den Notizen), z. B. Protokolle von Kundenzusammenführungen. Die Notizen enthalten nur medizinische Angaben.';

with zeilen as (
  select k.id, t.zeile, t.nr
  from public.kunde k,
    unnest(string_to_array(k."Notizen", E'\n')) with ordinality as t(zeile, nr)
  where k."Notizen" is not null and btrim(k."Notizen") <> ''
),
markiert as (
  select
    z.*,
    z.zeile ~ '^[\s",*\-]*$' as leer,
    z.zeile ~* '(katarakt|grauer star|glaukom|grüner star|diabet|\mop\M|cat-op|operiert|augenarzt|allerg|sicca|trockene? auge|amblyop|schiel|makula|netzhaut|medikament|keratokonus|hornhaut|augentropfen|sehschw|blind|migräne|epilep)'
      as medizinisch
  from zeilen z
),
neu as (
  select
    id,
    string_agg(zeile, E'\n' order by nr) filter (where medizinisch and not leer) as notizen,
    string_agg(zeile, E'\n' order by nr) filter (where not medizinisch and not leer) as angaben,
    bool_or(not medizinisch or leer) as aendern
  from markiert
  group by id
)
update public.kunde k
set
  "Notizen" = neu.notizen,
  "PrismaAngaben" = neu.angaben
from neu
where neu.id = k.id
  and neu.aendern;
