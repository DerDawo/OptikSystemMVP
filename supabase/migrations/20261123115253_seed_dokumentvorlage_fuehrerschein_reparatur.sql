-- Zwei ausfüllbare PDF-Formulare in der Formulare-Liste (Kundenkarte):
--   - "Führerschein-Bescheinigung": Bescheinigung Sehtest Fahrerlaubnis
--     (Anlage 6 FeV), my-admin/public/formulare/fuehrerschein-bescheinigung.pdf
--   - "Reparaturauftrag HSC": Auftragsformular Hotstegs Service Center auf
--     einer Seite, my-admin/public/formulare/reparaturauftrag-hsc.pdf
-- Beide füllt my-admin/src/pdfFormulare.ts vor. Die Knöpfe in der
-- Kundenkarte entfallen, die Formulare stehen jetzt in der Formularliste.
-- Nur neue Vorlagen-Datensätze, keine Kundendaten.

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
    'Rechnung Sehtest C/D',
    'Führerschein-Bescheinigung',
    'Reparaturauftrag HSC'
  ));

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Bescheinigung Sehtest Fahrerlaubnis (Anlage 6 FeV)',
  'Führerschein-Bescheinigung',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das ausfüllbare PDF liegt unter my-admin/public/formulare/fuehrerschein-bescheinigung.pdf und wird von my-admin/src/pdfFormulare.ts vorausgefüllt.',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Führerschein-Bescheinigung'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Reparaturauftrag Hotstegs Service Center (1 Seite)',
  'Reparaturauftrag HSC',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das ausfüllbare PDF liegt unter my-admin/public/formulare/reparaturauftrag-hsc.pdf und wird von my-admin/src/pdfFormulare.ts vorausgefüllt.',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Reparaturauftrag HSC'
);
