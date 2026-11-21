-- Nachgetragen: Diese Migration wurde am 20.11.2026 direkt auf Prod
-- eingespielt, ohne dass die Datei im Repo lag (siehe
-- 20261120134143_performance_indizes_fremdschluessel_und_namenssuche.sql).
-- Idempotent.

alter table public.glass add column if not exists "DEG" numeric;
