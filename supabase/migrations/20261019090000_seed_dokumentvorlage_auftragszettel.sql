-- Neues Formular "Auftragszettel" im Formulare-Dialog: A5-Auftragszettel
-- nach der Papiervorlage (vorne der Auftrag mit Auftragsbedingungen,
-- hinten der Anamnesebogen), wahlweise leer zum Ausfüllen von Hand oder mit
-- den Daten des Auftrags. Das Layout kommt aus
-- my-admin/src/auftragszettelTemplate.ts; auch über den Knopf
-- "Auftragszettel" in der Brillenkartei.
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
    'Antrag Jugendamt',
    'Auftragszettel'
  ));

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Auftragszettel A5 (mit Anamnesebogen)',
  'Auftragszettel',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Layout kommt aus my-admin/src/auftragszettelTemplate.ts (Auftragszettel A5, Rückseite Anamnesebogen; leer oder ausgefüllt).',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Auftragszettel'
);
