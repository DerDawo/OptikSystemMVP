-- Betriebsstempel und Unterschrift für Formulare (z. B. Rezeptanfrage an den
-- Augenarzt).
--
-- Die Bilder liegen in einem PRIVATEN Storage-Bucket (keine öffentlichen
-- Links) und sind nur für angemeldete Benutzer les- und schreibbar. Sie
-- gehören bewusst NICHT ins (öffentliche) Git-Repository; hochgeladen werden
-- sie auf der Seite "Betriebsdaten". Dateinamen im Bucket: "stempel" und
-- "unterschrift".
-- Neuer Bucket, keine Änderung an bestehenden Daten.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'betrieb-bilder',
  'betrieb-bilder',
  false,
  2097152, -- 2 MB
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "betrieb_bilder_lesen" on storage.objects;
create policy "betrieb_bilder_lesen" on storage.objects
  for select to authenticated
  using (bucket_id = 'betrieb-bilder');

drop policy if exists "betrieb_bilder_hochladen" on storage.objects;
create policy "betrieb_bilder_hochladen" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'betrieb-bilder');

drop policy if exists "betrieb_bilder_ersetzen" on storage.objects;
create policy "betrieb_bilder_ersetzen" on storage.objects
  for update to authenticated
  using (bucket_id = 'betrieb-bilder')
  with check (bucket_id = 'betrieb-bilder');

drop policy if exists "betrieb_bilder_loeschen" on storage.objects;
create policy "betrieb_bilder_loeschen" on storage.objects
  for delete to authenticated
  using (bucket_id = 'betrieb-bilder');
