-- Beispielvorlagen fuer die Dokumentenvorlagen-Bibliothek (#58), damit die
-- Bibliothek nach dem Deploy nicht leer ist und das Platzhalter-Muster
-- demonstriert.
--
-- See: https://github.com/DerDawo/OptikSystemMVP/issues/58

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select 'Sehtest', 'Sehtest',
$$Sehtestprotokoll

Kunde: {{kunde.anrede}} {{kunde.vorname}} {{kunde.nachname}}
Geburtsdatum: {{kunde.geburtsdatum}}
Datum: {{heute.datum}}

Glas rechts: Sph {{glasrechts.sph}}  Cyl {{glasrechts.cyl}}  Achse {{glasrechts.a}}
Glas links:  Sph {{glaslinks.sph}}  Cyl {{glaslinks.cyl}}  Achse {{glaslinks.a}}

PD rechts: {{glasrechts.pd}}   PD links: {{glaslinks.pd}}

Berater: {{brille.berater}}

Unterschrift Kunde: ____________________
$$,
  true
where not exists (
  select 1 from public.dokumentvorlage where "Name" = 'Sehtest' and "Kategorie" = 'Sehtest'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select 'Werkstattkarte', 'Werkstattkarte',
$$Werkstattkarte

Auftrag Nr.: {{brille.id}}
Kunde: {{kunde.vorname}} {{kunde.nachname}}
Kundennummer: {{kunde.kundennummer}}

Fassung: {{fassung.bezeichnung}}
Glastyp: {{glastyp.bezeichnung}} ({{glastyp.hersteller}})
Veredelung: {{glastyp.verguetung}}

Glas rechts: Sph {{glasrechts.sph}}  Cyl {{glasrechts.cyl}}  Achse {{glasrechts.a}}  Add {{glasrechts.add}}
Glas links:  Sph {{glaslinks.sph}}  Cyl {{glaslinks.cyl}}  Achse {{glaslinks.a}}  Add {{glaslinks.add}}

Werkstatt: {{brille.werkstatt}}
Abholtermin: {{brille.abholung}}
Notizen: {{brille.notizen}}
$$,
  true
where not exists (
  select 1 from public.dokumentvorlage where "Name" = 'Werkstattkarte' and "Kategorie" = 'Werkstattkarte'
);

insert into public.dokumentvorlage ("Name", "Kategorie", "Vorlagentext", "Aktiv")
select 'Berechtigungsschein Kassenbrille', 'Berechtigungsschein',
$$Berechtigungsschein

Kunde: {{kunde.anrede}} {{kunde.vorname}} {{kunde.nachname}}
Versichertennummer: {{kunde.versichertennummer}}
Krankenkasse: {{kunde.krankenkassennummer}}
Krankenversicherungstyp: {{kunde.krankenversicherungstyp}}

Auftrag Nr.: {{brille.id}} vom {{brille.datum}}
KK-Anteil: {{brille.kkanteil}}

Hiermit bestaetigen wir die Ausgabe der oben genannten Sehhilfe.

Ort, Datum: {{heute.datum}}
Unterschrift: ____________________
$$,
  true
where not exists (
  select 1 from public.dokumentvorlage where "Name" = 'Berechtigungsschein Kassenbrille' and "Kategorie" = 'Berechtigungsschein'
);
