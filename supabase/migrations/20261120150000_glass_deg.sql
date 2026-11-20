-- Neues Glaswert-Feld "DEG" (Degression in dpt, je Auge), direkt nach "Add".
-- Additiv und nullable; "if not exists" macht die Migration idempotent.
alter table public.glass add column if not exists "DEG" numeric;
