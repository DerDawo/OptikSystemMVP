-- Neues Formular "Antrag auf Kostenübernahme (Jugendamt)" im Formulare-Dialog:
-- Brief an das Jugendamt mit Kundendaten und Betrag (Endpreis), Seite 2 der
-- Kostenvoranschlag. Das Layout kommt aus my-admin/src/antragTemplate.ts.
-- Nur eine neue Kategorie und ein neuer Vorlagen-Datensatz, keine Kundendaten.

alter table public.dokumentvorlage
  drop constraint if exists dokumentvorlage_kategorie_check;
alter table public.dokumentvorlage
  add constraint dokumentvorlage_kategorie_check check ("Kategorie" in (
    'Sehtest',
    'Werkstattkarte',
    'Berechtigungsschein',
    'Privatrezept',
    'Rezeptdruck Arzt',
    'Reparaturschein',
    'Rechnung',
    'Mahnung',
    'Antrag Zuschuss',
    'Antrag Sozialamt',
    'Berechtigungsschein AOK',
    'Optometrische Verordnung',
    'Optometrische Verordnung GKV',
    'Beobachtungsbogen',
    'Antrag BAP',
    'Kostenvoranschlag',
    'Erprobungsprotokoll',
    'Rezeptanfrage Augenarzt',
    'Anamnesebogen',
    'Berechtigungsschein GKV',
    'Erprobungsbericht Lupe',
    'Abholbestätigung',
    'Antrag Jugendamt'
  ));

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Antrag auf Kostenübernahme (Jugendamt)',
  'Antrag Jugendamt',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Layout kommt aus my-admin/src/antragTemplate.ts (Antrag an das Jugendamt + Kostenvoranschlag).',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Antrag Jugendamt'
);
