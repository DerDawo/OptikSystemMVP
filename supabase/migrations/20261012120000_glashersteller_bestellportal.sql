-- Adresse des Online-Bestellportals je Glashersteller (z. B. Poloptic).
-- Wird in der Brillenkartei unter "Bestelloptionen" einmal eingetragen und
-- dort mit "Portal öffnen" genutzt. Nur eine neue, leere Spalte.

alter table public.glashersteller
  add column if not exists bestellportal_url text;

comment on column public.glashersteller.bestellportal_url is
  'Adresse des Online-Bestellportals des Herstellers (Bestelloptionen -> Portal öffnen).';
