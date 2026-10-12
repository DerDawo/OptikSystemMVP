-- Rechnungsnummer für Kontaktlinsenaufträge aus demselben fortlaufenden
-- Zähler wie bei Brillen (rechnungsnummer_stand), damit jede Nummer nur
-- einmal vergeben wird. Nur eine neue Funktion; keine Daten werden geändert.

create or replace function public.assign_rechnungsnummer_kontaktlinse(p_kontaktlinse_id bigint)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bestehende_nummer text;
  v_neue_rechnungsnummer text;
begin
  select "Rechnungsnummer" into v_bestehende_nummer
  from public.kontaktlinse
  where id = p_kontaktlinse_id
  for update;

  if not found then
    raise exception 'Kontaktlinsenauftrag % nicht gefunden', p_kontaktlinse_id;
  end if;

  if v_bestehende_nummer is not null and v_bestehende_nummer <> '' then
    return v_bestehende_nummer;
  end if;

  update public.rechnungsnummer_stand
  set letzte_nummer = letzte_nummer + 1
  where id = 1
  returning letzte_nummer::text into v_neue_rechnungsnummer;

  if v_neue_rechnungsnummer is null then
    raise exception 'Rechnungsnummer-Zähler fehlt (Tabelle rechnungsnummer_stand)';
  end if;

  update public.kontaktlinse
  set "Rechnungsnummer" = v_neue_rechnungsnummer
  where id = p_kontaktlinse_id;

  return v_neue_rechnungsnummer;
end;
$$;

grant execute on function public.assign_rechnungsnummer_kontaktlinse(bigint) to authenticated;

comment on function public.assign_rechnungsnummer_kontaktlinse(bigint) is
  'Vergibt beim ersten Aufruf für einen Kontaktlinsenauftrag die nächste fortlaufende Rechnungsnummer (gemeinsamer Zähler mit Brillen) und speichert sie in kontaktlinse."Rechnungsnummer". Ist bereits eine Nummer gesetzt, wird diese unverändert zurückgegeben.';
