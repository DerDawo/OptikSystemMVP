# Supabase-Migrationen

Dieses Projekt nutzt Supabase (Postgres + PostgREST + RLS) als alleiniges
Backend für `my-admin` - es gibt keinen separaten Anwendungsserver. Das
Frontend spricht direkt über `ra-supabase` mit der REST-API des unten
verlinkten Projekts.

- Projekt: "Optik-System Dev" (`psxrxggwqlltfhfskeoa`)
- Migrationsdateien: `supabase/migrations/*.sql`

## Wichtig: Migrationen müssen nach dem Merge angewendet werden

Eine neue Datei unter `supabase/migrations/` ändert für sich genommen
**nichts** an der laufenden Datenbank. Eine Migration muss nach dem Merge
zusätzlich gegen das Dev-Projekt angewendet werden, z. B. mit

```bash
supabase link --project-ref psxrxggwqlltfhfskeoa
supabase db push
```

oder über das Supabase-MCP-Tool (`apply_migration`), falls kein lokaler
CLI-Zugriff verfügbar ist.

Wird dieser Schritt vergessen, sieht das im Frontend wie ein Bug aus - z. B.
ein Formular/Menüpunkt, der plötzlich keine Daten mehr liefert oder mit
einem Fehler ins Leere läuft, obwohl der zugehörige Code bereits gemergt
ist. Genau das ist bereits zweimal passiert:

- #81: mehrere Migrationen aus früheren PRs waren nie auf das Dev-Projekt
  angewendet worden.
- #95: `20260831150100_create_betrieb.sql` (Menüpunkt "Betriebsdaten") und
  drei weitere Migrationen aus demselben Zeitraum waren nach dem Merge von
  PR #91 nicht angewendet worden.

**Vor dem Schließen eines PRs, der Dateien unter `supabase/migrations/`
hinzufügt, immer prüfen, dass diese auch tatsächlich auf dem Dev-Projekt
angewendet wurden** (z. B. mit `supabase migration list` oder dem
`list_migrations`-MCP-Tool), nicht nur dass die SQL-Datei im Repo liegt.
