-- Issue #78: Supabase mit Testdaten (Mock-Daten) befüllen.
--
-- Ergänzt die transaktionalen Testdaten für die in
-- 20260831130000_seed_kunde_testdaten.sql angelegten Testkunden
-- (T-20001..T-20010): Brillen-Aufträge inkl. Glas/Fassung/Glastyp,
-- Zusatzleistungs-Zuordnung, Kontaktlinsen-Aufträge, Termine und
-- Zuzahlungen.
--
-- Deckt insbesondere die Varianz ab, die den 75 bestehenden Aufträgen
-- fehlt: Zahlungsstatus "bezahlt" sowie Mahnstufe 1/2/3 (bislang stehen
-- ausnahmslos alle bestehenden Aufträge auf "offen"/Mahnstufe 0), einen
-- Auftrag ganz ohne Gläser (Sonnenbrille ohne Sehstärke) und einen Bezug
-- zum SF6-Testkatalog aus der vorherigen Migration.
--
-- "Summe" wird bewusst nicht gesetzt (wird per Trigger aus
-- Glas/Fassung/Rabatt/Zusatzleistungen berechnet, #52); die Zahlen unten
-- (Anzahlung/KKAnteil) sind so gewählt, dass sie zum jeweils berechneten
-- Ergebnis passen. Rechnungsnummern werden für bereits abgerechnete bzw.
-- gemahnte Aufträge über die bestehende assign_rechnungsnummer()-Funktion
-- vergeben (#56), nicht hart codiert.
--
-- Alle Notizen/Datensätze sind mit "[TESTDATEN-...]" markiert. Idempotent:
-- überspringt die gesamte Migration, falls bereits ein Testauftrag
-- existiert.

do $$
begin
  if exists (select 1 from public.brille where "Notizen" like '[TESTDATEN-BRILLE]%') then
    raise notice 'Seed-Testaufträge bereits vorhanden, überspringe Migration.';
    return;
  end if;

  -- 1) T-20001: VIP-Kundin, voll bezahlt, VIP-Rabatt 15 %, Glastyp aus dem
  --    SF6-Testkatalog (Zeiss Gleitsicht Superb 1.6).
  with new_glas_l as (
    insert into public.glass ("Sph", "Cyl", "A", "PD", "Betrag", "Seite", "Auftragsstatus")
    values (-2.00, -0.50, 65, 32, 159.00, 'Links', 'abgeholt')
    returning id
  ), new_glas_r as (
    insert into public.glass ("Sph", "Cyl", "A", "PD", "Betrag", "Seite", "Auftragsstatus")
    values (-2.25, -0.75, 65, 32, 159.00, 'Rechts', 'abgeholt')
    returning id
  ), new_fassung as (
    insert into public.fassung ("Lagernummer", "Bezeichnung", "Linie", "Farbe", "Groesse", "Betrag", "Hersteller")
    values ('TEST-F-001', 'Modell Aurora', 'Premium Line', 'Schwarz matt', '52-18-140', 129.00, 'OptikStyle')
    returning id
  ), new_glastyp as (
    insert into public.glastyp ("Bezeichnung", "Hersteller", "Verguetung", "GlasGroesse", "Bestellstatus", glaskatalog_id)
    select 'Zeiss Gleitsicht Superb 1.6 (Test)', 'Zeiss', 'Super Entspiegelung DuraVision', '65', 'eingetroffen', gk.id
    from public.glaskatalog gk
    join public.glashersteller gh on gh.id = gk.glashersteller_id
    where gh.code = 'SF6TEST-ZEISS' and gk.esd_code = 'ZE-GLEITSICHT-16-SV'
    returning id
  )
  insert into public.brille (
    "Berater", "Datum", "Werkstatt", "Abholung", "Notizen",
    "GlasLinks", "GlasRechts", "Fassung", "Glastyp", "BrillenArt", kunde_id,
    "RabattBezeichnung", "RabattProzent", "Anzahlung", "KKAnteil", "Zahlungsstatus", "Mahnstufe"
  )
  select
    'Vogel', '2026-05-10 09:30:00+00', 'Eigene Werkstatt', '2026-05-20 15:00:00+00',
    '[TESTDATEN-BRILLE] VIP-Kundin, voll bezahlt, VIP-Rabatt 15 %',
    l.id, r.id, f.id, gt.id, 'Gleitsichtbrille',
    (select id from public.kunde where "KundenNummer" = 'T-20001'),
    'VIP-Rabatt', 15, 379.95, 0, 'bezahlt', 0
  from new_glas_l l, new_glas_r r, new_fassung f, new_glastyp gt;

  -- 2) T-20002: aktueller Auftrag, offen, teilweise angezahlt, keine Mahnung.
  with new_glas_l as (
    insert into public.glass ("Sph", "Cyl", "Betrag", "Seite", "Auftragsstatus")
    values (-1.00, -0.25, 129.00, 'Links', 'bestellt')
    returning id
  ), new_glas_r as (
    insert into public.glass ("Sph", "Cyl", "Betrag", "Seite", "Auftragsstatus")
    values (-1.25, -0.25, 129.00, 'Rechts', 'bestellt')
    returning id
  ), new_fassung as (
    insert into public.fassung ("Lagernummer", "Bezeichnung", "Farbe", "Groesse", "Betrag", "Hersteller")
    values ('TEST-F-002', 'Modell Nordic', 'Blau', '54-17-140', 99.00, 'NordicFrames')
    returning id
  ), new_glastyp as (
    insert into public.glastyp ("Bezeichnung", "Hersteller", "Verguetung", "Bestellstatus")
    values ('Einstärkenglas 1.5 (Test)', 'Testglas GmbH', 'Standard-Entspiegelung', 'bestellt')
    returning id
  )
  insert into public.brille (
    "Berater", "Datum", "Werkstatt", "Notizen",
    "GlasLinks", "GlasRechts", "Fassung", "Glastyp", "BrillenArt", kunde_id,
    "Anzahlung", "KKAnteil", "Zahlungsstatus", "Mahnstufe"
  )
  select
    'Krause', '2026-08-20 10:00:00+00', 'Eigene Werkstatt',
    '[TESTDATEN-BRILLE] Aktueller Auftrag, offen, teilweise angezahlt',
    l.id, r.id, f.id, gt.id, 'Einstärkenbrille (Fern)',
    (select id from public.kunde where "KundenNummer" = 'T-20002'),
    100.00, 50.00, 'offen', 0
  from new_glas_l l, new_glas_r r, new_fassung f, new_glastyp gt;

  -- 3) T-20003: Minimaldaten-Kunde, überfällig, Mahnstufe 2, keine Anzahlung.
  with new_glas_l as (
    insert into public.glass ("Sph", "Betrag", "Seite", "Auftragsstatus")
    values (1.00, 89.00, 'Links', 'abgeholt')
    returning id
  ), new_glas_r as (
    insert into public.glass ("Sph", "Betrag", "Seite", "Auftragsstatus")
    values (1.25, 89.00, 'Rechts', 'abgeholt')
    returning id
  ), new_fassung as (
    insert into public.fassung ("Lagernummer", "Bezeichnung", "Groesse", "Betrag", "Hersteller")
    values ('TEST-F-003', 'Modell Basic', '50-16-135', 69.00, 'BasicOptics')
    returning id
  ), new_glastyp as (
    insert into public.glastyp ("Bezeichnung", "Bestellstatus")
    values ('Lesegläser 1.5 (Test)', 'eingetroffen')
    returning id
  )
  insert into public.brille (
    "Berater", "Datum", "Werkstatt", "Abholung", "Notizen",
    "GlasLinks", "GlasRechts", "Fassung", "Glastyp", "BrillenArt", kunde_id,
    "Anzahlung", "KKAnteil", "Zahlungsstatus", "Mahnstufe"
  )
  select
    'Bauer', '2026-04-05 08:00:00+00', 'Eigene Werkstatt', '2026-04-15 12:00:00+00',
    '[TESTDATEN-BRILLE] Überfällig, Mahnstufe 2, keine Anzahlung',
    l.id, r.id, f.id, gt.id, 'Lesebrille',
    (select id from public.kunde where "KundenNummer" = 'T-20003'),
    0, 0, 'offen', 2
  from new_glas_l l, new_glas_r r, new_fassung f, new_glastyp gt;

  -- 4) T-20004: höchste Mahnstufe (3, Inkasso-Ankündigung), Sonderrabatt 5 %.
  with new_glas_l as (
    insert into public.glass ("Sph", "Cyl", "Betrag", "Seite", "Auftragsstatus")
    values (-3.00, -1.00, 179.00, 'Links', 'abgeholt')
    returning id
  ), new_glas_r as (
    insert into public.glass ("Sph", "Cyl", "Betrag", "Seite", "Auftragsstatus")
    values (-3.25, -1.25, 179.00, 'Rechts', 'abgeholt')
    returning id
  ), new_fassung as (
    insert into public.fassung ("Lagernummer", "Bezeichnung", "Farbe", "Groesse", "Betrag", "Hersteller")
    values ('TEST-F-004', 'Modell Campus', 'Graphit', '53-17-140', 149.00, 'CampusOptics')
    returning id
  ), new_glastyp as (
    insert into public.glastyp ("Bezeichnung", "Verguetung", "Bestellstatus")
    values ('Bildschirmglas 1.6 (Test)', 'Blaufilter-Beschichtung', 'eingetroffen')
    returning id
  )
  insert into public.brille (
    "Berater", "Datum", "Werkstatt", "Abholung", "Notizen",
    "GlasLinks", "GlasRechts", "Fassung", "Glastyp", "BrillenArt", kunde_id,
    "RabattBezeichnung", "RabattProzent", "Anzahlung", "KKAnteil", "Zahlungsstatus", "Mahnstufe"
  )
  select
    'Zimmermann', '2026-01-15 09:00:00+00', 'Eigene Werkstatt', '2026-01-25 14:00:00+00',
    '[TESTDATEN-BRILLE] Sehr überfällig, Mahnstufe 3 (Inkasso-Ankündigung)',
    l.id, r.id, f.id, gt.id, 'Bildschirmarbeitsplatzbrille',
    (select id from public.kunde where "KundenNummer" = 'T-20004'),
    'Sonderrabatt', 5, 50.00, 0, 'offen', 3
  from new_glas_l l, new_glas_r r, new_fassung f, new_glastyp gt;

  -- 5) T-20005: Zweitbrille (zw-Rabatt 20 %), voll bezahlt.
  with new_glas_l as (
    insert into public.glass ("Sph", "Cyl", "Betrag", "Seite", "Auftragsstatus")
    values (-1.50, -0.50, 119.00, 'Links', 'abgeholt')
    returning id
  ), new_glas_r as (
    insert into public.glass ("Sph", "Cyl", "Betrag", "Seite", "Auftragsstatus")
    values (-1.75, -0.50, 119.00, 'Rechts', 'abgeholt')
    returning id
  ), new_fassung as (
    insert into public.fassung ("Lagernummer", "Bezeichnung", "Farbe", "Groesse", "Betrag", "Hersteller")
    values ('TEST-F-005', 'Modell Office Light', 'Titan', '55-17-140', 99.00, 'OfficeFrames')
    returning id
  ), new_glastyp as (
    insert into public.glastyp ("Bezeichnung", "Bestellstatus")
    values ('Einstärkenglas 1.6 Office (Test)', 'eingetroffen')
    returning id
  )
  insert into public.brille (
    "Berater", "Datum", "Werkstatt", "Abholung", "Notizen",
    "GlasLinks", "GlasRechts", "Fassung", "Glastyp", "BrillenArt", kunde_id,
    "RabattBezeichnung", "RabattProzent", "Anzahlung", "KKAnteil", "Zahlungsstatus", "Mahnstufe"
  )
  select
    'Schuster', '2026-07-01 11:00:00+00', 'Eigene Werkstatt', '2026-07-10 16:00:00+00',
    '[TESTDATEN-BRILLE] Zweitbrille, voll bezahlt, zw-Rabatt 20 %',
    l.id, r.id, f.id, gt.id, 'Arbeitsplatzbrille (Office)',
    (select id from public.kunde where "KundenNummer" = 'T-20005'),
    'zw-Zweitbrillen-Rabatt', 20, 269.60, 0, 'bezahlt', 0
  from new_glas_l l, new_glas_r r, new_fassung f, new_glastyp gt;

  -- 6) T-20006: Mahnstufe 1 (Zahlungserinnerung), mit Zusatzleistungen.
  with new_glas_l as (
    insert into public.glass ("Sph", "Betrag", "Seite", "Auftragsstatus")
    values (-0.75, 99.00, 'Links', 'abgeholt')
    returning id
  ), new_glas_r as (
    insert into public.glass ("Sph", "Betrag", "Seite", "Auftragsstatus")
    values (-1.00, 99.00, 'Rechts', 'abgeholt')
    returning id
  ), new_fassung as (
    insert into public.fassung ("Lagernummer", "Bezeichnung", "Farbe", "Groesse", "Betrag", "Hersteller")
    values ('TEST-F-006', 'Modell Vollrand Klassik', 'Havanna', '51-18-140', 79.00, 'KlassikOptik')
    returning id
  ), new_glastyp as (
    insert into public.glastyp ("Bezeichnung", "Bestellstatus")
    values ('Einstärkenglas 1.5 (Test)', 'eingetroffen')
    returning id
  )
  insert into public.brille (
    "Berater", "Datum", "Werkstatt", "Abholung", "Notizen",
    "GlasLinks", "GlasRechts", "Fassung", "Glastyp", "BrillenArt", kunde_id,
    "Anzahlung", "KKAnteil", "Zahlungsstatus", "Mahnstufe"
  )
  select
    'Herrmann', '2026-06-01 13:00:00+00', 'Eigene Werkstatt', '2026-06-10 10:00:00+00',
    '[TESTDATEN-BRILLE] Überfällig, Mahnstufe 1 (Zahlungserinnerung), mit Zusatzleistungen',
    l.id, r.id, f.id, gt.id, 'Fernbrille',
    (select id from public.kunde where "KundenNummer" = 'T-20006'),
    50.00, 0, 'offen', 1
  from new_glas_l l, new_glas_r r, new_fassung f, new_glastyp gt;

  -- 7) T-20007: privat versichert, frischer Auftrag, noch keine Rechnung.
  with new_glas_l as (
    insert into public.glass ("Sph", "Cyl", "Betrag", "Seite", "Auftragsstatus")
    values (-2.50, -0.75, 149.00, 'Links', 'zu bestellen')
    returning id
  ), new_glas_r as (
    insert into public.glass ("Sph", "Cyl", "Betrag", "Seite", "Auftragsstatus")
    values (-2.75, -0.75, 149.00, 'Rechts', 'zu bestellen')
    returning id
  ), new_fassung as (
    insert into public.fassung ("Lagernummer", "Bezeichnung", "Farbe", "Groesse", "Betrag", "Hersteller")
    values ('TEST-F-007', 'Modell Sport Pro', 'Rot/Schwarz', '56-18-135', 119.00, 'SportVision')
    returning id
  ), new_glastyp as (
    insert into public.glastyp ("Bezeichnung", "Bestellstatus")
    values ('Sportglas 1.6 gehärtet (Test)', 'zu bestellen')
    returning id
  )
  insert into public.brille (
    "Berater", "Datum", "Werkstatt", "Notizen",
    "GlasLinks", "GlasRechts", "Fassung", "Glastyp", "BrillenArt", kunde_id,
    "Anzahlung", "KKAnteil", "Zahlungsstatus", "Mahnstufe"
  )
  select
    'König', '2026-08-25 09:15:00+00', 'Eigene Werkstatt',
    '[TESTDATEN-BRILLE] Privat versichert, frischer Auftrag, noch keine Rechnung',
    l.id, r.id, f.id, gt.id, 'Sportbrille (optisch)',
    (select id from public.kunde where "KundenNummer" = 'T-20007'),
    150.00, 0, 'offen', 0
  from new_glas_l l, new_glas_r r, new_fassung f, new_glastyp gt;

  -- 8) T-20008: gesetzlich versichert, voll bezahlt (Anzahlung + KK-Anteil), ZNEU-Rabatt 10 %.
  with new_glas_l as (
    insert into public.glass ("Sph", "Cyl", "Betrag", "Seite", "Auftragsstatus")
    values (2.00, -0.50, 139.00, 'Links', 'abgeholt')
    returning id
  ), new_glas_r as (
    insert into public.glass ("Sph", "Cyl", "Betrag", "Seite", "Auftragsstatus")
    values (2.25, -0.50, 139.00, 'Rechts', 'abgeholt')
    returning id
  ), new_fassung as (
    insert into public.fassung ("Lagernummer", "Bezeichnung", "Farbe", "Groesse", "Betrag", "Hersteller")
    values ('TEST-F-008', 'Modell Kids Fun', 'Bunt', '46-16-125', 119.00, 'KidsVision')
    returning id
  ), new_glastyp as (
    insert into public.glastyp ("Bezeichnung", "Bestellstatus")
    values ('Kinderglas 1.5 bruchsicher (Test)', 'eingetroffen')
    returning id
  )
  insert into public.brille (
    "Berater", "Datum", "Werkstatt", "Abholung", "Notizen",
    "GlasLinks", "GlasRechts", "Fassung", "Glastyp", "BrillenArt", kunde_id,
    "RabattBezeichnung", "RabattProzent", "Anzahlung", "KKAnteil", "Zahlungsstatus", "Mahnstufe"
  )
  select
    'Walter', '2026-07-15 10:30:00+00', 'Eigene Werkstatt', '2026-07-25 15:30:00+00',
    '[TESTDATEN-BRILLE] Kassenbrille, voll bezahlt (Anzahlung + KK-Anteil), ZNEU-Rabatt 10 %',
    l.id, r.id, f.id, gt.id, 'Kinderbrille',
    (select id from public.kunde where "KundenNummer" = 'T-20008'),
    'ZNEU-Neukunden-Rabatt', 10, 327.30, 30.00, 'bezahlt', 0
  from new_glas_l l, new_glas_r r, new_fassung f, new_glastyp gt;

  -- 9) T-20009: "Karteileiche", sehr alter Auftrag, Mahnstufe 3.
  with new_glas_l as (
    insert into public.glass ("Sph", "Betrag", "Seite", "Auftragsstatus")
    values (-1.50, 99.00, 'Links', 'abgeholt')
    returning id
  ), new_glas_r as (
    insert into public.glass ("Sph", "Betrag", "Seite", "Auftragsstatus")
    values (-1.50, 99.00, 'Rechts', 'abgeholt')
    returning id
  ), new_fassung as (
    insert into public.fassung ("Lagernummer", "Bezeichnung", "Farbe", "Groesse", "Betrag", "Hersteller")
    values ('TEST-F-009', 'Modell Classic Sun', 'Schwarz glänzend', '54-17-140', 89.00, 'SunStyle')
    returning id
  ), new_glastyp as (
    insert into public.glastyp ("Bezeichnung", "Bestellstatus")
    values ('Sonnenglas getönt 1.5 (Test)', 'abgeholt')
    returning id
  )
  insert into public.brille (
    "Berater", "Datum", "Werkstatt", "Abholung", "Notizen",
    "GlasLinks", "GlasRechts", "Fassung", "Glastyp", "BrillenArt", kunde_id,
    "Anzahlung", "KKAnteil", "Zahlungsstatus", "Mahnstufe"
  )
  select
    'Huber', '2025-02-10 09:00:00+00', 'Eigene Werkstatt', '2025-02-20 12:00:00+00',
    '[TESTDATEN-BRILLE] Karteileiche, sehr alter Auftrag, Mahnstufe 3',
    l.id, r.id, f.id, gt.id, 'Sonnenbrille (optisch)',
    (select id from public.kunde where "KundenNummer" = 'T-20009'),
    0, 0, 'offen', 3
  from new_glas_l l, new_glas_r r, new_fassung f, new_glastyp gt;

  -- 10) T-20010: Neukunde, Sonnenbrille ohne Sehstärke (Randfall: kein Glas,
  --     kein Glastyp, nur Fassung), ZNEU-Rabatt 10 %.
  with new_fassung as (
    insert into public.fassung ("Lagernummer", "Bezeichnung", "Farbe", "Groesse", "Betrag", "Hersteller")
    values ('TEST-F-010', 'Modell Summer Breeze', 'Roségold', '57-16-140', 99.00, 'SummerFrames')
    returning id
  )
  insert into public.brille (
    "Berater", "Datum", "Werkstatt", "Abholung", "Notizen",
    "Fassung", "BrillenArt", kunde_id,
    "RabattBezeichnung", "RabattProzent", "Anzahlung", "KKAnteil", "Zahlungsstatus", "Mahnstufe"
  )
  select
    'Roth', '2026-08-30 15:00:00+00', 'Eigene Werkstatt', '2026-08-31 10:00:00+00',
    '[TESTDATEN-BRILLE] Randfall ohne Sehstärke (nur Fassung, kein Glas/Glastyp)',
    f.id, 'Sonnenbrille (ohne Sehstärke)',
    (select id from public.kunde where "KundenNummer" = 'T-20010'),
    'ZNEU-Neukunden-Rabatt', 10, 0, 0, 'offen', 0
  from new_fassung f;

  -- Rechnungsnummern für bereits abgerechnete bzw. gemahnte Testaufträge
  -- über die bestehende Vergabefunktion erzeugen (#56), analog zum echten
  -- Ablauf statt hart codierter Werte.
  perform public.assign_rechnungsnummer(b.id)
  from public.brille b
  join public.kunde k on k.id = b.kunde_id
  where k."KundenNummer" in ('T-20001', 'T-20003', 'T-20004', 'T-20005', 'T-20006', 'T-20008', 'T-20009')
    and b."Notizen" like '[TESTDATEN-BRILLE]%';

  -- Zusatzleistungen an den Auftrag von T-20006 hängen (Kontaktlinsenanpassung
  -- + Refraktion), damit die Summenberechnung inkl. Zusatzleistungen (#52)
  -- und die Zuordnungstabelle brille_hat_zusatzleistungen (bislang leer)
  -- Testdaten haben.
  insert into public.brille_hat_zusatzleistungen ("BrillenID", "ZusatzleistungID")
  select b.id, z.id
  from public.brille b
  join public.kunde k on k.id = b.kunde_id
  join public.zusatzleistung z on z."Bezeichnung" in ('Kontaktlinsenanpassung', 'Refraktion')
  where k."KundenNummer" = 'T-20006'
    and b."Notizen" like '[TESTDATEN-BRILLE]%';

  -- Zuzahlungs-Historie für ein paar der obigen Aufträge (kunde_leistet_zauzahlung_fuer_brille
  -- war bislang nur für Bestandsdaten befüllt).
  insert into public.kunde_leistet_zauzahlung_fuer_brille ("KundenID", "BrillenID", "Datum", "Betrag", "Restbetrag")
  select k.id, b.id, v.datum, v.betrag, v.restbetrag
  from public.kunde k
  join public.brille b on b.kunde_id = k.id and b."Notizen" like '[TESTDATEN-BRILLE]%'
  join (values
    ('T-20002', '2026-08-20'::timestamp, 100.00, 257.00),
    ('T-20004', '2026-01-15'::timestamp, 50.00, 431.65),
    ('T-20007', '2026-08-25'::timestamp, 150.00, 267.00)
  ) as v(kundennummer, datum, betrag, restbetrag)
    on v.kundennummer = k."KundenNummer";

  -- Kontaktlinsen-Aufträge (#49) - bislang komplett leer.
  insert into public.kontaktlinse (
    kunde_id, "Berater", "Datum", "Abholung", "Notizen", "Nachkontrolltermin",
    "LinsentypLinks", "MaterialLinks", "HerstellerLinks", "TragemodusLinks", "PreisLinks",
    "LinsentypRechts", "MaterialRechts", "HerstellerRechts", "TragemodusRechts", "PreisRechts",
    "Summe"
  )
  select
    (select id from public.kunde where "KundenNummer" = v.kundennummer),
    v.berater, v.datum, v.abholung, v.notizen, v.nachkontrolle,
    v.typ, v.material, v.hersteller, v.tragemodus, v.preis_l,
    v.typ, v.material, v.hersteller, v.tragemodus, v.preis_r,
    v.preis_l + v.preis_r
  from (values
    ('T-20001', 'Vogel', '2026-08-01'::date, '2026-08-05'::date,
     '[TESTDATEN-KONTAKTLINSE] Tageslinsen weich', '2026-09-15'::date,
     'weich sphärisch', 'Silikon-Hydrogel', 'Alcon Dailies', 'täglich', 35.00, 35.00),
    ('T-20005', 'Schuster', '2026-06-10'::date, '2026-06-15'::date,
     '[TESTDATEN-KONTAKTLINSE] Formstabile Monatslinsen', '2026-09-10'::date,
     'formstabil', 'RGP', 'CooperVision', 'monatlich', 89.00, 89.00),
    ('T-20006', 'Herrmann', '2026-05-01'::date, '2026-05-05'::date,
     '[TESTDATEN-KONTAKTLINSE] Torische Monatslinsen, Nachkontrolle bereits erfolgt', '2026-06-01'::date,
     'weich torisch', 'Hydrogel', 'Bausch + Lomb', 'monatlich', 45.00, 45.00),
    ('T-20007', 'König', '2026-03-01'::date, '2026-03-10'::date,
     '[TESTDATEN-KONTAKTLINSE] Formstabile Jahreslinsen', '2027-03-01'::date,
     'formstabil', 'RGP', 'Wöhlk', 'jährlich', 120.00, 120.00),
    ('T-20009', 'Huber', '2025-01-15'::date, '2025-01-20'::date,
     '[TESTDATEN-KONTAKTLINSE] Alte Bestellung (Karteileiche)', null,
     'weich sphärisch', 'Silikon-Hydrogel', 'Alcon Dailies', 'täglich', 30.00, 30.00)
  ) as v(kundennummer, berater, datum, abholung, notizen, nachkontrolle, typ, material, hersteller, tragemodus, preis_l, preis_r);

  -- Randfall: monokulare Versorgung (nur rechtes Auge, z. B. einseitige
  -- Presbyopie-Korrektur) - linke Seite bleibt komplett leer.
  insert into public.kontaktlinse (
    kunde_id, "Berater", "Datum", "Notizen",
    "LinsentypRechts", "MaterialRechts", "HerstellerRechts", "TragemodusRechts", "PreisRechts", "Summe"
  )
  select
    (select id from public.kunde where "KundenNummer" = 'T-20010'),
    'Roth', '2026-08-30'::date,
    '[TESTDATEN-KONTAKTLINSE] Randfall: monokulare Versorgung, nur rechtes Auge',
    'weich sphärisch', 'Hydrogel', 'Alcon Dailies', 'täglich', 55.00, 55.00;

  -- Termine (#... Kalender) - bislang nur 1 Bestandszeile.
  insert into public.termin (kunde_id, "Start", "Ende", "Terminart", "Notiz")
  select
    (select id from public.kunde where "KundenNummer" = v.kundennummer),
    v.start, v.ende, v.terminart, v.notiz
  from (values
    ('T-20001', '2026-09-05 10:00:00+00'::timestamptz, '2026-09-05 10:30:00+00'::timestamptz, 'Abholung', '[TESTDATEN-TERMIN] Brille abholen'),
    ('T-20002', '2026-09-10 14:00:00+00'::timestamptz, '2026-09-10 14:30:00+00'::timestamptz, 'Kontrolle', '[TESTDATEN-TERMIN] Sitzkontrolle'),
    ('T-20003', '2026-08-15 09:00:00+00'::timestamptz, '2026-08-15 09:20:00+00'::timestamptz, 'Refraktion', '[TESTDATEN-TERMIN] Termin in der Vergangenheit'),
    ('T-20004', '2026-08-31 11:00:00+00'::timestamptz, '2026-08-31 11:30:00+00'::timestamptz, 'Beratung', '[TESTDATEN-TERMIN] Termin heute'),
    ('T-20005', '2026-09-20 15:00:00+00'::timestamptz, '2026-09-20 16:00:00+00'::timestamptz, 'Einschleifen', '[TESTDATEN-TERMIN] Gläser einschleifen'),
    ('T-20006', '2026-10-05 10:00:00+00'::timestamptz, '2026-10-05 10:30:00+00'::timestamptz, 'Kontaktlinsenanpassung', '[TESTDATEN-TERMIN] Anpassung torische Linsen'),
    ('T-20007', '2026-07-20 09:30:00+00'::timestamptz, '2026-07-20 10:00:00+00'::timestamptz, 'Refraktion', '[TESTDATEN-TERMIN] Termin in der Vergangenheit'),
    ('T-20008', '2026-09-01 13:00:00+00'::timestamptz, '2026-09-01 13:20:00+00'::timestamptz, 'Abholung', '[TESTDATEN-TERMIN] Kinderbrille abholen'),
    ('T-20009', '2026-11-01 10:00:00+00'::timestamptz, '2026-11-01 10:30:00+00'::timestamptz, 'Rückrufbitte', '[TESTDATEN-TERMIN] Termin weit in der Zukunft'),
    ('T-20010', '2026-09-02 09:00:00+00'::timestamptz, '2026-09-02 09:15:00+00'::timestamptz, 'Erstberatung', '[TESTDATEN-TERMIN] Neukunde Erstberatung')
  ) as v(kundennummer, start, ende, terminart, notiz);
end $$;
