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
Projekte. Details und wie neue Testdaten anzulegen sind: siehe nächster
Abschnitt.

Trotz Automatisierung gilt weiterhin: **vor dem Schließen eines PRs, der
Dateien unter `supabase/migrations/` hinzufügt, prüfen, dass der
zugehörige `Supabase Migrate`-Workflow-Lauf erfolgreich war** (Tab
"Actions" im Repository, bzw. `list_migrations`-MCP-Tool zur Kontrolle auf
der Datenbank selbst), nicht nur dass die SQL-Datei im Repo liegt.

## Konvention: Schema-/Seed- vs. Testdaten-Migrationen (#101)

> Tracking-Issue: #104 (Dev/Prod-Trennung), Schritt 6 von 8. Baut auf #100
> (`supabase-migrate-prod.yml` schließt `*_testdaten.sql` bereits zur
> Laufzeit vom Prod-Deploy aus) auf und macht daraus eine dauerhafte,
> technisch durchgesetzte Regel für alle künftigen PRs.

Alle Migrationen liegen weiterhin flach unter `supabase/migrations/*.sql`
(**keine** Unterverzeichnisse wie `supabase/migrations/seed/`). Grund: Die
Supabase-CLI wendet ausschließlich `supabase/migrations/*.sql` in
chronologischer Reihenfolge an; eine Datei in einem Unterverzeichnis würde
von `supabase db push`/`migration list` schlicht ignoriert und stünde damit
in keinem der beiden Projekte zur Verfügung, ohne dass das auffällt - das
Risiko einer Verzeichnisumstrukturierung wiegt schwerer als der Nutzen. Die
Trennung erfolgt stattdessen ausschließlich über den **Dateinamen**:

| Art | Namenskonvention | Beispiel | Ziel |
|---|---|---|---|
| Schema-Migration | `<Timestamp>_<beschreibung>.sql` | `20260830150000_add_kontaktlinse.sql` | Dev **und** Prod |
| "Echter" Seed (Stammdaten, in beiden Umgebungen benötigt, z. B. Dokumentvorlagen, Leistungskatalog) | `<Timestamp>_seed_<beschreibung>.sql` | `20260830120100_seed_zusatzleistung_katalog.sql` | Dev **und** Prod |
| Mock-/Testdaten (fiktive Kunden, Aufträge, Termine o. Ä. nur zum Entwickeln/Testen, siehe #78) | `<Timestamp>_..._testdaten.sql` (**muss** auf `_testdaten.sql` enden) | `20260831130000_seed_kunde_testdaten.sql` | **nur** Dev |

Die Endung `_testdaten.sql` ist die einzige Kennzeichnung, die
`supabase-migrate-prod.yml` auswertet, um eine Datei vor `supabase db push`
vom Prod-Deploy auszuschließen (siehe Kommentar im Workflow). Eine
Testdaten-Migration, die nicht exakt auf `_testdaten.sql` endet, landet
ungewollt auf Prod.

**Technisch durchgesetzt seit #101** über
[`.github/workflows/supabase-migrations-lint.yml`](../.github/workflows/supabase-migrations-lint.yml):
Der Workflow läuft auf jedem PR, der Dateien unter `supabase/migrations/`
hinzufügt, und schlägt fehl, wenn eine neue Datei

- nicht dem Format `<14-stelliger Timestamp>_<beschreibung>.sql` entspricht, oder
- ein Test-/Mock-Datenkennwort (`test`, `mock`, `dummy`, `demo`, `beispiel`,
  `sample`) im Namen enthält, aber nicht auf `_testdaten.sql` endet.

Das fängt den häufigsten Fehler (Suffix vergessen oder falsch geschrieben,
z. B. `..._testdata.sql` oder `..._test_kunde.sql`) bereits im PR ab, bevor
gemerged wird - nicht erst beim Prod-Deploy.

### Neue Testdaten für Dev anlegen

1. Migration wie gewohnt unter `supabase/migrations/` anlegen, Dateiname mit
   aktuellem Timestamp (`YYYYMMDDHHMMSS`) beginnen.
2. Beschreibenden Teil des Dateinamens mit `_testdaten` **beenden**, z. B.
   `20260901120000_seed_termin_testdaten.sql`. Enthält die Migration sowohl
   Schema-Änderungen als auch Testdaten, in zwei Dateien aufteilen (Schema
   ohne, Testdaten mit `_testdaten`-Suffix) - vermeidet, dass eine
   Schema-Änderung versehentlich mitsamt Testdaten von Prod ausgeschlossen
   wird.
3. In der Datei nur Mock-/Testdaten einfügen (z. B. `@example.com`-Adressen
   wie bei den bestehenden Testdaten aus #78), keine echten Kundendaten.
   `insert`-Statements idempotent halten (z. B. `on conflict do nothing` oder
   ein `where not exists (...)`-Guard), damit ein erneutes Anwenden auf Dev
   (z. B. nach einem Reset, siehe unten) nicht fehlschlägt.
4. PR gegen `dev` öffnen - `supabase-migrations-lint.yml` prüft automatisch
   den Dateinamen, `supabase-migrate-dev.yml` wendet die Migration nach dem
   Merge automatisch auf das Dev-Projekt an.

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
