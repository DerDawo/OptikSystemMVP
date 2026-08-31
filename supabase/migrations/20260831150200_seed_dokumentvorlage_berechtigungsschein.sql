-- Issue #90: Beispielvorlage der Kategorie "Berechtigungsschein" für die
-- Dokumentenvorlagen-Bibliothek (#58), damit "Berechtigungsschein erstellen"
-- in der Brillenkartei sofort eine aktive Vorlage findet.
--
-- Wie bei der Rechnung (#56, siehe 20260831020100_seed_dokumentvorlage_rechnung.sql)
-- hat der Berechtigungsschein ein eigenes, code-basiertes Layout mit
-- Ankreuzfeldern und Unterschriftszeilen (berechtigungsscheinTemplate.ts) statt
-- des generischen {{platzhalter}}-Fließtexts. Der Vorlagentext dient daher nur
-- dazu, dass der Formulare-Dialog einen aktiven Datensatz der Kategorie
-- "Berechtigungsschein" findet.

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select 'Berechtigungsschein', 'Berechtigungsschein',
$$Berechtigungsschein zur Abrechnung von Sehhilfen (GKV)

Das Layout dieses Dokuments ist fest im Code hinterlegt
(berechtigungsscheinTemplate.ts) - dieser Text wird nicht gedruckt.
$$,
  true
where not exists (
  select 1 from public.dokumentvorlage where "Name" = 'Berechtigungsschein' and "Kategorie" = 'Berechtigungsschein'
);
