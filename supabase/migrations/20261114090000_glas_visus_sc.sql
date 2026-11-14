-- Visus ohne Korrektion (sc) je Glas, neben dem bisherigen Visus (Spalte
-- "Vis" = Visus mit Korrektion, cc). Nur eine neue, leere Spalte.
alter table public.glass add column if not exists "VisSC" numeric;
comment on column public.glass."VisSC" is 'Visus ohne Korrektion (sc); "Vis" ist der Visus mit Korrektion (cc)';
