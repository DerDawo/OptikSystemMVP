-- Glasbestellstatistik (Statistiken): je Monat eines Jahres und des
-- Vorjahres die Brillenaufträge mit Gläsern, die Anzahl Gläser und der
-- Glasumsatz (glass."Betrag" je Glas). Monat nach Auftragsdatum, deutsche
-- Zeit. Nur lesen; security invoker: es gelten die Rechte des Benutzers.

create or replace function public.glas_statistik_monat(p_jahr int)
returns table (
  jahr int,
  monat int,
  auftraege int,
  glaeser int,
  umsatz numeric
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    extract(year from b."Datum" at time zone 'Europe/Berlin')::int as jahr,
    extract(month from b."Datum" at time zone 'Europe/Berlin')::int as monat,
    count(*)::int as auftraege,
    sum((b."GlasRechts" is not null)::int + (b."GlasLinks" is not null)::int)::int
      as glaeser,
    coalesce(sum(coalesce(gr."Betrag", 0) + coalesce(gl."Betrag", 0)), 0)
      as umsatz
  from public.brille b
  left join public.glass gr on gr.id = b."GlasRechts"
  left join public.glass gl on gl.id = b."GlasLinks"
  where (b."GlasRechts" is not null or b."GlasLinks" is not null)
    and b."Datum" >= make_date(p_jahr - 1, 1, 1)
    and b."Datum" < make_date(p_jahr + 1, 1, 1)
  group by 1, 2
  order by 1, 2;
$$;

revoke all on function public.glas_statistik_monat(int) from public, anon;
grant execute on function public.glas_statistik_monat(int) to authenticated;
