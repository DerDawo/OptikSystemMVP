-- Hersteller-Glaskatalog für den SF6-Import (siehe #23).
--
-- Optik-Glashersteller liefern ihre Produktkataloge im "SF6"-Format (ein in
-- der Augenoptik-Branche verbreitetes Austauschformat für Glasstammdaten,
-- siehe https://www.comcept.eu/schnittstellen und https://b2boptic.com).
-- Diese Migration legt das Datenmodell an, in das ein SF6-Import (ZIP mit
-- mehreren fixed-width .dat-Dateien) eingelesen wird:
--
--   glashersteller          -- ein Eintrag pro Hersteller (aus Head.dat)
--   glaskatalog             -- Grundglas-Produkte des Herstellers (aus LensType.dat)
--   glaskatalog_option      -- Beschichtungen/Farben des Herstellers (aus Options.dat / OptionsColor.dat)
--   glaskatalog_hat_option  -- welche Optionen für welches Grundglas verfügbar sind (aus Combination.dat)
--
-- glastyp (das bestehende, in Aufträgen referenzierte Modell) bekommt einen
-- optionalen Verweis auf den Katalogeintrag, aus dem es angelegt wurde. Die
-- bestehenden Freitext-Spalten (Bezeichnung, Hersteller, ...) bleiben
-- unverändert bestehen, damit bereits erstellte Aufträge (brille, glass)
-- durch einen erneuten Import niemals verändert werden.

create table public.glashersteller (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (code)
);

create table public.glaskatalog (
  id uuid primary key default gen_random_uuid(),
  glashersteller_id uuid not null references public.glashersteller(id) on delete cascade,
  esd_code text not null,
  bezeichnung text not null,
  brechungsindex numeric,
  basispreis numeric,
  aktiv boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (glashersteller_id, esd_code)
);

comment on column public.glaskatalog.esd_code is 'Bestellcode aus dem SF6-Herstellerkatalog (LensType.dat), zugleich Bestandteil des ESD-Codes einer konkreten Bestellung.';
comment on column public.glaskatalog.aktiv is 'Wird beim Re-Import auf false gesetzt, wenn der Code im neuen Katalog nicht mehr vorkommt, statt die Zeile zu löschen (Referenzen aus glastyp bleiben so gültig).';

create table public.glaskatalog_option (
  id uuid primary key default gen_random_uuid(),
  glashersteller_id uuid not null references public.glashersteller(id) on delete cascade,
  code text not null,
  bezeichnung text not null,
  typ text not null default 'beschichtung' check (typ in ('beschichtung', 'farbe')),
  preis numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (glashersteller_id, code)
);

comment on column public.glaskatalog_option.typ is 'beschichtung = Vergütung/Hartschicht-Optionen aus Options.dat, farbe = Tönungen aus OptionsColor.dat. Das SF6-Beispiel trennt "Hartschicht" nicht separat von "Beschichtung".';

create table public.glaskatalog_hat_option (
  id uuid primary key default gen_random_uuid(),
  glaskatalog_id uuid not null references public.glaskatalog(id) on delete cascade,
  glaskatalog_option_id uuid not null references public.glaskatalog_option(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (glaskatalog_id, glaskatalog_option_id)
);

alter table public.glastyp
  add column glaskatalog_id uuid references public.glaskatalog(id) on delete set null;

comment on column public.glastyp.glaskatalog_id is 'Optionaler Verweis auf den Herstellerkatalog-Eintrag (glaskatalog), aus dem dieser Glastyp ausgewählt wurde. Manuell angelegte oder ältere Glastypen haben hier NULL.';

-- Row Level Security passend zum bestehenden Muster aus
-- 20260828000000_restrict_access_to_authenticated_users.sql

alter table public.glashersteller enable row level security;
alter table public.glaskatalog enable row level security;
alter table public.glaskatalog_option enable row level security;
alter table public.glaskatalog_hat_option enable row level security;

create policy "Authenticated users can manage glashersteller" on public.glashersteller
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage glaskatalog" on public.glaskatalog
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage glaskatalog_option" on public.glaskatalog_option
  for all
  to authenticated
  using (true)
  with check (true);

create policy "Authenticated users can manage glaskatalog_hat_option" on public.glaskatalog_hat_option
  for all
  to authenticated
  using (true)
  with check (true);
