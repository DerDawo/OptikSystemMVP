-- CL-Kartei im Aufbau von Prisma: Felder, die es für Kontaktlinsenaufträge
-- noch nicht gab. Nur neue, leere Spalten; bestehende Aufträge und Werte
-- bleiben unverändert.
--
-- "Hauptkartei_id": Anpassungen hängen an einer Hauptkartei (Baum links in
-- der CL-Kartei, "Karteiwerte kopieren" -> neue Anpassung).

alter table public.kontaktlinse
  add column if not exists "Hauptkartei_id" bigint
    references public.kontaktlinse (id) on delete set null,
  add column if not exists "Linsenart" text,
  add column if not exists "Anpassgrund" text,
  add column if not exists "AboLieferung" boolean not null default false,
  add column if not exists "Rechnungsnummer" text,
  add column if not exists "AddRechts" numeric,
  add column if not exists "AddLinks" numeric,
  add column if not exists "VisRechts" numeric,
  add column if not exists "VisLinks" numeric,
  add column if not exists "LagernummerRechts" text,
  add column if not exists "LagernummerLinks" text,
  add column if not exists "LieferscheinNrRechts" text,
  add column if not exists "LieferscheinNrLinks" text,
  add column if not exists "LieferscheinDatumRechts" date,
  add column if not exists "LieferscheinDatumLinks" date,
  add column if not exists "LotNrRechts" text,
  add column if not exists "LotNrLinks" text,
  add column if not exists "StatusRechts" text,
  add column if not exists "StatusLinks" text,
  add column if not exists "Zusatzleistung1" text,
  add column if not exists "Zusatzleistung2" text,
  add column if not exists "Zusatzleistung3" text,
  add column if not exists "Zusatzbetrag1" numeric,
  add column if not exists "Zusatzbetrag2" numeric,
  add column if not exists "Zusatzbetrag3" numeric,
  add column if not exists "RabattBezeichnung" text,
  add column if not exists "RabattProzent" numeric,
  add column if not exists "Zahlungsstatus" text,
  add column if not exists "Zahlungsdatum" date,
  add column if not exists "Pflegemittel" text,
  add column if not exists "KKAnteil" numeric not null default 0,
  add column if not exists "Anzahlung" numeric not null default 0;

create index if not exists kontaktlinse_hauptkartei_id_idx
  on public.kontaktlinse ("Hauptkartei_id");

comment on column public.kontaktlinse."Hauptkartei_id" is
  'Anpassung: Verweis auf die Hauptkartei (CL-Kartei), leer = selbst Hauptkartei.';
comment on column public.kontaktlinse."Summe" is
  'Preis rechts + Preis links + Zusatzleistungen, abzüglich Rabatt (von der CL-Kartei mitgespeichert).';
