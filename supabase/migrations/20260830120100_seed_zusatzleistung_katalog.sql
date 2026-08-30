-- Issue #22: initialer Leistungskatalog für Zusatzleistungen
--
-- Befüllt den Zusatzleistungs-Katalog mit den im Issue hinterlegten Kategorien,
-- Bezeichnungen und empfohlenen Preisen. Idempotent: bereits vorhandene
-- Bezeichnungen werden nicht doppelt angelegt.

insert into public.zusatzleistung ("Bezeichnung", "Betrag", "Kategorie")
select v."Bezeichnung", v."Betrag", v."Kategorie"
from (
  values
    ('Refraktion', 35, 'Diagnostik & Vorsorge'),
    ('Tränenfilmanalyse', 49, 'Diagnostik & Vorsorge'),
    ('IOD (Augeninnendruckmessung)', 29, 'Diagnostik & Vorsorge'),
    ('Kinderoptometrie / Dokumentation / Gutachten', 89, 'Diagnostik & Vorsorge'),
    ('Visusprüfung erweitert', 25, 'Diagnostik & Vorsorge'),
    ('Kontaktlinsenanpassung', 89, 'Kontaktlinsen'),
    ('Nachanpassung / Kontrolle', 39, 'Kontaktlinsen'),
    ('Speziallinsen-Anpassung (torisch, multifokal, Ortho-K)', 129, 'Kontaktlinsen'),
    ('Hausbesuch / Untersuchung / Dokumentation', 59, 'Service & Hausbesuch'),
    ('Brillen-Check / Wartungspaket', 19, 'Service & Hausbesuch'),
    ('Ultraschall-Reinigung', 12, 'Service & Hausbesuch'),
    ('Lötung', 35, 'Reparaturen'),
    ('Lötung Nasensteg', 45, 'Reparaturen'),
    ('Rillen (Anti-Reflex-Rillen)', 30, 'Veredelungen & Extras'),
    ('Blaulichtfilter / Blue-Blocker', 45, 'Veredelungen & Extras'),
    ('Entspiegelung (hochwertig)', 55, 'Veredelungen & Extras'),
    ('Hartschicht / Kratzfestbeschichtung', 30, 'Veredelungen & Extras'),
    ('Selbsttönung (Transitions)', 70, 'Veredelungen & Extras')
) as v("Bezeichnung", "Betrag", "Kategorie")
where not exists (
  select 1 from public.zusatzleistung z where z."Bezeichnung" = v."Bezeichnung"
);
