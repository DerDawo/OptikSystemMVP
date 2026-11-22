-- Code für den Menübereich "Abrechnung" (Rechnungen, Mahnungen,
-- Firmenrechnung, Abgerechnete Rezepte, OPTICA-Abrechnungen): Die Seiten
-- fragen bei jedem Öffnen einen Code ab, den der Inhaber unter
-- Betriebsdaten festlegt. Gedacht als Sichtschutz am gemeinsam genutzten
-- Arbeitsplatz im Laden.
--
-- Der Code wird nur als bcrypt-Hash gespeichert (pgcrypto) und ist über die
-- App nicht lesbar. Prüfen geht nur über abrechnung_code_pruefen; nach 5
-- Fehlversuchen ist die Prüfung 5 Minuten gesperrt. Ohne festgelegten Code
-- sind die Seiten offen (wie bisher).
-- Neue Tabelle mit höchstens einer Zeile, keine Änderung an bestehenden Daten.

create table if not exists public.abrechnung_code (
  id int primary key default 1 check (id = 1),
  code_hash text not null,
  geaendert_am timestamptz not null default now(),
  fehlversuche int not null default 0,
  gesperrt_bis timestamptz
);

comment on table public.abrechnung_code is
  'Code (bcrypt-Hash) für den Menübereich Abrechnung; nur über Funktionen erreichbar.';

alter table public.abrechnung_code enable row level security;
-- keine Policies: direkt liest und schreibt niemand, nur die Funktionen
revoke all on public.abrechnung_code from anon, authenticated;

-- Ist ein Code festgelegt?
create or replace function public.abrechnung_code_gesetzt()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.abrechnung_code);
$$;

-- Code prüfen; true auch, wenn kein Code festgelegt ist
create or replace function public.abrechnung_code_pruefen(p_code text)
returns boolean
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
declare
  v public.abrechnung_code;
begin
  if not public.darf_lesen() then
    return false;
  end if;
  select * into v from public.abrechnung_code where id = 1 for update;
  if v.id is null then
    return true;
  end if;
  if v.gesperrt_bis > now() then
    raise exception 'Zu viele Fehlversuche. Bitte in einigen Minuten noch einmal versuchen.';
  end if;
  if extensions.crypt(coalesce(p_code, ''), v.code_hash) = v.code_hash then
    update public.abrechnung_code set fehlversuche = 0, gesperrt_bis = null where id = 1;
    return true;
  end if;
  update public.abrechnung_code
  set fehlversuche = fehlversuche + 1,
      gesperrt_bis = case when fehlversuche + 1 >= 5 then now() + interval '5 minutes' end
  where id = 1;
  return false;
end;
$$;

-- Code festlegen (4-8 Ziffern) oder mit null/leer entfernen; nur Inhaber
create or replace function public.abrechnung_code_setzen(p_code text)
returns void
language plpgsql
volatile
security definer
set search_path = public, extensions
as $$
begin
  if not public.ist_inhaber() then
    raise exception 'Nur der Inhaber kann den Code ändern.';
  end if;
  if coalesce(btrim(p_code), '') = '' then
    delete from public.abrechnung_code where id = 1;
    return;
  end if;
  if p_code !~ '^\d{4,8}$' then
    raise exception 'Der Code muss aus 4 bis 8 Ziffern bestehen.';
  end if;
  insert into public.abrechnung_code (id, code_hash, geaendert_am, fehlversuche, gesperrt_bis)
  values (1, extensions.crypt(p_code, extensions.gen_salt('bf')), now(), 0, null)
  on conflict (id) do update
    set code_hash = excluded.code_hash,
        geaendert_am = now(),
        fehlversuche = 0,
        gesperrt_bis = null;
end;
$$;

revoke all on function public.abrechnung_code_gesetzt() from public, anon;
revoke all on function public.abrechnung_code_pruefen(text) from public, anon;
revoke all on function public.abrechnung_code_setzen(text) from public, anon;
grant execute on function public.abrechnung_code_gesetzt() to authenticated;
grant execute on function public.abrechnung_code_pruefen(text) to authenticated;
grant execute on function public.abrechnung_code_setzen(text) to authenticated;
