-- Arbeitgeber-Anschrift und E-Mail beim Kunden merken (Rechnungen an den
-- Arbeitgeber): {"firma", "abteilung", "strasse", "ort", "email"}
alter table public.kunde add column if not exists "Arbeitgeber" jsonb;
comment on column public.kunde."Arbeitgeber" is 'Arbeitgeber für Rechnungen: firma, abteilung, strasse, ort, email';
