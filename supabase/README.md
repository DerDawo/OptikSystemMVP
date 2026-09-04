# Supabase-Migrationen

Dieses Projekt nutzt Supabase (Postgres + PostgREST + RLS) als alleiniges
Backend für `my-admin` - es gibt keinen separaten Anwendungsserver. Das
Frontend spricht direkt über `ra-supabase` mit der REST-API eines der beiden
unten beschriebenen Projekte.

- Migrationsdateien: `supabase/migrations/*.sql`

## Zwei getrennte Supabase-Projekte: Dev und Prod

> Tracking-Issue: #104 (Dev/Prod-Trennung), umgesetzt in #79.

| | Projekt | Ref | Zweck |
|---|---|---|---|
| Dev | "Optik-System Dev" | `psxrxggwqlltfhfskeoa` | Lokale Entwicklung/Tests, enthält die Mock-/Testdaten aus #78 |
| Prod | "Optik-System Prod" | `cktdtojgrxskihihmnjm` | Live-Betrieb, ausschließlich echte Daten |

**Warum zwei Projekte statt Supabase Branching?** Supabase Branching
(persistente Branches eines einzigen Projekts) verursacht laufende Kosten
und setzt in der Regel einen kostenpflichtigen Organisations-Plan voraus.
Die Organisation `Optik-System` läuft auf dem **kostenlosen Plan**. Ein
zweites eigenständiges Projekt in derselben Organisation ist dagegen im
Rahmen des kostenlosen Kontingents möglich (`get_cost` liefert `0 USD/Monat`
für ein weiteres Projekt in dieser Organisation) und erfordert keine
Plan-Entscheidung. Nachteile gegenüber echtem Branching: kein automatischer
Migrations-Sync und kein `merge_branch`-Werkzeug zwischen den Projekten -
jede Migration muss manuell auf beiden Projekten angewendet werden (siehe
unten), und Schema-Drift zwischen Dev und Prod ist möglich, wenn das
vergessen wird (siehe #81/#95 unten - dasselbe Risiko bestand vorher schon
mit nur einem Projekt).

Das Dev-Projekt (`psxrxggwqlltfhfskeoa`) bestand bereits vor #79 und enthielt
ausschließlich Mock-/Testdaten (alle Kunden mit `@example.com`-Adressen,
`betrieb` leer) - es musste daher nicht bereinigt werden und dient
unverändert als Dev-Umgebung weiter. Das Prod-Projekt
(`cktdtojgrxskihihmnjm`) wurde neu angelegt und enthält **nur das Schema**
(alle Migrationen außer den `*_testdaten.sql`-Seeds), keine Testdaten.

## Migrationen werden automatisch angewendet (CI/CD, #100)

> Löst #81/#95 (vergessene manuelle Migration) dauerhaft: Das Anwenden ist
> seit #100 kein manueller Schritt mehr, sondern läuft automatisch per
> GitHub Actions.

Eine neue Datei unter `supabase/migrations/` ändert für sich genommen
**nichts** an der laufenden Datenbank - sie muss zusätzlich gegen das
jeweilige Projekt angewendet werden. Das übernehmen jetzt zwei Workflows:

- [`.github/workflows/supabase-migrate-dev.yml`](../.github/workflows/supabase-migrate-dev.yml):
  läuft bei jedem Push nach `dev`, der Dateien unter `supabase/migrations/`
  ändert, und wendet alle Migrationen (inkl. `*_testdaten.sql`) auf das
  Dev-Projekt (`psxrxggwqlltfhfskeoa`) an.
- [`.github/workflows/supabase-migrate-prod.yml`](../.github/workflows/supabase-migrate-prod.yml):
  läuft bei jedem Push nach `main`, der Dateien unter `supabase/migrations/`
  ändert, und wendet alle Migrationen **außer** `*_testdaten.sql` auf das
  Prod-Projekt (`cktdtojgrxskihihmnjm`) an - Testdaten-Migrationen werden
  vor dem `supabase db push` aus dem Checkout entfernt, sodass sie
  niemals nach Prod gelangen können (Details siehe Kommentar im Workflow;
  #101 kann die Testdaten-/Seed-Konvention darauf aufbauend weiter
  verfeinern).

Beide Workflows lassen sich zusätzlich manuell über "Run workflow"
(`workflow_dispatch`) in den GitHub Actions auslösen, z. B. um eine
frühere, verpasste Migration nachträglich anzuwenden.

