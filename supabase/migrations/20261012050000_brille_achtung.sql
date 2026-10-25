-- Achtungsfeld der Brillenkartei (rechts oben, wo früher "Werkstatt" stand):
-- Hinweis, an wen die Rechnung geht. Auswahl in der App:
-- "RG für KK" (Krankenkasse), "RG für AG" (Arbeitgeber), "RG für ST".
-- Nur eine neue, leere Spalte; "Werkstatt" bleibt unverändert erhalten
-- (Werkstattauftrag, Auftragsübersicht).

alter table public.brille
  add column if not exists "Achtung" text;

comment on column public.brille."Achtung" is
  'Achtungsfeld der Brillenkartei, z. B. "RG für KK", "RG für AG", "RG für ST".';
