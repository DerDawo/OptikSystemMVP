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

## Edge-Function-Secrets: getrennt für Dev und Prod

> Tracking-Issue: #104 (Dev/Prod-Trennung), dieser Abschnitt setzt #102 um.

Die drei Edge Functions unter `supabase/functions/` (`send-email` via
Resend, `send-sms` via Twilio, `send-whatsapp` via WhatsApp Cloud API)
lösen echte, teils kostenpflichtige Aktionen bei externen Anbietern aus.
Ihre Zugangsdaten werden als **Function-Secrets** hinterlegt
(`Deno.env.get(...)` im jeweiligen `index.ts`). Diese Secrets sind
**projektgebunden, nicht projektübergreifend geteilt**: Ein Secret, das auf
dem Dev-Projekt (`psxrxggwqlltfhfskeoa`) gesetzt ist, existiert nicht
automatisch auf dem Prod-Projekt (`cktdtojgrxskihihmnjm`) und umgekehrt.
Jedes Secret muss also **separat auf beiden Projekten** gesetzt werden -
und zwar mit unterschiedlichen Werten (Dev: Sandbox/Test, Prod: echt),
siehe unten.

### Benötigte Secrets je Function

| Function | Secret | Pflicht |
|---|---|---|
| `send-email` (Resend) | `RESEND_API_KEY` | ja |
| `send-email` (Resend) | `RESEND_FROM_ADDRESS` | ja |
| `send-sms` (Twilio) | `TWILIO_ACCOUNT_SID` | ja |
| `send-sms` (Twilio) | `TWILIO_AUTH_TOKEN` | ja |
| `send-sms` (Twilio) | `TWILIO_FROM_NUMBER` | ja |
| `send-whatsapp` (WhatsApp Cloud API) | `WHATSAPP_ACCESS_TOKEN` | ja |
| `send-whatsapp` (WhatsApp Cloud API) | `WHATSAPP_PHONE_NUMBER_ID` | ja |
| `send-whatsapp` (WhatsApp Cloud API) | `WHATSAPP_API_VERSION` | nein (Default `v21.0`) |
| alle drei, optional (siehe unten) | `DEV_ALLOWED_RECIPIENTS` | nein |

Namen und Pflicht-Status sind direkt aus den `Deno.env.get(...)`-Aufrufen
im jeweiligen `supabase/functions/*/index.ts` abgelesen - bei Änderungen an
einer Function diese Tabelle mitpflegen.

### Secrets setzen

Getrennt pro Projekt per Supabase-CLI:

```bash
supabase secrets set --project-ref psxrxggwqlltfhfskeoa \
  RESEND_API_KEY=... RESEND_FROM_ADDRESS=... \
  TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=... \
  WHATSAPP_ACCESS_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=...

supabase secrets set --project-ref cktdtojgrxskihihmnjm \
  RESEND_API_KEY=... RESEND_FROM_ADDRESS=... \
  TWILIO_ACCOUNT_SID=... TWILIO_AUTH_TOKEN=... TWILIO_FROM_NUMBER=... \
  WHATSAPP_ACCESS_TOKEN=... WHATSAPP_PHONE_NUMBER_ID=...
```

oder im Supabase-Dashboard je Projekt unter "Edge Functions" → "Secrets".
`supabase secrets list --project-ref <ref>` zeigt die gesetzten
Secret-**Namen** (nicht die Werte) zur Kontrolle. Diese Session hat keinen
authentifizierten Zugriff auf den Supabase-MCP-Server, um den aktuellen
Stand der Secrets auf beiden Projekten selbst zu prüfen - das muss der
Repo-Owner einmalig manuell verifizieren (z. B. mit obigem
`secrets list`-Befehl je Projekt).

### Dev nutzt ausschließlich Sandbox-/Test-Zugangsdaten

Ziel: Ein Testlauf auf Dev kann **niemals** eine echte Nachricht an einen
echten Kunden auslösen. Das Dev-Projekt (`psxrxggwqlltfhfskeoa`) erhält
daher bewusst andere Werte als Prod:

- **Twilio**: [Test-Credentials](https://www.twilio.com/docs/iam/test-credentials)
  verwenden (Twilio-Konsole → Account → API keys & tokens → "Test
  credentials" - sehen wie echte Live-Keys aus, sind aber nicht
  abrechenbar und lösen keine echten SMS aus) oder alternativ ein
  Twilio-Trial-Konto mit einer Testrufnummer, dessen Versand ohnehin auf
  vorher verifizierte Empfängernummern beschränkt ist. `TWILIO_FROM_NUMBER`
  des Dev-Secrets entsprechend auf die Test-/Trial-Nummer setzen, niemals
  auf die produktive Absendernummer.
- **Resend**: Für Dev einen eigenen Resend-API-Key mit eigener,
  klar erkennbarer Absenderadresse verwenden (z. B. eine eigene
  Test-Subdomain) oder einen Key, dessen Domain bewusst nicht verifiziert
  ist - Resend liefert dann ausschließlich an die im Resend-Konto
  hinterlegte Account-Owner-Adresse aus. Empfehlung: ein festes, nur
  intern gelesenes Test-Postfach als einzig erreichbares Ziel in Dev
  etablieren, unabhängig von der Empfängeradresse im Request.
- **WhatsApp Cloud API**: Im Meta-App-Dashboard steht pro App eine
  kostenlose [Test-Rufnummer](https://developers.facebook.com/docs/whatsapp/cloud-api/get-started)
  bereit, die nur an vorher im Dashboard hinterlegte Test-Empfänger senden
  kann (max. 5, müssen einzeln per Code verifiziert werden).
  `WHATSAPP_PHONE_NUMBER_ID` des Dev-Secrets auf diese Test-Nummer setzen,
  nicht auf die produktive Nummer.

**Die eigentlichen Sandbox-/Test-Zugangsdaten müssen manuell in den
jeweiligen Anbieter-Dashboards (Twilio, Resend, Meta) erzeugt und
anschließend wie oben beschrieben als Dev-Secrets gesetzt werden.** Das ist
reine Konto-Konfiguration bei Drittanbietern, für die diese Session keinen
Zugriff hat - technisch ist mit dieser Dokumentation und dem Allowlist-Guard
unten alles vorbereitet, um sie direkt einzutragen.

### Zusätzliche Absicherung: Empfänger-Allowlist für Dev (optional)

Als zusätzliches technisches Sicherheitsnetz - unabhängig davon, ob die
Sandbox-Zugangsdaten oben schon eingerichtet sind - unterstützen alle drei
Functions ein optionales Secret `DEV_ALLOWED_RECIPIENTS`: eine
kommagetrennte Liste erlaubter Empfänger (exakte E-Mail-Adressen bzw.
Telefonnummern im E.164-Format, z. B. `+491701234567`). Ist dieses Secret
gesetzt, wird jeder Versand an einen nicht gelisteten Empfänger mit `403`
abgelehnt, **bevor** der jeweilige Anbieter (Resend/Twilio/Meta) überhaupt
kontaktiert wird. Ist das Secret **nicht** gesetzt (Standard, auch auf
Prod), ändert sich am bisherigen Verhalten nichts.

Empfehlung: auf dem Dev-Projekt setzen, z. B.

```bash
supabase secrets set --project-ref psxrxggwqlltfhfskeoa \
  DEV_ALLOWED_RECIPIENTS="test@example.com,+15005550006"
```

Auf dem Prod-Projekt (`cktdtojgrxskihihmnjm`) **nicht setzen**.

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
