-- Zwei weitere Formulare im Formulare-Dialog:
--   - "Anamnesebogen" (Sehzentrum, zwei Seiten): my-admin/src/anamneseTemplate.ts,
--     vorausgefüllt mit persönlichen Daten und Krankenversicherung; auch über
--     den Knopf "Anamnesebogen" auf der Kundenseite.
--   - "Berechtigungsschein GKV": das Original-Formular des ZVA
--     (AOK-Vertrag Sehhilfen, Anlage 4) als ausfüllbares PDF
--     (my-admin/public/formulare/berechtigungsschein-gkv.pdf, Felder siehe
--     my-admin/scripts/berechtigungsschein-gkv-felder.mjs), vorausgefüllt von
--     my-admin/src/pdfFormulare.ts. "Berechtigungsschein erstellen" öffnet
--     ab jetzt dieses Formular.
-- Der bisherige Nachbau "Berechtigungsschein AOK" wird deaktiviert (nicht
-- gelöscht), weil das Original ihn ersetzt.

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
    'Berechtigungsschein GKV'
  ));

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Anamnesebogen',
  'Anamnesebogen',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Formular ist im Code hinterlegt (my-admin/src/anamneseTemplate.ts).',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Anamnesebogen'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Berechtigungsschein GKV (Original ZVA/AOK Anlage 4)',
  'Berechtigungsschein GKV',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das ausfüllbare PDF liegt unter my-admin/public/formulare/berechtigungsschein-gkv.pdf und wird von my-admin/src/pdfFormulare.ts vorausgefüllt.',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Berechtigungsschein GKV'
);

update public.dokumentvorlage
set "Aktiv" = false
where "Kategorie" = 'Berechtigungsschein AOK';
