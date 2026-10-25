-- Neues Formular im Formulare-Dialog der Brillenkartei: "Antrag SRH" -
-- Vordruck "Gewährung einer Bildschirmarbeitsbrille" für das SRH-Krankenhaus
-- (Anlage 2), ohne Stempel und Unterschriften. Layout:
-- my-admin/src/srhBildschirmbrilleTemplate.ts. Nur eine neue Kategorie und ein
-- Vorlagen-Datensatz, keine Kundendaten.

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
    'Antrag SRH'
  ));


insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Antrag SRH (Bildschirmarbeitsbrille)',
  'Antrag SRH',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Layout kommt aus my-admin/src/srhBildschirmbrilleTemplate.ts.',
  true
where not exists (
  select 1 from public.dokumentvorlage
  where "Kategorie" = 'Antrag SRH'
);
