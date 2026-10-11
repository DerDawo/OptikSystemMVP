-- Voraussetzung für die Übernahme der Echtdaten aus dem Altsystem Prisma (#80).
--
-- 1. "Anrede" wird optional: Das Formular erfasst die Anrede als Freitext
--    und alle Anzeigen behandeln eine leere Anrede bereits (record.Anrede ?
--    ... : ""), die Spalte war aber NOT NULL. In Prisma haben rund 250
--    Kunden keine Anrede bzw. "Kind"/"Firma", die sich keinem Enum-Wert
--    zuordnen lassen.
-- 2. "Notizen" für freie Kundennotizen (Prisma: Kunden-Memo). Bisher gab es
--    am Kunden kein Notizfeld, nur an Aufträgen.
--
-- Beide Änderungen sind abwärtskompatibel, bestehende Zeilen bleiben gültig.

alter table public.kunde
  alter column "Anrede" drop not null;

alter table public.kunde
  add column if not exists "Notizen" text;
