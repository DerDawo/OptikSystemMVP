-- Google-Kalender-Abgleich (Edge Function google-kalender): Termine aus
-- Google werden in termin übernommen. Nicht jeder Google-Termin lässt sich
-- einem Kunden zuordnen ("Kunde offen"), daher wird kunde_id optional.
--
-- Titel:      Termintitel aus Google (bzw. frei vergeben)
-- google_uid: Kennung des Google-Termins; eindeutig, damit der Abgleich
--             Termine aktualisiert statt doppelt anlegt (NULL = in der App
--             angelegter Termin)

alter table public.termin
  alter column kunde_id drop not null;

alter table public.termin
  add column if not exists "Titel" text,
  add column if not exists google_uid text;

create unique index if not exists termin_google_uid_key
  on public.termin (google_uid);

comment on column public.termin."Titel" is
  'Termintitel, z. B. aus dem Google-Kalender übernommen.';
comment on column public.termin.google_uid is
  'UID des Google-Kalender-Termins (Abgleich per Edge Function google-kalender); NULL bei in der App angelegten Terminen.';

-- Stand des letzten Abgleichs (eine Zeile), Anzeige in der App
create table if not exists public.kalender_abgleich (
  id smallint primary key default 1 check (id = 1),
  zuletzt timestamptz,
  ergebnis jsonb,
  fehler text
);

comment on table public.kalender_abgleich is
  'Letzter Google-Kalender-Abgleich (Zeitpunkt, Zählwerte, Fehler). Schreibt nur die Edge Function google-kalender.';

alter table public.kalender_abgleich enable row level security;

create policy "Authenticated users can read kalender_abgleich"
  on public.kalender_abgleich
  for select
  to authenticated
  using (true);
