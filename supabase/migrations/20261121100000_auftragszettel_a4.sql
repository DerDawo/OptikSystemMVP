-- Auftragszettel von A5 auf A4 umgestellt (zum Ausdrucken auf A4-Papier).
-- Das Layout kommt weiterhin aus my-admin/src/auftragszettelTemplate.ts;
-- hier werden nur Name und Hinweistext der bestehenden Vorlage angepasst.
-- Keine Kundendaten.

update public.dokumentvorlage
set
  "Name" = 'Auftragszettel A4 (mit Anamnesebogen)',
  "Vorlagentext" = 'Hinweis: Der Text dieser Vorlage wird nicht verwendet. Das Layout kommt aus my-admin/src/auftragszettelTemplate.ts (Auftragszettel A4, Rückseite Anamnesebogen; leer oder ausgefüllt).'
where "Kategorie" = 'Auftragszettel'
  and "Name" = 'Auftragszettel A5 (mit Anamnesebogen)';
