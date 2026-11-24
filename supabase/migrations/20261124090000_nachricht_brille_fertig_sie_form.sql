-- WhatsApp-Vorlage "Brille fertig (Abholung)": Sie-Form mit Anrede und
-- Nachname ("Guten Tag Herr Gottschalk, ..."). Die Reihenfolge (Vorlage steht
-- als erste in der Auswahl) wurde in Prod direkt gesetzt.
update public.nachrichten set
  "Text" = 'Guten Tag {Anrede} {Nachname}, gute Nachrichten! Ihre neue Brille ist fertig montiert und liegt zur Abholung bereit. Bitte bringen Sie Ihre aktuelle Brille mit. Wir freuen uns auf Sie! Ihr Team von {Optiker}.'
where "Titel" = 'Brille fertig (Abholung)';
