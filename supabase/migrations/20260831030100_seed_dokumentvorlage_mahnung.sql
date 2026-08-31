-- Issue #57: Beispiel-Mahnvorlagen, gestaffelt nach Mahnstufe, damit
-- "Mahnung erstellen" (Mahnungen.tsx / FormulareDialog.tsx) sofort einen
-- passenden Text pro Stufe liefert. Die Namen ("Zahlungserinnerung",
-- "2. Mahnung", "3. Mahnung (Inkasso-Ankündigung)") entsprechen der
-- Zuordnung MAHNUNG_VORLAGE_NACH_STUFE in FormulareDialog.tsx.

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select 'Zahlungserinnerung', 'Mahnung',
$$Augenoptik Ulm
Musterstraße 1
89073 Ulm
Tel. 0731 123456 - info@augenoptik-ulm.de

Zahlungserinnerung

{{kunde.vollername}}
{{kunde.adresse}}

Ulm, {{heute.datum}}

Rechnungsnummer: {{brille.rechnungsnummer}}
Auftrag Nr.: {{brille.id}} vom {{brille.datum}}

Sehr geehrte(r) {{kunde.vollername}},

für oben genannte Rechnung konnten wir bislang leider keinen vollständigen
Zahlungseingang feststellen. Möglicherweise haben Sie die Zahlung schlicht
vergessen - wir bitten Sie daher freundlich, den offenen Betrag in den
nächsten Tagen zu begleichen.

Offener Restbetrag: {{brille.restbetrag}}
Zahlungsfrist: {{heute.zahlungsfrist}}

Sollten Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses
Schreiben bitte als gegenstandslos.

Mit freundlichen Grüßen
Ihre Augenoptik Ulm
$$,
  true
where not exists (
  select 1 from public.dokumentvorlage where "Name" = 'Zahlungserinnerung' and "Kategorie" = 'Mahnung'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select '2. Mahnung', 'Mahnung',
$$Augenoptik Ulm
Musterstraße 1
89073 Ulm
Tel. 0731 123456 - info@augenoptik-ulm.de

2. Mahnung

{{kunde.vollername}}
{{kunde.adresse}}

Ulm, {{heute.datum}}

Rechnungsnummer: {{brille.rechnungsnummer}}
Auftrag Nr.: {{brille.id}} vom {{brille.datum}}

Sehr geehrte(r) {{kunde.vollername}},

trotz unserer Zahlungserinnerung ist der offene Betrag aus obiger Rechnung
bislang nicht bei uns eingegangen. Wir bitten Sie nun mit Nachdruck, den
ausstehenden Betrag bis zur unten genannten Frist zu begleichen.

Offener Restbetrag: {{brille.restbetrag}}
Zahlungsfrist: {{heute.zahlungsfrist}}

Sollte der Betrag nicht fristgerecht eingehen, müssen wir weitere Schritte
zur Beitreibung der Forderung einleiten.

Mit freundlichen Grüßen
Ihre Augenoptik Ulm
$$,
  true
where not exists (
  select 1 from public.dokumentvorlage where "Name" = '2. Mahnung' and "Kategorie" = 'Mahnung'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select '3. Mahnung (Inkasso-Ankündigung)', 'Mahnung',
$$Augenoptik Ulm
Musterstraße 1
89073 Ulm
Tel. 0731 123456 - info@augenoptik-ulm.de

3. und letzte Mahnung

{{kunde.vollername}}
{{kunde.adresse}}

Ulm, {{heute.datum}}

Rechnungsnummer: {{brille.rechnungsnummer}}
Auftrag Nr.: {{brille.id}} vom {{brille.datum}}

Sehr geehrte(r) {{kunde.vollername}},

trotz zweifacher Mahnung liegt uns für obige Rechnung noch immer kein
Zahlungseingang vor. Wir fordern Sie letztmalig auf, den offenen Betrag bis
zur unten genannten Frist vollständig zu begleichen.

Offener Restbetrag: {{brille.restbetrag}}
Zahlungsfrist: {{heute.zahlungsfrist}}

Sollte der Betrag nicht fristgerecht bei uns eingehen, sehen wir uns
gezwungen, die Forderung ohne weitere Ankündigung an ein Inkassobüro zu
übergeben bzw. gerichtliche Schritte einzuleiten. Die dadurch entstehenden
zusätzlichen Kosten gehen zu Ihren Lasten.

Mit freundlichen Grüßen
Ihre Augenoptik Ulm
$$,
  true
where not exists (
  select 1 from public.dokumentvorlage where "Name" = '3. Mahnung (Inkasso-Ankündigung)' and "Kategorie" = 'Mahnung'
);
