-- Add billing and status fields to `brille` (the order) and `glass` (a
-- single position/glass within an order) to get closer to the reference
-- software shown in the product video.
--
-- `brille` gets an invoice number, a deposit ("Anzahlung", separate from the
-- co-payment tracked in `kunde_leistet_zauzahlung_fuer_brille` and from the
-- order total "Summe"), the amount covered by the health insurance
-- ("KK-Anteil"), and a payment status select field instead of free text.
--
-- `glass` gets its own order/procurement status ("Auftragsstatus") per
-- position, independent of the `Bestellstatus` already stored on `glasstyp`.
--
-- All new columns carry a safe default, so existing rows stay valid without
-- a backfill and no breaking changes are introduced.
--
-- See: https://github.com/DerDawo/OptikSystemMVP/issues/59

alter table public.brille
  add column if not exists "Rechnungsnummer" text,
  add column if not exists "Anzahlung" numeric(10, 2) not null default 0,
  add column if not exists "KKAnteil" numeric(10, 2) not null default 0,
  add column if not exists "Zahlungsstatus" text not null default 'offen';

alter table public.brille
  drop constraint if exists brille_zahlungsstatus_check;
alter table public.brille
  add constraint brille_zahlungsstatus_check check ("Zahlungsstatus" in ('offen', 'bezahlt'));

alter table public.glass
  add column if not exists "Auftragsstatus" text not null default 'zu bestellen';

alter table public.glass
  drop constraint if exists glass_auftragsstatus_check;
alter table public.glass
  add constraint glass_auftragsstatus_check check ("Auftragsstatus" in ('zu bestellen', 'bestellt', 'eingetroffen', 'abgeholt'));
