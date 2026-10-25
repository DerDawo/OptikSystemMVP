-- Neues Formular im Formulare-Dialog der Brillenkartei: "Optometrische
-- Verordnung (Vordruck)" - das Vordruck-PDF mit Formularfeldern, Firmenstempel
-- und Unterschrift (my-admin/public/formulare/verordnung-optometrist.pdf,
-- Felder: my-admin/scripts/verordnung-optometrist-felder.mjs). Nur eine neue
-- Kategorie und ein Vorlagen-Datensatz, keine Kundendaten.

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
    'Optometrische Verordnung Vordruck'
  ));


insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Optometrische Verordnung (Vordruck)',
  'Optometrische Verordnung Vordruck',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Die Vorlage ist das PDF my-admin/public/formulare/verordnung-optometrist.pdf.',
  true
where not exists (
  select 1 from public.dokumentvorlage
  where "Kategorie" = 'Optometrische Verordnung Vordruck'
);
