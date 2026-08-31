-- Issue #88: Die Rechnung bekommt ein eigenes, code-basiertes HTML-Layout
-- (my-admin/src/rechnungTemplate.ts), das 1:1 dem mitgelieferten Referenz-
-- Design entspricht (Logo, Datenbox, Titelbalken, Positionstabelle,
-- Summenbalken, dreispaltige Fußzeile). Tabellen/Balken/Logo lassen sich
-- nicht sinnvoll über den generischen {{platzhalter}}-Fließtext (siehe
-- documentTemplateEngine.ts) abbilden - der Vorlagentext des "Rechnung"-
-- Datensatzes wird daher beim Erstellen einer Rechnung nicht mehr
-- gerendert. Der Datensatz bleibt bestehen, da FormulareDialog.tsx über ihn
-- die aktive Vorlage der Kategorie "Rechnung" auffindet.
update public.dokumentvorlage
set "Vorlagentext" =
  'Hinweis: Der Text dieser Vorlage wird nicht mehr verwendet. Das Rechnungslayout ist seit Issue #88 fest im Code hinterlegt (my-admin/src/rechnungTemplate.ts), damit Logo, Tabellen und Balken wie im Referenz-Design dargestellt werden können. Änderungen an den Firmen-/Bankstammdaten (Adresse, USt-ID, IBAN/BIC, Tel/Fax) erfolgen dort in der Konstante RECHNUNG_ABSENDER.'
where "Kategorie" = 'Rechnung';
