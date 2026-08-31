-- Issue #78: Supabase mit Testdaten (Mock-Daten) befüllen.
--
-- Mock-Daten für den SF6-Herstellerkatalog (#23), der bislang komplett leer
-- ist (glashersteller, glaskatalog, glaskatalog_option,
-- glaskatalog_hat_option). Bildet zwei fiktive Hersteller mit je einigen
-- Grundgläsern und Veredelungsoptionen/Tönungen nach, inkl. Zuordnung
-- (Combination.dat-Äquivalent), damit die Glaskatalog-Import-/Auswahl-UI
-- ohne echten Herstellerimport getestet werden kann.
--
-- Klar als Testdaten erkennbar über den Code-Präfix "SF6TEST-".
--
-- Idempotent über die vorhandenen unique-Constraints (code je Hersteller,
-- esd_code/code je Hersteller) mittels on conflict do nothing, zusätzlich
-- abgesichert durch einen Existenz-Check am Anfang.

do $$
begin
  if exists (select 1 from public.glashersteller where code = 'SF6TEST-ZEISS') then
    raise notice 'Seed-Glaskatalog bereits vorhanden, überspringe Migration.';
    return;
  end if;

  insert into public.glashersteller (code, name)
  values
    ('SF6TEST-ZEISS', 'Zeiss Testkatalog (SF6-Import Mock)'),
    ('SF6TEST-RODEN', 'Rodenstock Testkatalog (SF6-Import Mock)')
  on conflict (code) do nothing;

  insert into public.glaskatalog (glashersteller_id, esd_code, bezeichnung, brechungsindex, basispreis)
  select gh.id, v.esd_code, v.bezeichnung, v.brechungsindex, v.basispreis
  from public.glashersteller gh
  join (values
    ('SF6TEST-ZEISS', 'ZE-EINSTAERKE-15-HC', 'Zeiss Einstärken 1.5 Hartschicht', 1.5, 79.00),
    ('SF6TEST-ZEISS', 'ZE-GLEITSICHT-16-SV', 'Zeiss Gleitsicht Superb 1.6', 1.6, 249.00),
    ('SF6TEST-ZEISS', 'ZE-EINSTAERKE-167-HC', 'Zeiss Einstärken 1.67 Hartschicht', 1.67, 149.00),
    ('SF6TEST-RODEN', 'RO-EINSTAERKE-15-HC', 'Rodenstock Einstärken 1.5 Hartschicht', 1.5, 75.00),
    ('SF6TEST-RODEN', 'RO-GLEITSICHT-16-IMP', 'Rodenstock Impression Gleitsicht 1.6', 1.6, 289.00)
  ) as v(hersteller_code, esd_code, bezeichnung, brechungsindex, basispreis)
    on v.hersteller_code = gh.code
  on conflict (glashersteller_id, esd_code) do nothing;

  insert into public.glaskatalog_option (glashersteller_id, code, bezeichnung, typ, preis)
  select gh.id, v.code, v.bezeichnung, v.typ, v.preis
  from public.glashersteller gh
  join (values
    ('SF6TEST-ZEISS', 'ZE-OPT-SUPERENTSPIEGELUNG', 'Super Entspiegelung DuraVision', 'beschichtung', 49.00),
    ('SF6TEST-ZEISS', 'ZE-OPT-BLAUFILTER', 'Blaufilter BlueProtect', 'beschichtung', 35.00),
    ('SF6TEST-ZEISS', 'ZE-OPT-GRAU85', 'Tönung Grau 85%', 'farbe', 19.00),
    ('SF6TEST-RODEN', 'RO-OPT-SOLITAIRE', 'Solitaire Protect Plus 2', 'beschichtung', 45.00),
    ('SF6TEST-RODEN', 'RO-OPT-BRAUN75', 'Tönung Braun 75%', 'farbe', 18.00)
  ) as v(hersteller_code, code, bezeichnung, typ, preis)
    on v.hersteller_code = gh.code
  on conflict (glashersteller_id, code) do nothing;

  insert into public.glaskatalog_hat_option (glaskatalog_id, glaskatalog_option_id)
  select gk.id, go.id
  from public.glaskatalog gk
  join public.glashersteller gh on gh.id = gk.glashersteller_id
  join public.glaskatalog_option go on go.glashersteller_id = gh.id
  join (values
    ('ZE-EINSTAERKE-15-HC', 'ZE-OPT-SUPERENTSPIEGELUNG'),
    ('ZE-EINSTAERKE-15-HC', 'ZE-OPT-BLAUFILTER'),
    ('ZE-GLEITSICHT-16-SV', 'ZE-OPT-SUPERENTSPIEGELUNG'),
    ('ZE-GLEITSICHT-16-SV', 'ZE-OPT-GRAU85'),
    ('RO-EINSTAERKE-15-HC', 'RO-OPT-SOLITAIRE'),
    ('RO-GLEITSICHT-16-IMP', 'RO-OPT-SOLITAIRE'),
    ('RO-GLEITSICHT-16-IMP', 'RO-OPT-BRAUN75')
  ) as v(esd_code, option_code)
    on v.esd_code = gk.esd_code and v.option_code = go.code
  on conflict (glaskatalog_id, glaskatalog_option_id) do nothing;
end $$;
