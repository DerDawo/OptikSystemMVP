-- Issue #90: Berechtigungsschein zur Abrechnung von Sehhilfen (§ 33 SGB V).
--
-- Abschnitt 4 des Formulars fragt, ob eine augenärztliche Erstverordnung
-- (Muster 8) im System vorliegt bzw. an welchem Datum sie ausgestellt wurde.
-- Diese Angabe ist auftragsspezifisch (nicht kunden- oder betriebsweit) und
-- lässt sich aus den vorhandenen Daten nicht ableiten, daher zwei neue,
-- optionale Felder auf `brille`.
--
-- See: https://github.com/DerDawo/OptikSystemMVP/issues/90

alter table public.brille
  add column if not exists "ErstverordnungMuster8Vorhanden" boolean not null default false,
  add column if not exists "ErstverordnungMuster8Datum" date;

comment on column public.brille."ErstverordnungMuster8Vorhanden" is
  'Ob die augenärztliche Erstverordnung (Muster 8) für diesen Auftrag im System vorliegt, Issue #90.';
comment on column public.brille."ErstverordnungMuster8Datum" is
  'Ausstellungsdatum der augenärztlichen Erstverordnung (Muster 8), Issue #90.';
