-- Issue #78: Supabase mit Testdaten (Mock-Daten) befüllen.
--
-- Legt zusätzliche Test-Kunden an, die die Varianz abdecken, die die
-- bisherigen 7 Bestandskunden nicht zeigen: alle Kontakt-/Marketing-Felder
-- aus #59 (Handy, BevorzugterKontaktweg, Werbeeinwilligung inkl. Grund,
-- Kundenquelle, Merkmale), alle Anrede- und Krankenversicherungs-Varianten,
-- Minimaldatensätze (nur Pflichtfelder) sowie eine "Karteileiche" (lange
-- nicht gesehen).
--
-- Alle Testkunden sind klar als solche erkennbar: Vorname immer "Test",
-- sprechender Nachname, KundenNummer im Bereich T-20001..T-20010 (statt der
-- bestehenden numerischen 10001..10007), E-Mail-Adressen unter
-- @example.com. Es werden ausschließlich neue Zeilen eingefügt, bestehende
-- Kunden(-Datensätze) werden nicht verändert.
--
-- Idempotent: überspringt die gesamte Migration, falls der erste Testkunde
-- bereits existiert (z. B. bei versehentlichem erneutem Ausführen außerhalb
-- der Migrationsverwaltung).

do $$
begin
  if exists (select 1 from public.kunde where "KundenNummer" = 'T-20001') then
    raise notice 'Seed-Testkunden bereits vorhanden, überspringe Migration.';
    return;
  end if;

  insert into public.kunde (
    "KundenNummer", "Aufnahmedatum", "Anrede", "Nachname", "Vorname",
    "Geburtsdatum", "Geschlecht", "Straße", "Tätigkeit", "TelefonnummerPrivat",
    "Email", "KrankenkassenNummer", "VersichertenNummer", "Postleitzahl",
    "Hausnummer", "Stadt", "TelefonnummerGeschaeftlich", "KrankenversicherungsTyp",
    last_viewed_at, "Handy", "BevorzugterKontaktweg", "Werbeeinwilligung",
    "WerbeeinwilligungFuer", "Kundenquelle", "Merkmal1", "Merkmal2"
  )
  values
    ('T-20001', '2020-01-15', 'Frau', 'Kundin VIP', 'Test', '1978-03-14', 'weiblich',
     'Musterweg', null, '0731 5550001', 'test.kundin.vip@example.com', null, null,
     '89073', '1', 'Ulm', null, 'Privat Krankenversichert', null, '0170 5550001',
     true, true, 'Newsletter, Sonderangebote', 'Empfehlung', 'VIP', 'Gleitsichtträgerin'),

    ('T-20002', '2021-06-01', 'Herr', 'Kunde Opt-Out', 'Test', '1985-07-22', 'männlich',
     'Teststraße', null, '0731 5550002', 'test.kunde.optout@example.com', null, null,
     '89073', '5', 'Ulm', null, 'Gesetzlich Krankenversichert', null, null,
     false, false, null, 'Laufkundschaft', null, null),

    ('T-20003', null, 'Herr', 'Kunde Minimaldaten', 'Test', null, null,
     null, null, null, null, null, null,
     null, null, null, null, 'Unbekannt', null, null,
     false, false, null, null, null, null),

    ('T-20004', '2019-09-01', 'Prof. Dr.', 'Kunde Akademisch', 'Test', '1960-11-02', null,
     'Universitätsallee', 'Universitätsprofessor', null, 'test.kunde.akademisch@example.com', null, null,
     '89081', '10', 'Ulm', '0731 5559004', 'Privat Krankenversichert', null, null,
     false, false, null, 'Website', null, null),

    ('T-20005', '2022-02-10', 'Frau', 'Kundin Geschäftlich', 'Test', null, null,
     null, 'Selbstständig', null, 'test.kundin.geschaeftlich@example.com', null, null,
     null, null, 'Ulm', '0731 5550005', 'Gesetzlich Krankenversichert', null, '0170 5550005',
     true, true, 'Terminerinnerungen per SMS', 'Empfehlung', 'Zweitbrillenkundin', null),

    ('T-20006', '2023-04-18', 'Herr', 'Özdemir-Groß', 'Test', null, null,
     'Käthe-Kollwitz-Straße', null, null, 'test.oezdemir-gross@example.com', null, null,
     '89075', '12b', 'Ulm', null, 'Gesetzlich Krankenversichert', null, '0170 5550006',
     false, false, null, 'Google', 'Mehrsprachig (TR/DE)', null),

    ('T-20007', '2020-11-30', 'Dr.', 'Kunde Privat Versichert', 'Test', null, null,
     null, null, null, 'test.kunde.privat@example.com', 'PKV-TEST-001', 'V-TEST-1007',
     null, null, 'Ulm', null, 'Privat Krankenversichert', null, null,
     false, false, null, 'Empfehlung', null, null),

    ('T-20008', '2021-03-03', 'Frau', 'Kundin Gesetzlich Versichert', 'Test', null, null,
     null, null, null, 'test.kundin.gesetzlich@example.com', 'GKV-TEST-002', 'V-TEST-1008',
     null, null, 'Ulm', null, 'Gesetzlich Krankenversichert', null, null,
     false, false, null, 'Laufkundschaft', null, null),

    ('T-20009', '2015-05-05', 'Herr', 'Kunde Karteileiche', 'Test', null, null,
     null, null, null, 'test.kunde.karteileiche@example.com', null, null,
     null, null, 'Ulm', null, 'Unbekannt', '2024-01-01', null,
     false, false, null, 'Laufkundschaft', null, null),

    ('T-20010', '2026-08-30', 'Frau', 'Kundin Neukunde Online', 'Test', null, null,
     null, null, null, 'test.kundin.neukunde@example.com', null, null,
     null, null, 'Ulm', null, 'Unbekannt', null, '0170 5550010',
     true, true, 'Newsletter', 'Online-Terminbuchung', null, null);
end $$;
