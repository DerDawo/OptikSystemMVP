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

## Dev-Branch (Supabase Branching)

> **Status:** Noch nicht eingerichtet. Das Projekt `psxrxggwqlltfhfskeoa`
> ("Optik-System Dev") hat aktuell **keine** Branches (siehe `list_branches`)
> und dient trotz seines Namens faktisch als einzige/produktive Umgebung -
> inklusive der Mock-/Testdaten aus #78. Die folgenden Schritte trennen
> Entwicklung (Testdaten) von Produktion (echte Kundendaten), siehe
> Tracking-Issue #104.

Ziel ist ein eigener Supabase-Branch `dev`, der ausschließlich für lokale
Entwicklung/Tests genutzt wird, während `main` (Production) künftig nur noch
echte Daten enthält (Aufräumen von Production folgt in einem eigenen Schritt,
siehe #80 - **nicht** Teil dieses Schritts).

### Branch erstellen

Voraussetzung: Die Organisation muss Supabase Branching unterstützen
(kostenpflichtiges Feature, siehe Hinweis unten zu den Kosten).

```bash
supabase link --project-ref psxrxggwqlltfhfskeoa
supabase branches create dev
```

Alternativ über das Supabase-MCP-Tool (`create_branch`, `project_id:
psxrxggwqlltfhfskeoa`) oder im Dashboard unter "Branching".

**Kosten:** Ein persistenter Branch verursacht laufende Kosten (Stand heute:
~0,0134 USD/Stunde, siehe `get_cost`-MCP-Tool - abhängig vom Tarif der
Organisation). Das Anlegen eines Branches erfordert daher **immer eine
explizite Bestätigung durch den Repo-/Projekt-Owner**, bevor er ausgeführt
wird - auch durch Claude/Automatisierungen. Aktuell läuft die Organisation
auf dem kostenlosen Plan; ggf. muss vor dem Anlegen eines Branches zunächst
auf einen kostenpflichtigen Plan gewechselt werden.

### Migrationen und Seed-/Mock-Daten auf den Dev-Branch bringen

Beim Erstellen eines Branches wendet Supabase automatisch alle vorhandenen
Migrationen aus `supabase/migrations/` an - inklusive der Seed-Migrationen
(`*_seed_*.sql`), die die Mock-Daten aus #78 enthalten. Ein manuelles
erneutes Einspielen ist beim ersten Erstellen des Branches i. d. R. nicht
nötig.

Für neue Migrationen, die danach hinzukommen: siehe Abschnitt oben
("Migrationen müssen nach dem Merge angewendet werden") - diese müssen
zusätzlich auf dem `dev`-Branch angewendet werden, z. B. mit
`supabase db push` (bei auf `dev` verlinktem CLI) oder `apply_migration`
mit der `project_id` des Branches.

### Dev-Branch zurücksetzen / neu befüllen

Um den Branch auf den Stand von `main` plus alle Migrationen
zurückzusetzen (z. B. wenn Testdaten "verschmutzt" sind):

```bash
supabase branches reset dev
```

bzw. das `reset_branch`-MCP-Tool mit der `branch_id`. Das führt alle
Migrationen (inkl. Seeds) erneut von Grund auf aus.

### Client-Konfiguration auf den Dev-Branch umstellen

`my-admin` liest die Verbindungsdaten ausschließlich aus den Env-Variablen
`VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (siehe
`my-admin/.env.example` und `my-admin/README.md`). Sobald der `dev`-Branch
existiert:

1. URL und Publishable Key des Branches ermitteln - im Dashboard unter dem
   Branch-Projekt ("Optik-System Dev · dev") oder per MCP-Tools
   `get_project_url` / `get_publishable_keys` mit der `project_id` des
   Branches (nicht die des Hauptprojekts).
2. Diese Werte in `my-admin/.env` eintragen (siehe
   `my-admin/.env.example`). `.env` ist nicht eingecheckt (`.gitignore`).
3. Der Supabase-MCP-Server (`.mcp.json`) ist weiterhin auf das Hauptprojekt
   `psxrxggwqlltfhfskeoa` konfiguriert - darüber sind auch alle Branches
   ansprechbar (`list_branches`, `apply_migration` etc. akzeptieren die
   `project_id`/`branch_id` als Parameter). Eine Anpassung von `.mcp.json`
   ist daher nicht nötig.

### CI / automatisierte Umgebungen

Sobald eine CI-Pipeline existiert (#100), sollte diese standardmäßig gegen
den `dev`-Branch laufen (Migrationen anwenden, Tests ausführen), niemals
gegen `main`/Production. Die konkrete Umsetzung ist Teil von #100 und #97
(Branch-/Umgebungsstrategie).
