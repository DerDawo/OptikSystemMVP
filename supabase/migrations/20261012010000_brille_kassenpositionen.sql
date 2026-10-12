-- Beim Übernehmen im KK-Rechner der Brillenkartei gewählte
-- Hilfsmittelpositionen (vdek-ZVA-Vertrag), z. B.
--   [{"nummer": "25.21.01.0900", "bezeichnung": "...", "faktor": 1, "netto": 16.23}, ...]
-- Grundlage für die Kostenabrechnung im Berechtigungsschein
-- (my-admin/src/kassenanteil.ts, pdfFormulare.ts). Leer bei älteren
-- Aufträgen; dann werden die Positionen aus den Glaswerten abgeleitet.

alter table public.brille
  add column if not exists "KassenPositionen" jsonb;

comment on column public.brille."KassenPositionen" is
  'Im KK-Rechner gewählte Hilfsmittelpositionen (nummer, bezeichnung, faktor, netto je Stück) für die Kostenabrechnung im Berechtigungsschein.';
