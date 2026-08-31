-- Issue #56: Rechnungen - fortlaufende, lückenlose Rechnungsnummer je Jahr
-- vergeben (Format R-JJJJ-NNNN), sobald für einen Auftrag erstmals eine
-- Rechnung erzeugt wird.
--
-- Ein Zähler pro Jahr (statt einer einzigen globalen Sequence) sorgt dafür,
-- dass die laufende Nummer bei Jahreswechsel wieder bei 1 beginnt, passend
-- zum Format R-JJJJ-NNNN. Die Zeile wird beim Hochzählen implizit gesperrt
-- (UPDATE/INSERT ... ON CONFLICT), sodass parallele Aufrufe keine doppelten
-- Nummern vergeben.
--
-- Frontend-Aufruf: supabase.rpc('assign_rechnungsnummer', { p_brille_id }).

create table if not exists public.rechnungsnummer_zaehler (
  jahr integer primary key,
  letzte_nummer integer not null default 0
);

comment on table public.rechnungsnummer_zaehler is
  'Zähler je Jahr für die fortlaufende Rechnungsnummer (Format R-JJJJ-NNNN, Issue #56). Wird ausschließlich über assign_rechnungsnummer() gepflegt.';

alter table public.rechnungsnummer_zaehler enable row level security;

drop policy if exists "Authenticated users can read rechnungsnummer_zaehler" on public.rechnungsnummer_zaehler;
create policy "Authenticated users can read rechnungsnummer_zaehler" on public.rechnungsnummer_zaehler
  for select
  to authenticated
  using (true);

-- Kein direktes INSERT/UPDATE für Clients: das Hochzählen erfolgt
-- ausschließlich innerhalb der security-definer-Funktion unten.

create or replace function public.assign_rechnungsnummer(p_brille_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bestehende_nummer text;
  v_jahr integer := extract(year from now())::integer;
  v_naechste_nummer integer;
  v_neue_rechnungsnummer text;
begin
  select "Rechnungsnummer" into v_bestehende_nummer
  from public.brille
  where id = p_brille_id
  for update;

  if not found then
    raise exception 'Auftrag % nicht gefunden', p_brille_id;
  end if;

  if v_bestehende_nummer is not null and v_bestehende_nummer <> '' then
    return v_bestehende_nummer;
  end if;

  insert into public.rechnungsnummer_zaehler (jahr, letzte_nummer)
  values (v_jahr, 1)
  on conflict (jahr) do update
    set letzte_nummer = public.rechnungsnummer_zaehler.letzte_nummer + 1
  returning letzte_nummer into v_naechste_nummer;

  v_neue_rechnungsnummer := 'R-' || v_jahr || '-' || lpad(v_naechste_nummer::text, 4, '0');

  update public.brille
  set "Rechnungsnummer" = v_neue_rechnungsnummer
  where id = p_brille_id;

  return v_neue_rechnungsnummer;
end;
$$;

grant execute on function public.assign_rechnungsnummer(bigint) to authenticated;

comment on function public.assign_rechnungsnummer(bigint) is
  'Vergibt beim ersten Aufruf für einen Auftrag eine fortlaufende Rechnungsnummer im Format R-JJJJ-NNNN (Issue #56) und speichert sie in brille."Rechnungsnummer". Ist bereits eine Nummer gesetzt, wird diese unverändert zurückgegeben (idempotent).';
