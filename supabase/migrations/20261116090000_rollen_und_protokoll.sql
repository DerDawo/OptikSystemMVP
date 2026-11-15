-- Benutzerrollen und Änderungsprotokoll.
--
-- Rollen: inhaber (alles), optiker (alles außer Betriebsdaten, Benutzer und
-- Protokoll), aushilfe (lesen; Kunden, Termine, Anfragen, Nachrichten und
-- Erinnerungen bearbeiten) und gesperrt (sieht nichts mehr).
--
-- Sicherer Start: Wer in `inhaber_zugang` steht, ist immer Inhaber und kann
-- sich nicht aussperren. Logins ohne Eintrag in `benutzer_rolle` gelten als
-- Optiker, damit nach dem Einspielen alle wie bisher weiterarbeiten. Der
-- Inhaber legt die Rollen dann unter Einstellungen → Benutzer und Rollen fest.
--
-- Änderungsprotokoll: Trigger schreiben jede Neuanlage, Änderung (nur die
-- geänderten Felder, alt und neu) und Löschung der wichtigen Tabellen mit
-- Benutzer und Zeitpunkt in `aenderungsprotokoll`. Nur der Inhaber kann es
-- lesen; ändern oder löschen kann es niemand über die App.
--
-- Keine Änderung an bestehenden Daten.

-- 1. Rollen ------------------------------------------------------------------

create table if not exists public.benutzer_rolle (
  email text primary key check (email = lower(btrim(email)) and email <> ''),
  name text,
  rolle text not null default 'optiker'
    check (rolle in ('inhaber', 'optiker', 'aushilfe')),
  aktiv boolean not null default true,
  geaendert_am timestamptz not null default now()
);

comment on table public.benutzer_rolle is
  'Rolle je Login (E-Mail). Ohne Eintrag gilt ein Login als Optiker; aktiv = false sperrt den Login.';

alter table public.benutzer_rolle enable row level security;

-- Aktuelle Rolle des angemeldeten Benutzers
create or replace function public.aktuelle_rolle()
returns text
language sql
stable
security definer
set search_path = public
as $$
  with ich as (
    select lower(coalesce(auth.jwt() ->> 'email', '')) as email
  )
  select case
    when exists (
      select 1 from public.inhaber_zugang z, ich where lower(z.email) = ich.email
    ) then 'inhaber'
    else coalesce(
      (
        select case when b.aktiv then b.rolle else 'gesperrt' end
        from public.benutzer_rolle b, ich
        where b.email = ich.email
      ),
      'optiker'
    )
  end;
$$;

create or replace function public.darf_lesen()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.aktuelle_rolle() in ('inhaber', 'optiker', 'aushilfe');
$$;

create or replace function public.darf_bearbeiten()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.aktuelle_rolle() in ('inhaber', 'optiker');
$$;

-- bisher nur über inhaber_zugang; jetzt auch über die Rolle "inhaber"
create or replace function public.ist_inhaber()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.aktuelle_rolle() = 'inhaber';
$$;

revoke all on function public.aktuelle_rolle() from public;
revoke all on function public.darf_lesen() from public;
revoke all on function public.darf_bearbeiten() from public;
revoke all on function public.ist_inhaber() from public;
grant execute on function public.aktuelle_rolle() to authenticated;
grant execute on function public.darf_lesen() to authenticated;
grant execute on function public.darf_bearbeiten() to authenticated;
grant execute on function public.ist_inhaber() to authenticated;

drop policy if exists "Eigene Rolle lesen, Inhaber alle" on public.benutzer_rolle;
create policy "Eigene Rolle lesen, Inhaber alle"
  on public.benutzer_rolle
  for select
  to authenticated
  using (
    email = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.ist_inhaber()
  );

drop policy if exists "Nur Inhaber verwaltet Rollen" on public.benutzer_rolle;
create policy "Nur Inhaber verwaltet Rollen"
  on public.benutzer_rolle
  for all
  to authenticated
  using (public.ist_inhaber())
  with check (public.ist_inhaber());

