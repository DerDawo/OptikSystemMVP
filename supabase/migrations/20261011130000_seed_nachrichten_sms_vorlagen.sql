-- SMS-/WhatsApp-Vorlagen für "Nachricht senden" beim Kunden: Abholung von
-- Brille und Kontaktlinsen, Terminerinnerung, Rückruf zum Einschleifen und
-- Nachsendung der Rechnung.
--
-- Platzhalter (my-admin/src/nachrichtenPlatzhalter.ts): {Vorname},
-- {Nachname}, {Anrede}, {Optiker} (Name des Betriebs), {OptikerTelefon},
-- {Termindatum} und {Terminuhrzeit} (nächster anstehender Termin des Kunden).
-- Bereits vorhandene Vorlagen mit gleichem Titel bleiben unverändert.

insert into public.nachrichten ("Titel", "Text")
select v.titel, v.text
from (values
  (
    'Brille fertig (Abholung)',
    'Hallo {Vorname}, gute Nachrichten! Deine neue Brille ist fertig montiert und liegt zur Abholung bereit. Bitte bring deine aktuelle Brille mit. Wir freuen uns auf dich! Dein Team von {Optiker}.'
  ),
  (
    'Kontaktlinsen / Pflegemittel abholbereit',
    'Hallo {Vorname}, deine bestellten Kontaktlinsen bzw. Pflegemittel sind da! Du kannst sie ab sofort bei uns im Geschäft abholen. Dein Team von {Optiker}.'
  ),
  (
    'Terminerinnerung Sehtest / Beratung',
    'Hallo {Vorname}, wir erinnern dich an deinen Sehtest-Termin am {Termindatum} um {Terminuhrzeit} Uhr bei {Optiker}. Falls etwas dazwischenkommt, gib uns bitte kurz Bescheid. Bis bald!'
  ),
  (
    'Brillengläser da – bitte um Rückruf',
    'Hallo {Vorname}, deine neuen Brillengläser sind da! Damit wir sie direkt in deine Brille einschleifen können, melde dich bitte kurz telefonisch unter {OptikerTelefon} für eine Terminabsprache. Dein Team von {Optiker}.'
  ),
  (
    'Rechnung per WhatsApp nachgesendet',
    'Guten Tag {Anrede} {Nachname}, zur Sicherheit haben wir Ihnen Ihre Rechnung soeben noch einmal per WhatsApp zugeschickt. Falls Sie Rückfragen dazu haben, rufen Sie uns einfach unter {OptikerTelefon} an. Ihr Team von {Optiker}.'
  )
) as v (titel, text)
where not exists (
  select 1 from public.nachrichten n where n."Titel" = v.titel
);