**Benötigtes Secret:** `SUPABASE_ACCESS_TOKEN` - ein persönlicher Access
Token aus dem Supabase-Dashboard (Account-Icon → Access Tokens →
"Generate new token"). Muss vom Repo-Owner einmalig unter
Settings → Secrets and variables → Actions als Repository-Secret
hinterlegt werden (diese Session hat keinen Zugriff auf die
Repository-Settings, um das selbst zu tun). Ohne dieses Secret schlagen
beide Workflows beim Schritt `supabase link` fehl - das Fehlschlagen ist in
diesem Fall gewollt (Fail-Fast statt eines stillschweigend übersprungenen
Migrationsschritts wie bei #81/#95) und im Actions-Log klar erkennbar.

Alternativ (z. B. wenn das Secret noch nicht hinterlegt ist oder ein
sofortiger Eingriff nötig ist) bleibt das manuelle Anwenden per
Supabase-CLI oder MCP-Tool weiterhin möglich:

```bash
supabase link --project-ref psxrxggwqlltfhfskeoa   # oder cktdtojgrxskihihmnjm für Prod
supabase db push
```

oder über das Supabase-MCP-Tool (`apply_migration`).

**Migrationen, deren Dateiname `_testdaten.sql` enthält (Mock-/Testdaten,
siehe #78), gehören ausschließlich auf das Dev-Projekt, niemals auf
Prod.** Alle anderen Migrationen (Schema-Änderungen und "echte" Seeds wie
Standard-Dokumentvorlagen oder der Leistungskatalog) gehören auf beide
Projekte.

Trotz Automatisierung gilt weiterhin: **vor dem Schließen eines PRs, der
Dateien unter `supabase/migrations/` hinzufügt, prüfen, dass der
zugehörige `Supabase Migrate`-Workflow-Lauf erfolgreich war** (Tab
"Actions" im Repository, bzw. `list_migrations`-MCP-Tool zur Kontrolle auf
der Datenbank selbst), nicht nur dass die SQL-Datei im Repo liegt.

## Baseline-Migrationen (Tabellen aus der Zeit vor der Migrationsverwaltung)

`kunde`, `brille`, `glass`, `glastyp`, `fassung`, `zusatzleistung`,
`brille_hat_zusatzleistungen`, `kunde_leistet_zauzahlung_fuer_brille` und
`nachrichten` wurden ursprünglich über den Supabase Studio Table Editor
angelegt, bevor `supabase/migrations/` genutzt wurde. Beim Aufbau des neuen
Prod-Projekts aus `supabase/migrations/` (siehe unten) fiel auf, dass es
dafür bislang **keine eingecheckte Migration gab** - ein frisches Projekt
ließ sich also gar nicht allein aus dem Repo aufbauen. Das ist jetzt über
`20260101000000_baseline_genesis_schema.sql` und
`20260101000001_baseline_genesis_nachrichten.sql` nachgeholt (per
Introspektion des Dev-Projekts rekonstruiert, siehe Kommentare in den
Dateien). Beide Migrationen sind idempotent (`create table if not exists`)
und daher auch auf dem bestehenden Dev-Projekt anwendbar, ohne etwas zu
verändern.

## Neues Projekt (Dev oder Prod) von Grund auf aufbauen

```bash
supabase link --project-ref <project-ref>
supabase db push
```

wendet alle Migrationen in `supabase/migrations/` der Reihe nach an. Für ein
**Dev**-Projekt: alle Dateien anwenden (inkl. `*_testdaten.sql`, damit
Mock-Daten aus #78 vorhanden sind). Für ein **Prod**-Projekt: alle Dateien
**außer** `*_testdaten.sql` anwenden (z. B. einzeln über das
`apply_migration`-MCP-Tool, da die Supabase-CLI keine eingebaute
Möglichkeit hat, einzelne Migrationsdateien beim `db push` auszuschließen).

## Dev-Projekt zurücksetzen / neu befüllen

Da Dev ein eigenständiges Projekt (kein Branch) ist, gibt es kein
`branches reset`. Um Testdaten "sauber" neu aufzusetzen:

1. Betroffene Tabellen leeren (z. B. `truncate kunde, brille, kontaktlinse,
   termin, glaskatalog cascade;` - vorsichtig, das löscht alle Zeilen dieser
   Tabellen im Dev-Projekt) oder das komplette Projekt im Dashboard löschen
   und neu anlegen.
2. Alle Migrationen erneut anwenden (siehe "Neues Projekt aufbauen" oben,
   inkl. `*_testdaten.sql`).

## Client-Konfiguration (Dev vs. Prod)

`my-admin` liest die Verbindungsdaten ausschließlich aus den Env-Variablen
`VITE_SUPABASE_URL` und `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` (siehe
`my-admin/.env.example` und `my-admin/README.md`).

**Lokale Entwicklung** (Standard, gegen Dev):

```
VITE_SUPABASE_URL=https://psxrxggwqlltfhfskeoa.supabase.co
```

Publishable Key: per Dashboard (Projekt "Optik-System Dev" → Project
Settings → API Keys) oder MCP-Tool `get_publishable_keys` mit
`project_id: psxrxggwqlltfhfskeoa` ermitteln.

**Live-Deployment** (Vercel, gegen Prod):

```
VITE_SUPABASE_URL=https://cktdtojgrxskihihmnjm.supabase.co
```

Publishable Key: Dashboard (Projekt "Optik-System Prod") oder
`get_publishable_keys` mit `project_id: cktdtojgrxskihihmnjm`. Diese Werte
müssen in den Vercel-Projekteinstellungen (Environment Variables der
Produktions-Umgebung) hinterlegt werden - das ist manuell nachzuziehen, da
diese Session keinen Vercel-Zugriff hat.

Der Supabase-MCP-Server (`.mcp.json`) ist auf das Dev-Projekt
(`psxrxggwqlltfhfskeoa`) konfiguriert, da dieses den lokalen
Entwicklungs-Workflow abdeckt. Alle MCP-Tools (`apply_migration`,
`execute_sql`, `list_tables`, ...) akzeptieren aber eine `project_id` als
Parameter und können damit ebenso gegen das Prod-Projekt
(`cktdtojgrxskihihmnjm`) genutzt werden, ohne `.mcp.json` anzupassen.

## CI / automatisierte Umgebungen

Umgesetzt in #100: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml)
führt Lint/Typecheck/Test/Build von `my-admin` auf jedem PR und Push nach
`dev`/`main` aus (keine Datenbankverbindung nötig, siehe Workflow). Das
automatische Anwenden der Migrationen auf Dev bzw. Prod ist oben unter
"Migrationen werden automatisch angewendet (CI/CD, #100)" beschrieben.

## Git-Branch-Strategie (Code-Ebene)

Die hier beschriebene Trennung der Supabase-Projekte hat ein Gegenstück auf
Git-Ebene (Branch `dev` als Standard-PR-Ziel, `main` geschützt als
Produktiv-Branch, Promotion-Workflow `dev` → `main`): siehe
[`CONTRIBUTING.md`](../CONTRIBUTING.md) im Repository-Root (#97).