-- Übersicht aller Logins mit Rolle (nur für den Inhaber)
create or replace function public.benutzer_uebersicht()
returns table (
  email text,
  name text,
  rolle text,
  aktiv boolean,
  hauptinhaber boolean,
  hat_login boolean,
  letzte_anmeldung timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.ist_inhaber() then
    raise exception 'Nur der Inhaber darf die Benutzer sehen.';
  end if;
  return query
  with logins as (
    select lower(u.email::text) as email, u.last_sign_in_at
    from auth.users u
    where u.email is not null
  ),
  alle as (
    select l.email from logins l
    union
    select b.email from public.benutzer_rolle b
  )
  select
    a.email,
    b.name,
    case
      when z.email is not null then 'inhaber'
      else coalesce(b.rolle, 'optiker')
    end,
    coalesce(b.aktiv, true) or z.email is not null,
    z.email is not null,
    l.email is not null,
    l.last_sign_in_at
  from alle a
  left join logins l on l.email = a.email
  left join public.benutzer_rolle b on b.email = a.email
  left join public.inhaber_zugang z on lower(z.email) = a.email
  order by 5 desc, a.email;
end;
$$;

revoke all on function public.benutzer_uebersicht() from public;
grant execute on function public.benutzer_uebersicht() to authenticated;

-- 2. Zugriffsregeln je Rolle -------------------------------------------------

-- Bisherige "alle angemeldeten Benutzer dürfen alles"-Regeln entfernen und je
-- Tabelle neu anlegen: Lesen für alle aktiven Rollen, Schreiben je nach
-- Gruppe.
do $$
declare
  t text;
  p record;
  -- alle aktiven Rollen dürfen bearbeiten (auch die Aushilfe)
  alle_bearbeiten text[] := array[
    'kunde', 'termin', 'buchung_anfrage', 'nachrichten', 'erinnerung'
  ];
  -- Inhaber und Optiker dürfen bearbeiten
  fachlich text[] := array[
    'brille', 'glass', 'glastyp', 'fassung', 'kontaktlinse',
    'brille_hat_zusatzleistungen', 'kunde_brillenversicherung',
    'kunde_leistet_zauzahlung_fuer_brille', 'kassenrezept', 'kunde_dokument',
    'glaslager', 'zusatzleistung', 'brillenart', 'dokumentvorlage',
    'glashersteller', 'glaskatalog', 'glaskatalog_hat_option',
    'glaskatalog_option', 'krankenkasse', 'buchung_einstellung',
    'buchung_oeffnungszeit', 'buchung_terminart'
  ];
  -- nur der Inhaber darf bearbeiten
  inhaber text[] := array['betrieb'];
begin
  foreach t in array alle_bearbeiten || fachlich || inhaber loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    for p in
      select policyname from pg_policies
      where schemaname = 'public' and tablename = t
    loop
      execute format('drop policy %I on public.%I', p.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format(
      'create policy rolle_lesen on public.%I for select to authenticated using (public.darf_lesen())',
      t
    );
  end loop;

  foreach t in array alle_bearbeiten loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format(
      'create policy rolle_anlegen on public.%I for insert to authenticated with check (public.darf_lesen())', t);
    execute format(
      'create policy rolle_aendern on public.%I for update to authenticated using (public.darf_lesen()) with check (public.darf_lesen())', t);
    -- Löschen (z. B. Kunde löschen) nur Inhaber und Optiker
    execute format(
      'create policy rolle_loeschen on public.%I for delete to authenticated using (public.darf_bearbeiten())', t);
  end loop;

  foreach t in array fachlich loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format(
      'create policy rolle_anlegen on public.%I for insert to authenticated with check (public.darf_bearbeiten())', t);
    execute format(
      'create policy rolle_aendern on public.%I for update to authenticated using (public.darf_bearbeiten()) with check (public.darf_bearbeiten())', t);
    execute format(
      'create policy rolle_loeschen on public.%I for delete to authenticated using (public.darf_bearbeiten())', t);
  end loop;

  foreach t in array inhaber loop
    if to_regclass('public.' || t) is null then continue; end if;
    execute format(
      'create policy rolle_anlegen on public.%I for insert to authenticated with check (public.ist_inhaber())', t);
    execute format(
      'create policy rolle_aendern on public.%I for update to authenticated using (public.ist_inhaber()) with check (public.ist_inhaber())', t);
    execute format(
      'create policy rolle_loeschen on public.%I for delete to authenticated using (public.ist_inhaber())', t);
  end loop;
end;
$$;

-- Tabellen mit eigenen, engeren Regeln: gesperrte Logins sehen nichts mehr,
-- die Aushilfe legt keine Fundusberichte an.
do $$
begin
  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename = 'fundusbericht' and policyname = 'fundusbericht_lesen') then
    alter policy fundusbericht_lesen on public.fundusbericht using (public.darf_lesen());
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename = 'fundusbericht' and policyname = 'fundusbericht_anlegen') then
    alter policy fundusbericht_anlegen on public.fundusbericht with check (public.darf_bearbeiten());
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename = 'firmenrechnung' and policyname = 'firmenrechnung_lesen') then
    alter policy firmenrechnung_lesen on public.firmenrechnung using (public.darf_lesen());
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public'
             and tablename = 'kalender_abgleich' and policyname = 'Authenticated users can read kalender_abgleich') then
    alter policy "Authenticated users can read kalender_abgleich" on public.kalender_abgleich using (public.darf_lesen());
  end if;
