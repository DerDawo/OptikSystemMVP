-- Bevorzugter Kontaktweg des Kunden ("bevorzugt" in der Kundenkartei wie in
-- Prisma): Handy, SMS, WhatsApp, eMail oder Telefon. Die bisherige
-- Ja/Nein-Spalte "BevorzugterKontaktweg" war nie befüllt und bleibt
-- unverändert stehen. Keine Datenänderung.

alter table public.kunde
  add column if not exists "Kontaktweg" text;

alter table public.kunde
  drop constraint if exists kunde_kontaktweg_check;
alter table public.kunde
  add constraint kunde_kontaktweg_check check (
    "Kontaktweg" is null
    or "Kontaktweg" in ('Handy', 'SMS', 'WhatsApp', 'eMail', 'Telefon')
  );

comment on column public.kunde."Kontaktweg" is
  'Bevorzugter Kontaktweg (Handy, SMS, WhatsApp, eMail, Telefon), Auswahl "bevorzugt" in der Kundenkartei.';
