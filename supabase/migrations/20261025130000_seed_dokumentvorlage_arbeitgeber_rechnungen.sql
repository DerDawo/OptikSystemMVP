-- Neue Formulare im Formulare-Dialog der Brillenkartei: Rechnungen an den
-- Arbeitgeber im Rechnungsdesign
--   - "Rechnung Bildschirmarbeitsplatzbrille" (ArbMedVV, Angebotsvorsorge)
--   - "Rechnung Arbeitsschutzbrille" (Korrektionsschutzbrille, DIN EN 166)
-- Layout: my-admin/src/arbeitgeberRechnungTemplate.ts. Positionen, Summe und
-- Rechnungsnummer kommen aus dem Auftrag, der Arbeitgeber wird in der
-- Vorschau eingetippt; der Versand geht per E-Mail an die dort eingetragene
-- Adresse.
-- Nur zwei neue Kategorien und zwei Vorlagen-Datensätze, keine Kundendaten.

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
    'Rechnung Arbeitsschutzbrille'
  ));

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Rechnung Bildschirmarbeitsplatzbrille (Arbeitgeber)',
  'Rechnung Bildschirmarbeitsplatzbrille',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Layout kommt aus my-admin/src/arbeitgeberRechnungTemplate.ts.',
  true
where not exists (
  select 1 from public.dokumentvorlage
  where "Kategorie" = 'Rechnung Bildschirmarbeitsplatzbrille'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Rechnung Arbeitsschutzbrille (Arbeitgeber)',
  'Rechnung Arbeitsschutzbrille',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Layout kommt aus my-admin/src/arbeitgeberRechnungTemplate.ts.',
  true
where not exists (
  select 1 from public.dokumentvorlage
  where "Kategorie" = 'Rechnung Arbeitsschutzbrille'
);
