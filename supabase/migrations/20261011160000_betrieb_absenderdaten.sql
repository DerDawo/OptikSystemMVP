-- Issue #132: Betriebsdaten für Belege und SMS aus der Tabelle `betrieb`.
--
-- Bisher standen Firma, Anschrift, Telefon, USt-ID, Bankverbindung und
-- MwSt-Satz fest im Code (RECHNUNG_ABSENDER in my-admin/src/
-- rechnungTemplate.ts). Änderungen auf der Seite "Betriebsdaten" erreichten
-- Rechnung, Kostenvoranschlag, Werkstattauftrag, Formulare und SMS-Platzhalter
-- nicht. Die Spalten werden hier ergänzt und einmalig mit den bisherigen
-- Code-Werten befüllt (nur wo noch leer); die App liest sie beim Start.
-- Leere Felder fallen in der App auf die bisherigen Standardwerte zurück.

alter table public.betrieb
  add column if not exists "Firmenname" text,
  add column if not exists "Marke" text,
  add column if not exists "Inhaber" text,
  add column if not exists "Strasse" text,
  add column if not exists "PLZ" text,
  add column if not exists "Ort" text,
  add column if not exists "Telefon" text,
  add column if not exists "Fax" text,
  add column if not exists "Email" text,
  add column if not exists "Website" text,
  add column if not exists "UStIdNr" text,
  add column if not exists "Bank" text,
  add column if not exists "IBAN" text,
  add column if not exists "BIC" text,
  add column if not exists "MwStSatz" numeric(4, 1),
  add column if not exists "ZahlungszielTage" integer,
  add column if not exists "KostenvoranschlagGueltigTage" integer;

update public.betrieb set
  "Firmenname" = coalesce("Firmenname", 'Augenoptik Ulm'),
  "Marke" = coalesce("Marke", 'Sehzentrum Gera'),
  "Inhaber" = coalesce("Inhaber", 'Robert Ulm'),
  "Strasse" = coalesce("Strasse", 'Werdauer Straße 38'),
  "PLZ" = coalesce("PLZ", '07551'),
  "Ort" = coalesce("Ort", 'Gera'),
  "Telefon" = coalesce("Telefon", '0365 - 710 35 70'),
  "Fax" = coalesce("Fax", '0365 - 20 41 65 75'),
  "Email" = coalesce("Email", 'info@augenoptik-ulm.de'),
  "Website" = coalesce("Website", 'www.augenoptik-ulm.de'),
  "UStIdNr" = coalesce("UStIdNr", 'DE299317258'),
  "Bank" = coalesce("Bank", 'FYRST BANK'),
  "IBAN" = coalesce("IBAN", 'DE11 8207 0366 0067 5751 00'),
  "BIC" = coalesce("BIC", 'PBNKDEFF'),
  "MwStSatz" = coalesce("MwStSatz", 19),
  "ZahlungszielTage" = coalesce("ZahlungszielTage", 14),
  "KostenvoranschlagGueltigTage" = coalesce("KostenvoranschlagGueltigTage", 28)
where id = 1;
