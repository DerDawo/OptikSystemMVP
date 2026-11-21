-- Neues Formular "Rechnung Sehtest C/D": Rechnung über den erweiterten
-- Führerscheinsehtest (Sehvermögen für die Klassen C/D und die
-- Fahrgastbeförderung nach Anlage 6 Nr. 2.1 FeV). Layout, Leistungskatalog
-- und Berechnung: my-admin/src/sehtestRechnungTemplate.ts.
-- Nur eine neue Kategorie und ein Vorlagen-Datensatz, keine Kundendaten.

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
    'Merkblatt Sehtest Lkw/Bus',
    'Rechnung Sehtest C/D'
  ));

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Rechnung Sehtest Fahrerlaubnis C/D (Anlage 6 Nr. 2.1 FeV)',
  'Rechnung Sehtest C/D',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Layout kommt aus my-admin/src/sehtestRechnungTemplate.ts.',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Rechnung Sehtest C/D'
);
