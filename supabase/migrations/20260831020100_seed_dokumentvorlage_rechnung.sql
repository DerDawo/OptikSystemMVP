-- Issue #56: Beispiel-Rechnungsvorlage für die Dokumentenvorlagen-Bibliothek
-- (#58), damit "Rechnung erstellen" in der Brillenkartei sofort einen
-- vollständigen Rechnungstext liefert. Nutzt den neuen Positionen-Platzhalter
-- {{brille.positionen}} (documentTemplateEngine.ts) sowie die bereits
-- bestehenden Platzhalter für Kunde, Rechnungsnummer, Summe, Anzahlung,
-- KK-Anteil, Restbetrag und Zahlungsstatus.
--
-- Absenderdaten sind bewusst als einfacher, im Vorlagentext editierbarer
-- Platzhaltertext hinterlegt - es gibt (noch) keine eigene
-- Firmenstammdaten-Tabelle. Der Text kann jederzeit unter "Dokumentvorlagen"
-- angepasst werden.

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select 'Rechnung', 'Rechnung',
$$Augenoptik Ulm
Musterstraße 1
89073 Ulm
Tel. 0731 123456 - info@augenoptik-ulm.de

Rechnung

Rechnungsnummer: {{brille.rechnungsnummer}}
Rechnungsdatum: {{heute.datum}}
Auftrag Nr.: {{brille.id}} vom {{brille.datum}}

Kunde:
{{kunde.vollername}}
{{kunde.adresse}}

Positionen:
{{brille.positionen}}

Summe: {{brille.summe}}
Anzahlung: {{brille.anzahlung}}
KK-Anteil: {{brille.kkanteil}}
Restbetrag: {{brille.restbetrag}}

Zahlungsstatus: {{brille.zahlungsstatus}}

Vielen Dank für Ihren Einkauf!
$$,
  true
where not exists (
  select 1 from public.dokumentvorlage where "Name" = 'Rechnung' and "Kategorie" = 'Rechnung'
);
