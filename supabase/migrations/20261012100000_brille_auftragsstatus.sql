-- Auftragsstatus der Brillenkartei (Knöpfe "Bestellt", "Fertig", "Abgeholt")
-- und Nachverfolgung von Kostenvoranschlägen/Anträgen fürs Dashboard.
-- "Abgeholt" nutzt die vorhandene Spalte "Abholung" (Prisma-Import: dort
-- steht bei alten Aufträgen bereits das Abholdatum). Nur neue, leere
-- Spalten - vorhandene Daten bleiben unverändert.

alter table public.brille
  add column if not exists "Bestellt" date,
  add column if not exists "Fertig" date,
  add column if not exists "KVVersendet" date,
  add column if not exists "KVGenehmigt" boolean not null default false;

comment on column public.brille."Bestellt" is
  'Datum, an dem Gläser/Fassung bestellt wurden (Knopf "Bestellt").';
comment on column public.brille."Fertig" is
  'Datum, ab dem die Brille abholbereit ist (Knopf "Fertig").';
comment on column public.brille."KVVersendet" is
  'Zuletzt gedruckter/versendeter Kostenvoranschlag, Antrag oder Berechtigungsschein.';
comment on column public.brille."KVGenehmigt" is
  'Kostenvoranschlag/Antrag vom Kostenträger genehmigt (Haken in der Kartei).';
