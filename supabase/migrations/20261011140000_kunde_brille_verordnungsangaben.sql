-- Angaben, die die Druckformulare bisher leer lassen mussten, weil sie nicht
-- gespeichert waren (Berechtigungsschein, optometrische Verordnung,
-- Erprobungsprotokoll, Rezeptanfrage). Einmal erfasst, füllen sie sich dort
-- automatisch aus.
--   kunde:  Name der Krankenkasse (bisher nur Kassen-Nr. und "gesetzlich/
--           privat"), Versichertenstatus und Gültigkeit der Versichertenkarte
--   brille: verordnender Arzt, Datum und Diagnose (ICD-10) der Verordnung

alter table public.kunde
  add column if not exists "Krankenkasse" text,
  add column if not exists "Versichertenstatus" text,
  add column if not exists "VersichertenkarteGueltigBis" date;

comment on column public.kunde."Krankenkasse" is
  'Name der Krankenkasse bzw. des Kostenträgers, z. B. "AOK PLUS"';
comment on column public.kunde."Versichertenstatus" is
  'Versichertenstatus laut Versichertenkarte (Feld "Status" der Formulare)';
comment on column public.kunde."VersichertenkarteGueltigBis" is
  'Gültigkeit der Versichertenkarte (Feld "VK gültig bis" der Formulare)';

alter table public.brille
  add column if not exists "VerordnenderArzt" text,
  add column if not exists "Verordnungsdatum" date,
  add column if not exists "Diagnose" text;

comment on column public.brille."VerordnenderArzt" is
  'Verordnende Ärztin bzw. verordnender Arzt (Muster 8/8A)';
comment on column public.brille."Verordnungsdatum" is
  'Ausstellungsdatum der Verordnung zu diesem Auftrag';
comment on column public.brille."Diagnose" is
  'Diagnose laut Verordnung, gern mit ICD-10-Code (z. B. "H52.1 Myopie")';
