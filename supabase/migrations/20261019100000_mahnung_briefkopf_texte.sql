-- Mahnungen im Briefkopf der Rechnung (my-admin/src/mahnungTemplate.ts):
-- Logo, Absender, Anschrift, Datum, Rechnungsnummer und Bankverbindung
-- kommen jetzt aus dem Layout. Die Vorlagen enthalten nur noch die
-- Überschrift (erste Zeile) und den Brieftext mit Platzhaltern, die beim
-- Drucken automatisch gefüllt werden.
--
-- Neue Texte für die Zahlungserinnerung und die 1. Mahnung. Die Stufen
-- heißen jetzt: Zahlungserinnerung -> 1. Mahnung -> 2. Mahnung
-- (Inkasso-Ankündigung); bisher "2. Mahnung" und "3. Mahnung
-- (Inkasso-Ankündigung)". Passend dazu MAHNUNG_VORLAGE_NACH_STUFE in
-- my-admin/src/FormulareDialog.tsx.
-- Nur Vorlagen-Datensätze, keine Kundendaten.

update public.dokumentvorlage
set "Name" = '1. Mahnung'
where "Kategorie" = 'Mahnung' and "Name" = '2. Mahnung';

update public.dokumentvorlage
set "Name" = '2. Mahnung (Inkasso-Ankündigung)'
where "Kategorie" = 'Mahnung' and "Name" = '3. Mahnung (Inkasso-Ankündigung)';

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select v."Name", 'Mahnung', '', true
from (values
  ('Zahlungserinnerung'),
  ('1. Mahnung'),
  ('2. Mahnung (Inkasso-Ankündigung)')
) as v("Name")
where not exists (
  select 1 from public.dokumentvorlage d
  where d."Kategorie" = 'Mahnung' and d."Name" = v."Name"
);

update public.dokumentvorlage
set "Vorlagentext" = $$Freundliche Zahlungserinnerung

{{kunde.briefanrede}},

bei der Durchsicht unserer Zahlungseingänge haben wir festgestellt, dass die Rechnung {{rechnung.nummer}} vom {{rechnung.datum}} über {{mahnung.betrag}} € noch offen ist. Vielleicht ist die Zahlung im Alltag einfach untergegangen.

Wir bitten Sie, den offenen Betrag bis zum {{mahnung.frist}} auf das unten angegebene Konto zu überweisen. Falls Sie die Zahlung bereits veranlasst haben, betrachten Sie dieses Schreiben bitte als erledigt.

Sollte die Zahlung momentan nicht möglich sein oder Sie Fragen zur Rechnung haben, nehmen Sie bitte Kontakt mit uns auf. Gemeinsam finden wir sicher eine passende Lösung.

Vielen Dank für Ihre Rückmeldung und Ihr Vertrauen.

Mit freundlichen Grüßen
{{betrieb.name}}
{{betrieb.kontakt}}$$
where "Kategorie" = 'Mahnung' and "Name" = 'Zahlungserinnerung';

update public.dokumentvorlage
set "Vorlagentext" = $$1. Mahnung – offene Rechnung

{{kunde.briefanrede}},

trotz Fälligkeit konnten wir bislang keinen Zahlungseingang zu unserer Rechnung {{rechnung.nummer}} vom {{rechnung.datum}} feststellen.

Offener Rechnungsbetrag: {{mahnung.betrag}} €
Fällig seit: {{rechnung.faellig}}

Wir fordern Sie auf, den offenen Betrag bis spätestens {{mahnung.frist}} auf das unten angegebene Konto zu überweisen. Bitte geben Sie dabei die Rechnungsnummer als Verwendungszweck an.

Sollte bis zum Ablauf dieser Frist kein Zahlungseingang erfolgen, behalten wir uns vor, die Forderung weiterzuverfolgen und gegebenenfalls ein gerichtliches Mahnverfahren einzuleiten. Kosten, die im Fall eines tatsächlichen Zahlungsverzugs gesetzlich erstattungsfähig sind, können dabei hinzukommen.

Falls Sie den Betrag bereits überwiesen haben, betrachten Sie dieses Schreiben bitte als gegenstandslos. Sollten Sie Einwände gegen die Rechnung haben oder eine Zahlung derzeit nicht leisten können, melden Sie sich bitte umgehend bei uns, damit wir den Sachverhalt klären können.

Mit freundlichen Grüßen
{{betrieb.name}}
{{betrieb.kontakt}}
{{betrieb.bank}}$$
where "Kategorie" = 'Mahnung' and "Name" = '1. Mahnung';

update public.dokumentvorlage
set "Vorlagentext" = $$2. und letzte Mahnung

{{kunde.briefanrede}},

trotz unserer Zahlungserinnerung und Mahnung liegt uns für die Rechnung {{rechnung.nummer}} vom {{rechnung.datum}} noch immer kein Zahlungseingang vor.

Offener Rechnungsbetrag: {{mahnung.betrag}} €
Fällig seit: {{rechnung.faellig}}

Wir fordern Sie letztmalig auf, den offenen Betrag bis spätestens {{mahnung.frist}} vollständig auf das unten angegebene Konto zu überweisen. Bitte geben Sie dabei die Rechnungsnummer als Verwendungszweck an.

Sollte der Betrag nicht fristgerecht bei uns eingehen, sehen wir uns gezwungen, die Forderung ohne weitere Ankündigung an ein Inkassobüro zu übergeben bzw. gerichtliche Schritte einzuleiten. Kosten, die durch den Zahlungsverzug entstehen und gesetzlich erstattungsfähig sind, gehen dabei zu Ihren Lasten.

Falls Sie den Betrag inzwischen überwiesen haben, betrachten Sie dieses Schreiben bitte als gegenstandslos.

Mit freundlichen Grüßen
{{betrieb.name}}
{{betrieb.kontakt}}
{{betrieb.bank}}$$
where "Kategorie" = 'Mahnung' and "Name" = '2. Mahnung (Inkasso-Ankündigung)';
