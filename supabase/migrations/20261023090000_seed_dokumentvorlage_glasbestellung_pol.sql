-- Neues Formular "Glasbestellung POL" im Formulare-Dialog: das
-- Glasbestellformular von POL Optic auf einer A4-Seite. Refraktions- und
-- Zentrierdaten kommen aus dem Auftrag, Kästchen und Felder werden in der
-- Vorschau ergänzt. Layout: my-admin/src/polGlasbestellungTemplate.ts.
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
    'Glasbestellung POL'
  ));

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'POL Glasbestellformular',
  'Glasbestellung POL',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Layout kommt aus my-admin/src/polGlasbestellungTemplate.ts.',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Glasbestellung POL'
);
