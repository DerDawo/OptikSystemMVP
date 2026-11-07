-- Neues Formular "Antrag Jobcenter": Formblatt "Vom Optiker auszufüllen
-- (Bildschirmarbeitsplatzbrille)" für Mitarbeiter des Jobcenters. Name und
-- Datum kommen aus der Kundenkartei, Kosten, Rabatt und Bemerkungen werden in
-- der Vorschau eingetippt. Layout: my-admin/src/jobcenterBildschirmbrilleTemplate.ts.
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
    'Auftragszettel',
    'Gutachten Kinderoptometrie',
    'Glasbestellung POL',
    'Patientenanfrage',
    'Rechnung Bildschirmarbeitsplatzbrille',
    'Rechnung Arbeitsschutzbrille',
    'Antrag SRH',
    'Optometrische Verordnung Vordruck',
    'Trockenes Auge',
    'Antrag Jobcenter'
  ));

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Antrag Jobcenter (Bildschirmarbeitsplatzbrille)',
  'Antrag Jobcenter',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Layout kommt aus my-admin/src/jobcenterBildschirmbrilleTemplate.ts.',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Antrag Jobcenter'
);
