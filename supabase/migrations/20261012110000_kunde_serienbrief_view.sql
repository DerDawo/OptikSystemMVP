-- Empfängerauswahl für Serienbriefe (Gehe zu -> Serienbrief): Kundendaten für
-- Anschrift/E-Mail plus je Kunde das Datum der letzten Brille, ob er
-- Gleitsichtträger ist und ob er Kontaktlinsen hat. Nur lesen; die Filter
-- der Seite laufen über diese Ansicht auf dem Server.
-- security_invoker: es gelten die RLS-Regeln der Tabellen für den Benutzer.

create or replace view public.kunde_serienbrief
with (security_invoker = true) as
with brillen as (
  select
    kunde_id,
    max("Datum") as letzte_brille,
    bool_or("BrillenArt" ilike '%gleitsicht%') as gleitsicht
  from public.brille
  where kunde_id is not null
  group by kunde_id
),
linsen as (
  select distinct kunde_id
  from public.kontaktlinse
  where kunde_id is not null
)
select
  k.id,
  k."Anrede",
  k."Vorname",
  k."Nachname",
  k."Straße",
  k."Hausnummer",
  k."Postleitzahl",
  k."Stadt",
  k."Email",
  k."Werbeeinwilligung",
  extract(month from k."Geburtsdatum")::int as "Geburtsmonat",
  b.letzte_brille as "LetzteBrille",
  coalesce(b.gleitsicht, false) as "Gleitsicht",
  (l.kunde_id is not null) as "Kontaktlinsen"
from public.kunde k
left join brillen b on b.kunde_id = k.id
left join linsen l on l.kunde_id = k.id;

comment on view public.kunde_serienbrief is
  'Empfängerauswahl für Serienbriefe (Anschrift, E-Mail, letzte Brille, Gleitsicht, Kontaktlinsen).';

revoke all on public.kunde_serienbrief from anon;
grant select on public.kunde_serienbrief to authenticated;
