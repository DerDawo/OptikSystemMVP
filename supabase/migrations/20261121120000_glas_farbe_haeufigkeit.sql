-- Auswahl im Feld "Farbe" (Tönung) der Brillenkartei: alle bisher
-- eingetragenen Tönungen mit Anzahl, die häufigsten zuerst. Gleiche Einträge
-- mit anderer Groß-/Kleinschreibung oder Leerzeichen werden zusammengefasst
-- (angezeigt wird die häufigste Schreibweise).
-- Nur eine Ansicht, keine Änderung an Daten.
-- security_invoker: es gelten die RLS-Regeln der Tabelle für den Benutzer.

create or replace view public.glas_farbe_haeufigkeit
with (security_invoker = true) as
with farben as (
  select
    regexp_replace(btrim("Farbe"), '\s+', ' ', 'g') as farbe
  from public.glastyp
  where coalesce(btrim("Farbe"), '') <> ''
)
select
  mode() within group (order by farbe) as "Farbe",
  count(*)::int as "Anzahl"
from farben
group by lower(farbe);

comment on view public.glas_farbe_haeufigkeit is
  'Brillenkartei: bisher eingetragene Glastönungen mit Häufigkeit (Auswahl im Feld Farbe).';

revoke all on public.glas_farbe_haeufigkeit from anon;
grant select on public.glas_farbe_haeufigkeit to authenticated;