end;
$$;

-- 3. Änderungsprotokoll ------------------------------------------------------

create table if not exists public.aenderungsprotokoll (
  id bigint generated by default as identity primary key,
  zeitpunkt timestamptz not null default now(),
  benutzer text not null,
  tabelle text not null,
  datensatz_id text,
  aktion text not null check (aktion in ('angelegt', 'geändert', 'gelöscht')),
  alt jsonb,
  neu jsonb
);

comment on table public.aenderungsprotokoll is
  'Wer hat was wann geändert. Wird nur von Triggern geschrieben, nur der Inhaber kann es lesen.';

create index if not exists aenderungsprotokoll_zeitpunkt_idx
  on public.aenderungsprotokoll (zeitpunkt desc);
create index if not exists aenderungsprotokoll_datensatz_idx
  on public.aenderungsprotokoll (tabelle, datensatz_id);

alter table public.aenderungsprotokoll enable row level security;

drop policy if exists "Nur Inhaber liest Protokoll" on public.aenderungsprotokoll;
create policy "Nur Inhaber liest Protokoll"
  on public.aenderungsprotokoll
  for select
  to authenticated
  using (public.ist_inhaber());

-- niemand ändert oder löscht Protokolleinträge über die API
revoke insert, update, delete, truncate on public.aenderungsprotokoll from anon, authenticated;

create or replace function public.protokolliere_aenderung()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  alt_zeile jsonb;
  neu_zeile jsonb;
  alt_werte jsonb := '{}'::jsonb;
  neu_werte jsonb := '{}'::jsonb;
  feld text;
  wer text := coalesce(nullif(auth.jwt() ->> 'email', ''), 'System');
begin
  if tg_op = 'INSERT' then
    neu_zeile := to_jsonb(new);
    insert into public.aenderungsprotokoll (benutzer, tabelle, datensatz_id, aktion, neu)
    values (wer, tg_table_name, neu_zeile ->> 'id', 'angelegt', neu_zeile);
  elsif tg_op = 'DELETE' then
    alt_zeile := to_jsonb(old);
    insert into public.aenderungsprotokoll (benutzer, tabelle, datensatz_id, aktion, alt)
    values (wer, tg_table_name, alt_zeile ->> 'id', 'gelöscht', alt_zeile);
  else
    alt_zeile := to_jsonb(old);
    neu_zeile := to_jsonb(new);
    for feld in select jsonb_object_keys(neu_zeile) loop
      if feld not in ('updated_at', 'geaendert_am')
         and (alt_zeile -> feld) is distinct from (neu_zeile -> feld) then
        alt_werte := alt_werte || jsonb_build_object(feld, alt_zeile -> feld);
        neu_werte := neu_werte || jsonb_build_object(feld, neu_zeile -> feld);
      end if;
    end loop;
    -- Speichern ohne echte Änderung nicht protokollieren
    if neu_werte <> '{}'::jsonb then
      insert into public.aenderungsprotokoll (benutzer, tabelle, datensatz_id, aktion, alt, neu)
      values (wer, tg_table_name, neu_zeile ->> 'id', 'geändert', alt_werte, neu_werte);
    end if;
  end if;
  return null;
end;
$$;

revoke all on function public.protokolliere_aenderung() from public;

do $$
declare
  t text;
begin
  foreach t in array array[
    'kunde', 'brille', 'glass', 'glastyp', 'fassung', 'kontaktlinse',
    'brille_hat_zusatzleistungen', 'kunde_brillenversicherung',
    'kunde_leistet_zauzahlung_fuer_brille', 'kassenrezept', 'kunde_dokument',
    'fundusbericht', 'firmenrechnung', 'schuldnerliste', 'betrieb',
    'glaslager', 'benutzer_rolle'
  ] loop
    if to_regclass('public.' || t) is null then
      continue;
    end if;
    execute format('drop trigger if exists aenderung_protokollieren on public.%I', t);
    execute format(
      'create trigger aenderung_protokollieren after insert or update or delete on public.%I for each row execute function public.protokolliere_aenderung()',
      t
    );
  end loop;
end;
$$;
