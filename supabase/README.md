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

## Wichtig: Migrationen müssen nach dem Merge auf BEIDEN Projekten angewendet werden

Eine neue Datei unter `supabase/migrations/` ändert für sich genommen
**nichts** an der laufenden Datenbank. Eine Migration muss nach dem Merge
zusätzlich gegen das jeweilige Projekt angewendet werden, z. B. mit

```bash
supabase link --project-ref psxrxggwqlltfhfskeoa   # oder cktdtojgrxskihihmnjm für Prod
supabase db push
```

oder über das Supabase-MCP-Tool (`apply_migration`), falls kein lokaler
CLI-Zugriff verfügbar ist.

**Migrationen, deren Dateiname `_testdaten.sql` enthält (Mock-/Testdaten,
siehe #78), werden ausschließlich auf dem Dev-Projekt angewendet, niemals
auf Prod.** Alle anderen Migrationen (Schema-Änderungen und "echte" Seeds
wie Standard-Dokumentvorlagen oder der Leistungskatalog) gehören auf beide
Projekte.

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
hinzufügt, immer prüfen, dass diese auch tatsächlich auf Dev (und ggf. Prod)
angewendet wurden** (z. B. mit `supabase migration list` oder dem
`list_migrations`-MCP-Tool), nicht nur dass die SQL-Datei im Repo liegt.

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

Sobald eine CI-Pipeline existiert (#100), sollte diese standardmäßig gegen
das Dev-Projekt laufen (Migrationen anwenden, Tests ausführen), niemals
gegen Prod. Die konkrete Umsetzung ist Teil von #100 und #97
(Branch-/Umgebungsstrategie).

## Git-Branch-Strategie (Code-Ebene)

Die hier beschriebene Trennung der Supabase-Projekte hat ein Gegenstück auf
Git-Ebene (Branch `dev` als Standard-PR-Ziel, `main` geschützt als
Produktiv-Branch, Promotion-Workflow `dev` → `main`): siehe
[`CONTRIBUTING.md`](../CONTRIBUTING.md) im Repository-Root (#97).
