-- Geschwindigkeit: Die Rechte-Regeln (Policies) aus "Rollen und Protokoll"
-- riefen darf_lesen() usw. für JEDE Zeile auf. Bei großen Tabellen (z. B.
-- 38 000 Glastypen) dauerte schon das Zählen für eine Liste über 9 Sekunden
-- und brach mit "canceling statement due to statement timeout" ab.
--
-- In "(select …)" eingepackt wertet Postgres die Prüfung einmal je Abfrage
-- aus (InitPlan) statt je Zeile: gemessen 9,3 s → 10 ms. Die Regeln selbst
-- bleiben inhaltlich gleich.
--
-- Stellt alle Policies im Schema public um, die diese Funktionen oder
-- auth.jwt() direkt aufrufen. Bereits umgestellte Regeln (enthalten SELECT)
-- werden übersprungen, die Migration kann also gefahrlos erneut laufen.
--
-- Hinweis für neue Tabellen: Regeln gleich so schreiben, z. B.
--   using ((select public.darf_lesen()))

do $$
declare
  p record;
  muster constant text := '\m(darf_lesen|darf_bearbeiten|ist_inhaber|aktuelle_rolle)\(\)';
  neu_using text;
  neu_check text;
  befehl text;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
    from pg_policies
    where schemaname = 'public'
      and (
        coalesce(qual, '') ~ '(darf_lesen|darf_bearbeiten|ist_inhaber|aktuelle_rolle)\(|auth\.jwt\(\)'
        or coalesce(with_check, '') ~ '(darf_lesen|darf_bearbeiten|ist_inhaber|aktuelle_rolle)\(|auth\.jwt\(\)'
      )
      and coalesce(qual, '') !~* 'select'
      and coalesce(with_check, '') !~* 'select'
  loop
    neu_using := case when p.qual is null then null else
      replace(
        regexp_replace(p.qual, muster, '(select public.\1())', 'g'),
        'auth.jwt()', '(select auth.jwt())'
      ) end;
    neu_check := case when p.with_check is null then null else
      replace(
        regexp_replace(p.with_check, muster, '(select public.\1())', 'g'),
        'auth.jwt()', '(select auth.jwt())'
      ) end;

    befehl := format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename);
    if neu_using is not null then
      befehl := befehl || format(' using (%s)', neu_using);
    end if;
    if neu_check is not null then
      befehl := befehl || format(' with check (%s)', neu_check);
    end if;
    execute befehl;
  end loop;
end $$;
