-- Glasassistent wie in Prisma: Vorgaben (Einstärken, Gleitsicht, Office,
-- Kunststoff, Mineral, ...) und Durchmesser brauchen Angaben, die die
-- SF6-Kataloge liefern, der Import bisher aber nicht übernommen hat
-- (siehe sf6Format.ts).
--
-- glasart:     0 Einstärken, 1 Bifokal, 2 Trifokal, 3 Gleitsicht, 4 Office
-- material:    1 Mineral, 2 Kunststoff, 3 Polycarbonat, 4 Trivex
-- durchmesser: lieferbare Durchmesser mit niedrigster UVP in Euro,
--              z. B. {"60": 120.5, "65": 120.5, "65/70": 131}
--
-- Bestehende Zeilen bleiben NULL, bis der Katalog neu importiert oder
-- nachgetragen wird; der Glasassistent behandelt NULL als "unbekannt".

alter table public.glaskatalog
  add column if not exists glasart smallint
    check (glasart between 0 and 4),
  add column if not exists material smallint
    check (material between 1 and 4),
  add column if not exists durchmesser jsonb;

comment on column public.glaskatalog.glasart is
  'Glasart aus LensType.dat Spalte 63: 0 Einstärken, 1 Bifokal, 2 Trifokal, 3 Gleitsicht, 4 Office/Arbeitsplatz.';
comment on column public.glaskatalog.material is
  'Material aus LensType.dat Spalte 72: 1 Mineral, 2 Kunststoff, 3 Polycarbonat, 4 Trivex.';
comment on column public.glaskatalog.durchmesser is
  'Lieferbare Durchmesser aus LensPrice.dat mit niedrigster UVP je Durchmesser, z. B. {"65": 120.5, "65/70": 131}.';
