-- Neue druckbare Formulare im Formulare-Dialog der Brillenkartei:
--   - "Antrag Zuschuss": Antrag auf Kostenübernahme/Zuschuss an Krankenkasse,
--     Jobcenter oder Arbeitgeber (z. B. Bildschirmarbeitsplatzbrille)
--   - "Antrag Sozialamt": Antrag auf Kostenübernahme beim Sozialamt
--     Beide: my-admin/src/antragTemplate.ts, Seite 1 der mit Kundendaten
--     vorausgefüllte Antrag, Seite 2 der Kostenvoranschlag des Auftrags.
--   - "Berechtigungsschein AOK": Berechtigungsschein nach dem Muster des
--     ZVA (AOK-Vertrag Sehhilfen, Anlage 4),
--     my-admin/src/aokBerechtigungsscheinTemplate.ts
--   - "Optometrische Verordnung" (kurz, halbe A4-Seite) und
--     "Optometrische Verordnung GKV" des Sehzentrums Gera,
--     my-admin/src/optometrischeVerordnungTemplate.ts
--   - "Beobachtungsbogen" und "Antrag BAP" (Bildschirmarbeitsplatzbrille):
--     ausfüllbare PDF-Vorlagen (my-admin/public/formulare/*.pdf), die
--     my-admin/src/pdfFormulare.ts vorausfüllt
--   - "Kostenvoranschlag" im Rechnungsdesign (my-admin/src/rechnungTemplate.ts)
-- Alle haben ein code-basiertes Layout; der Vorlagentext wird wie bei
-- Rechnung und Berechtigungsschein nicht gerendert, der Datensatz macht die
-- Vorlage im Dialog auswählbar.

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
    'Kostenvoranschlag'
  ));

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Antrag auf Kostenübernahme / Zuschuss',
  'Antrag Zuschuss',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Layout und Text des Antrags (Seite 1) und des Kostenvoranschlags (Seite 2) sind im Code hinterlegt (my-admin/src/antragTemplate.ts).',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Antrag Zuschuss'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Antrag auf Kostenübernahme (Sozialamt)',
  'Antrag Sozialamt',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Layout und Text des Antrags (Seite 1) und des Kostenvoranschlags (Seite 2) sind im Code hinterlegt (my-admin/src/antragTemplate.ts).',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Antrag Sozialamt'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Berechtigungsschein (AOK, Anlage 4)',
  'Berechtigungsschein AOK',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Formular ist im Code hinterlegt (my-admin/src/aokBerechtigungsscheinTemplate.ts).',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Berechtigungsschein AOK'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Optometrische Verordnung',
  'Optometrische Verordnung',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Formular ist im Code hinterlegt (my-admin/src/optometrischeVerordnungTemplate.ts).',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Optometrische Verordnung'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Optometrische Verordnung (GKV)',
  'Optometrische Verordnung GKV',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Formular ist im Code hinterlegt (my-admin/src/optometrischeVerordnungTemplate.ts).',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Optometrische Verordnung GKV'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Beobachtungsbogen',
  'Beobachtungsbogen',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das ausfüllbare PDF liegt unter my-admin/public/formulare/ und wird von my-admin/src/pdfFormulare.ts vorausgefüllt.',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Beobachtungsbogen'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Antrag Bildschirmarbeitsplatzbrille',
  'Antrag BAP',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das ausfüllbare PDF liegt unter my-admin/public/formulare/ und wird von my-admin/src/pdfFormulare.ts vorausgefüllt.',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Antrag BAP'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select
  'Kostenvoranschlag',
  'Kostenvoranschlag',
  'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Der Kostenvoranschlag hat dasselbe Layout wie die Rechnung (my-admin/src/rechnungTemplate.ts).',
  true
where not exists (
  select 1 from public.dokumentvorlage where "Kategorie" = 'Kostenvoranschlag'
);
