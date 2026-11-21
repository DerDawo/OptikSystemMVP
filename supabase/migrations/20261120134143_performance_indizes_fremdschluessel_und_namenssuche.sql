-- Nachgetragen: Diese Migration wurde am 20.11.2026 direkt auf Prod
-- eingespielt, ohne dass die Datei im Repo lag. Dadurch brach
-- "supabase db push" im Prod-Deploy ("Remote migration versions not found").
-- Inhalt 1:1 aus supabase_migrations.schema_migrations übernommen; alles ist
-- idempotent (if not exists), auf Dev also gefahrlos.
--
-- Indizes für Fremdschlüssel und eine schnelle Namenssuche (pg_trgm).

create extension if not exists pg_trgm with schema extensions;

create index if not exists kunde_nachname_trgm_idx on public.kunde using gin ("Nachname" extensions.gin_trgm_ops);
create index if not exists kunde_vorname_trgm_idx on public.kunde using gin ("Vorname" extensions.gin_trgm_ops);

create index if not exists brille_kunde_id_idx on public.brille (kunde_id);
create index if not exists brille_fassung_idx on public.brille ("Fassung");
create index if not exists brille_glaslinks_idx on public.brille ("GlasLinks");
create index if not exists brille_glasrechts_idx on public.brille ("GlasRechts");
create index if not exists brille_glastyp_idx on public.brille ("Glastyp");
create index if not exists brille_hat_zusatzleistungen_brillenid_idx on public.brille_hat_zusatzleistungen ("BrillenID");
create index if not exists brille_hat_zusatzleistungen_zusatzleistungid_idx on public.brille_hat_zusatzleistungen ("ZusatzleistungID");
create index if not exists buchung_anfrage_kunde_id_idx on public.buchung_anfrage (kunde_id);
create index if not exists buchung_anfrage_termin_id_idx on public.buchung_anfrage (termin_id);
create index if not exists buchung_anfrage_terminart_id_idx on public.buchung_anfrage (terminart_id);
create index if not exists fundusbericht_bericht_idx on public.fundusbericht ("Bericht");
create index if not exists fundusbericht_bild_od_idx on public.fundusbericht ("Bild_OD");
create index if not exists fundusbericht_bild_os_idx on public.fundusbericht ("Bild_OS");
create index if not exists glaskatalog_hat_option_option_id_idx on public.glaskatalog_hat_option (glaskatalog_option_id);
create index if not exists glastyp_glaskatalog_id_idx on public.glastyp (glaskatalog_id);
create index if not exists kontaktlinse_kunde_id_idx on public.kontaktlinse (kunde_id);
create index if not exists kunde_zahlung_brille_brillenid_idx on public.kunde_leistet_zauzahlung_fuer_brille ("BrillenID");
create index if not exists kunde_zahlung_brille_kundenid_idx on public.kunde_leistet_zauzahlung_fuer_brille ("KundenID");

analyze public.kunde;
analyze public.brille;
