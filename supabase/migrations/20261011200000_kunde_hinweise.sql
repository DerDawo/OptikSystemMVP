-- Kurz-Hinweise zum Kunden, in der App bei den Notizen anwählbar
-- (Mehrfachauswahl): CAT-op, Sicca, GKB, GK, NH, BH, PSY.
alter table public.kunde
  add column if not exists "Hinweise" text[] not null default '{}';

comment on column public.kunde."Hinweise" is
  'Kurz-Hinweise (Mehrfachauswahl bei den Notizen), z. B. CAT-op, Sicca, GKB, GK, NH, BH, PSY.';
