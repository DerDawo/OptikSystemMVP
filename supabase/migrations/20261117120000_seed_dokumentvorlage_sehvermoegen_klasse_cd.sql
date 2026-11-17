-- Neues Formular "Bescheinigung über die Untersuchung des Sehvermögens" für
-- die Klassen C/D (Lkw/Bus) nach Anlage 6 Nr. 2.1 FeV, die Augenoptikerbetriebe
-- nach § 12 Abs. 6 FeV ausstellen dürfen. Teil 1 bleibt im Betrieb, Teil 2 ist
-- für die Fahrerlaubnisbehörde. Layout: my-admin/src/sehtestFahrerlaubnisTemplate.ts.
-- Dazu das Merkblatt mit Grenzwerten und Ausschlusskriterien
-- (my-admin/src/merkblattSehtestLkwTemplate.ts).
-- Nur zwei neue Kategorien und Vorlagen-Datensätze, keine Kundendaten.

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
    'Auftragszettel',
    'Gutachten Kinderoptometrie',
    'Glasbestellung POL',
    'Patientenanfrage',
    'Rechnung Bildschirmarbeitsplatzbrille',
    'Rechnung Arbeitsschutzbrille',
    'Antrag SRH',
    'Optometrische Verordnung Vordruck',
    'Trockenes Auge',
    'Antrag Jobcenter',
    'Auswertungsbogen',
    'Sehvermögen Klasse C/D',
    'Merkblatt Sehtest Lkw/Bus'
  ));

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Bescheinigung Sehvermögen Lkw/Bus (Anlage 6 Nr. 2.1 FeV)',
  'Sehvermögen Klasse C/D',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Layout kommt aus my-admin/src/sehtestFahrerlaubnisTemplate.ts.',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Sehvermögen Klasse C/D'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Merkblatt Sehtest Lkw/Bus (Grenzwerte und Ausschlusskriterien)',
  'Merkblatt Sehtest Lkw/Bus',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Layout kommt aus my-admin/src/merkblattSehtestLkwTemplate.ts.',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Merkblatt Sehtest Lkw/Bus'
);
