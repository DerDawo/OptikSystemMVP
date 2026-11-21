-- Infomaterial für die Glasberatung, zuerst der Poloptic-Katalog
-- (Verkaufspreisliste 2024).
--
-- Das PDF hat rund 23 MB und gehört deshalb nicht ins Git-Repository und nicht
-- in das Vercel-Bundle. Außerdem ist es Händlermaterial des Herstellers. Es
-- liegt in einem PRIVATEN Storage-Bucket ohne öffentliche Links. Lesen und
-- Schreiben dürfen nur angemeldete Benutzer. Hochgeladen wird es auf der Seite
-- "Betriebsdaten", geöffnet über den Knopf "Poloptic-Katalog" im
-- Glasassistenten und auf der Seite Beratungsbilder.
-- Dateiname im Bucket: "poloptic-katalog.pdf".
-- Neuer Bucket, keine Änderung an bestehenden Daten.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'infomaterial',
  'infomaterial',
  false,
  52428800, -- 50 MB
  array['application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "infomaterial_lesen" on storage.objects;
create policy "infomaterial_lesen" on storage.objects
  for select to authenticated
  using (bucket_id = 'infomaterial');

drop policy if exists "infomaterial_hochladen" on storage.objects;
create policy "infomaterial_hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'infomaterial');

drop policy if exists "infomaterial_ersetzen" on storage.objects;
create policy "infomaterial_ersetzen" on storage.objects
  for update to authenticated
  using (bucket_id = 'infomaterial')
  with check (bucket_id = 'infomaterial');

drop policy if exists "infomaterial_loeschen" on storage.objects;
create policy "infomaterial_loeschen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'infomaterial');
