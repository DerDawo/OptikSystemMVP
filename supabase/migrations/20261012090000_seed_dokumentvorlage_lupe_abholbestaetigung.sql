-- Zwei weitere ausfüllbare PDF-Formulare im Formulare-Dialog:
--   - "Erprobungsbericht Lupe": Bericht über die Erprobung einer
--     vergrößernden Sehhilfe (elektronische Lupe, Vorbereitung Muster 8A),
--     my-admin/public/formulare/erprobungsbericht-lupe.pdf
--     (Felder: my-admin/scripts/erprobungsbericht-lupe-felder.mjs)
--   - "Abholbestätigung": Abholbestätigung mit Schuldanerkenntnis,
--     my-admin/public/formulare/abholbestaetigung.pdf
--     (Felder: my-admin/scripts/abholbestaetigung-felder.mjs)
-- Beide füllt my-admin/src/pdfFormulare.ts vor; alle Felder bleiben im
-- PDF-Viewer änderbar. Nur neue Vorlagen-Datensätze, keine Kundendaten.

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
    'Abholbestätigung'
  ));

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Erprobungsbericht elektronische Lupe (Muster 8A)',
  'Erprobungsbericht Lupe',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das ausfüllbare PDF liegt unter my-admin/public/formulare/erprobungsbericht-lupe.pdf und wird von my-admin/src/pdfFormulare.ts vorausgefüllt.',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Erprobungsbericht Lupe'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Abholbestätigung mit Schuldanerkenntnis',
  'Abholbestätigung',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das ausfüllbare PDF liegt unter my-admin/public/formulare/abholbestaetigung.pdf und wird von my-admin/src/pdfFormulare.ts vorausgefüllt.',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Abholbestätigung'
);
