-- Add fields to `kunde` to get closer to the reference software shown in the
-- product video: a dedicated mobile number, a preferred contact channel flag,
-- advertising consent (with a free-text reason) and its source, and four
-- free-form "Merkmal" fields for arbitrary customer characteristics.
--
-- All new columns are nullable or carry a safe default, so existing rows
-- stay valid without a backfill.
--
-- See: https://github.com/DerDawo/OptikSystemMVP/issues/59

alter table public.kunde
  add column if not exists "Handy" text,
  add column if not exists "BevorzugterKontaktweg" boolean not null default false,
  add column if not exists "Werbeeinwilligung" boolean not null default false,
  add column if not exists "WerbeeinwilligungFuer" text,
  add column if not exists "Kundenquelle" text,
  add column if not exists "Merkmal1" text,
  add column if not exists "Merkmal2" text,
  add column if not exists "Merkmal3" text,
  add column if not exists "Merkmal4" text;
