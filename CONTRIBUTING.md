# Branch- und Umgebungsstrategie

> Tracking-Issue: #104 (Dev/Prod-Trennung). Dieses Dokument setzt #97 um
> (Schritt 2 von 8) und baut auf #79 auf (Schritt 1, siehe PR #105/#106).

## Ausgangslage

Auf Datenebene ist die Trennung bereits umgesetzt (#79): Es gibt zwei
eigenständige Supabase-Projekte statt eines einzelnen Branches (Details siehe
[`supabase/README.md`](supabase/README.md#zwei-getrennte-supabase-projekte-dev-und-prod)):

- **Dev** ("Optik-System Dev", `psxrxggwqlltfhfskeoa`) - Mock-/Testdaten aus #78
- **Prod** ("Optik-System Prod", `cktdtojgrxskihihmnjm`) - ausschließlich echte Daten

Dieses Dokument beschreibt das **Gegenstück auf Code-/Git-Ebene**: Wie Code
zwischen einer Entwicklungs- und einer Produktivumgebung fließt.

## Branches

| Branch | Zweck | Verbunden mit |
|---|---|---|
| `main` | Produktiv-Branch, geschützt, enthält ausschließlich getesteten, freigegebenen Code | Supabase-Prod-Projekt (`cktdtojgrxskihihmnjm`); Vercel-Produktions-Deployment **nur indirekt** über `main` des Forks `ulmrobert/OptikSystemMVP` (siehe [Hosting (Vercel)](#hosting-vercel)) |
| `dev`  | Entwicklungs-Branch, **Standardziel für neue Feature-/Bugfix-PRs** | Supabase-Dev-Projekt (`psxrxggwqlltfhfskeoa`) mit Testdaten aus #78; ein Vercel-Deployment für `dev` ist derzeit ungeklärt (siehe [Offene Punkte](#offene-punkte--manuelle-nacharbeit-repo-owner)) |

`dev` ist als Standard-Branch des Repositories eingerichtet, d. h. neue PRs
zielen ohne weiteres Zutun auf `dev`.

**Achtung:** Ein Merge nach `main` in diesem Repository
(`DerDawo/OptikSystemMVP`) deployt **nicht sofort**. Vercel deployt seit
ca. 2026-10-12 aus dem Fork `ulmrobert/OptikSystemMVP` - erst wenn der
Fork synchronisiert ist, geht ein Release live. Der Fork synchronisiert
sich zwar automatisch, in der Praxis aber oft erst nach Stunden; deshalb
nach jedem Release den Fork direkt von Hand synchronisieren (Ablauf siehe
[Deployment-Ablauf](#deployment-ablauf)).

**Für `main` muss der Repo-Owner in den GitHub-Repository-Einstellungen
(Settings → Branches → Branch protection rules) eine Regel anlegen, die
diese Session nicht automatisiert setzen kann (kein API-Zugriff auf
Repository-Admin-Einstellungen über die verfügbaren Werkzeuge):**

- "Require a pull request before merging" (keine direkten Pushes nach `main`)
- "Require approvals" (mind. 1 Review-Pflicht)
- "Require status checks to pass before merging" - seit #100 existiert der
  Check `Lint, Typecheck, Test, Build (my-admin)` aus
  [`.github/workflows/ci.yml`](.github/workflows/ci.yml); diesen hier als
  required Status Check eintragen, damit die Regel greift.
- "Do not allow bypassing the above settings" (auch für Admins), damit die
  Regel wirksam bleibt.

## Workflow

```
Feature-/Bugfix-Branch
        │  PR
        ▼
       dev  ──── Testen auf Dev-Umgebung (Testdaten aus #78) ────┐
        │                                                        │
        │  PR (nach erfolgreichem Test auf Dev)                  │
        ▼                                                        │
       main  (Merge deployt nicht sofort)                        │
        │                                                        │
        │  Fork-Sync (von Hand oder automatisch)                 │
        ▼                                                        │
  Fork-main ──── Vercel-Deployment nach Prod ◄───────────────────┘
```

1. **Feature-/Bugfix-Branch** von `dev` abzweigen, z. B. `feature/<kurzbeschreibung>`
   oder `<issue-nr>-<kurzbeschreibung>`.
2. **PR gegen `dev`** öffnen. Review + die in den Abnahmekriterien genannten
   Checks (siehe unten) müssen erfüllt sein.
3. Nach dem Merge nach `dev`: **auf der Dev-Umgebung testen** (`my-admin`
   lokal gegen das Supabase-Dev-Projekt mit den Testdaten aus #78; ob es
   derzeit ein Vercel-Deployment für `dev` gibt, ist ungeklärt, siehe
   [Offene Punkte](#offene-punkte--manuelle-nacharbeit-repo-owner)).
   Enthält der PR neue Dateien unter
   `supabase/migrations/`, wendet der Workflow
   [`supabase-migrate-dev.yml`](.github/workflows/supabase-migrate-dev.yml)
   diese seit #100 automatisch auf das Dev-Projekt an (siehe
   [`supabase/README.md`](supabase/README.md#migrationen-werden-automatisch-angewendet-cicd-100)) -
   vor dem Testen kurz den zugehörigen Actions-Lauf prüfen.
4. Ist eine Änderung auf Dev bestätigt getestet, **PR von `dev` nach `main`**
   öffnen (i. d. R. gebündelt für mehrere fertige Änderungen, nicht
   zwingend 1:1 pro Feature-PR).
5. Nach dem Merge nach `main`: **Fork synchronisieren**, erst dann läuft
   das **Deployment nach Prod** (Befehl und Details siehe
   [Deployment-Ablauf](#deployment-ablauf)). Der Merge nach `main` in
   diesem Repository deployt nicht sofort - der automatische Sync im Fork
   kann Stunden dauern. Enthält der PR
   Migrationsdateien, wendet der Workflow
   [`supabase-migrate-prod.yml`](.github/workflows/supabase-migrate-prod.yml)
   diese seit #100 automatisch auf das Prod-Projekt an - **ohne** die
   `*_testdaten.sql`-Seeds, die der Workflow gezielt ausschließt. Dieser
   Workflow läuft bereits beim Merge nach `main` in diesem Repository,
   also unabhängig vom Fork-Sync - den Fork deshalb direkt im Anschluss
   synchronisieren, damit Datenbank und App nicht lange auseinanderlaufen.

## Hotfixes

Für Fehler, die dringend in Prod behoben werden müssen und nicht auf den
regulären `dev` → `main`-Weg warten können:

1. Hotfix-Branch von `main` (nicht von `dev`) abzweigen, z. B. `hotfix/<kurzbeschreibung>`.
2. PR gegen `main` öffnen. Die Abnahmekriterien gelten unverändert (Review,
   grüne Checks) - ein Hotfix überspringt die Review-Pflicht nicht, nur den
   Umweg über eine separate Testphase auf Dev.
3. Vor dem Merge nach `main`: den Fix lokal bzw. gegen das Dev-Supabase-Projekt
   verifizieren, auch ohne vollen Dev-Deployment-Zyklus.
4. Nach dem Merge nach `main`: **Fork synchronisieren** (siehe
   [Deployment-Ablauf](#deployment-ablauf)) - sonst geht der Hotfix erst
   mit dem nächsten automatischen Sync live, was Stunden dauern kann.
5. Danach: **`main` zeitnah zurück in `dev` mergen**
   (PR `main` → `dev` oder direkter Merge), damit `dev` nicht hinter `main`
   zurückfällt und derselbe Fehler nicht versehentlich erneut auftritt, wenn
   als nächstes wieder reguläres `dev` → `main` gemerged wird.

## Hosting (Vercel)

> Tracking-Issue: #104 (Dev/Prod-Trennung). Dieser Abschnitt setzt #99 um
> (Schritt 4 von 8) und baut auf #97/#98 auf.

`my-admin` wird über [Vercel](https://vercel.com) gehostet.

- **Produktiv-URL:** https://optik-system-mvp.vercel.app
- Die frühere URL `optik-system-mvp-demo2.vercel.app` existiert nicht
  mehr (liefert `DEPLOYMENT_NOT_FOUND`).

**Stand 2026-10-16:** Vercel deployt seit ca. 2026-10-12 **nicht mehr aus
diesem Repository** (`DerDawo/OptikSystemMVP`), sondern aus dem Fork
[`ulmrobert/OptikSystemMVP`](https://github.com/ulmrobert/OptikSystemMVP):
Production wird aus dem Branch `main` des Forks gebaut. Die
GitHub-Deployments von `vercel[bot]` erscheinen entsprechend im Fork, nicht
hier; auch der frühere "Vercel Preview Comments"-Check taucht auf PRs in
diesem Repository nicht mehr auf. Ein Merge nach `main` hier löst also
**kein direktes** Deployment aus - erst der Sync des Forks (von Hand oder
automatisch) bringt die Änderung live (siehe
[Deployment-Ablauf](#deployment-ablauf)).

Zusätzliche Konfiguration für sauberes Build/Routing liegt in
[`my-admin/vercel.json`](my-admin/vercel.json) (SPA-Rewrite, damit tiefe
Links wie `/kunden/1/show` nicht mit 404 fehlschlagen, da `my-admin`
clientseitiges Routing via `react-router` verwendet).

### Einmalige Projekt-Konfiguration (Vercel-Dashboard, manueller Schritt)

Diese Einstellungen lassen sich nicht über Repo-Dateien setzen und
müssen vom Repo-Owner einmalig im Vercel-Dashboard (Project Settings)
vorgenommen werden:

- **Root Directory**: `my-admin`. Die Vercel-App liegt nicht im
  Repo-Root, sondern in diesem Unterverzeichnis - ohne dieses Setting
  versucht Vercel, das gesamte Repository zu bauen. `vercel.json` wird
  relativ zum Root Directory gelesen, muss also in `my-admin/` liegen
  (nicht im Repo-Root). Framework Preset wird danach automatisch als
  "Vite" erkannt (Build Command `vite build` / `npm run build`, Output
  Directory `dist`) - Standardwerte übernehmen.
- **Environment Variables** (Project Settings → Environment Variables),
  je Vercel-Environment mit den Werten des zugehörigen Supabase-Projekts
  (siehe [`supabase/README.md`](supabase/README.md#zwei-getrennte-supabase-projekte-dev-und-prod)
  für die Projekt-Refs; URL und Publishable/Anon-Key stehen im
  jeweiligen Supabase-Projekt unter Project Settings → API - beide Werte
  sind bewusst nicht in diesem Repo hinterlegt, siehe
  `my-admin/.env.example`):

  | Vercel-Environment | Git-Branch | Supabase-Projekt für `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY` |
  |---|---|---|
  | Production | `main` des Forks `ulmrobert/OptikSystemMVP` | Prod (`cktdtojgrxskihihmnjm`) |
  | Preview (Standard) bzw. ein dediziertes Custom Environment "Development" | `dev` sowie alle PR-Preview-Deployments - **derzeit ungeklärt**, ob und aus welchem Repository diese noch gebaut werden (siehe Offene Punkte) | Dev (`psxrxggwqlltfhfskeoa`) |

  Ohne gesetzte Variablen bricht der Build zur Laufzeit ab (siehe
  `my-admin/src/utils.ts`, #98) - das ist beabsichtigt (Fail-Fast-Guard
  gegen versehentliches Deployment ohne Konfiguration).

  Vercel stellt standardmäßig die Environments "Production" und
  "Preview" bereit; zusätzlich lässt sich ein benanntes Custom
  Environment anlegen, das fest an einen Branch gebunden werden kann.
  Empfehlung: ein Custom Environment "Development" anlegen, gebunden an
  `dev`, mit den Dev-Werten - damit läuft `dev` dauerhaft unter einer
  festen URL statt unter einem sich pro Commit ändernden Preview-Link.
  Alternativ genügt es, die Dev-Werte im "Preview"-Environment zu
  hinterlegen; das wirkt dann für alle PR-Previews (unschädlich, da
  Feature-PRs ohnehin gegen `dev` mit Testdaten laufen, siehe
  Branch-Strategie oben) und für `dev` selbst.

### Deployment-Ablauf

Ein Release geht so live (Stand 2026-10-16):

1. Release-PR `dev` → `main` in `DerDawo/OptikSystemMVP` mergen.
   **Dieser Merge deployt nicht sofort.**
2. `main` des Forks `ulmrobert/OptikSystemMVP` direkt danach von Hand
   mit diesem Repository synchronisieren - entweder per GitHub CLI:

   ```sh
   gh api -X POST repos/ulmrobert/OptikSystemMVP/merge-upstream -f branch=main
   ```

   oder auf GitHub im Fork über den Button "Sync fork".
3. Vercel erkennt den neuen Stand auf `main` des Forks und deployt
   Production nach ca. 20-60 s automatisch auf
   https://optik-system-mvp.vercel.app. Das Deployment ist im Fork unter
   den GitHub-Deployments (`vercel[bot]`, Environment "Production") zu
   sehen.

**Automatischer Sync im Fork:** Im Fork (nicht in diesem Repository) liegt
der Workflow `.github/workflows/upstream-sync.yml` ("Upstream-Sync
(main)"). Er ruft dasselbe `merge-upstream` für `main` auf und ist so
eingestellt, dass er alle 15 Minuten läuft. GitHub startet solche geplanten
Läufe aber oft deutlich verspätet: Am 2026-10-15/16 lagen zwischen zwei
Läufen 2-5 Stunden. Ohne Schritt 2 geht ein Release deshalb zwar
irgendwann live, aber unter Umständen erst Stunden später. Ändert ein
Release Dateien unter `.github/workflows/`, schlägt der automatische Sync
fehl (das automatische Token darf Workflow-Dateien nicht übernehmen) -
dann im Fork auf GitHub "Sync fork" → "Update branch" klicken. Alle
übrigen Workflows (CI, Supabase-Migrationen) sind im Fork deaktiviert.

Migrationen unter `supabase/migrations/` wendet weiterhin der Workflow
[`supabase-migrate-prod.yml`](.github/workflows/supabase-migrate-prod.yml)
in diesem Repository an, und zwar schon beim Merge nach `main` (Schritt 1),
nicht erst beim Fork-Sync (siehe [Workflow](#workflow), Schritt 5).

**Ungeklärt:** Ob Pushes/Merges nach `dev` und offene PRs derzeit noch
Vercel-Preview-Deployments erhalten, ist offen. In diesem Repository gibt
es seit 2026-10-12 keine Vercel-Deployments mehr, im Fork sind bislang
nur Production-Deployments zu sehen, und der automatische Sync im Fork
gleicht nur `main` ab, nicht `dev` (siehe Offene Punkte).

### Offene Punkte / manuelle Nacharbeit (Repo-Owner)

- [ ] Root Directory auf `my-admin` setzen.
- [ ] Environment Variables für Production sowie Preview/Development
      gemäß obiger Tabelle setzen.
- [ ] Zugriffsbeschränkung auf das Prod-Deployment (Basic-Auth/
      IP-Whitelist) ist nicht Teil dieses Schritts, da noch keine
      vollständige Auth-Absicherung vorausgesetzt wird und die
      naheliegenden Vercel-Optionen (Password Protection) einen
      kostenpflichtigen Plan erfordern - als eigenes Follow-up zu
      bewerten, falls benötigt.
- [x] Production-URL hier ergänzt: https://optik-system-mvp.vercel.app
      (Stand 2026-10-16, siehe oben).
- [ ] Klären, ob und wo `dev` bzw. PRs noch Preview-Deployments
      erhalten (Vercel-Projekt hängt seit ca. 2026-10-12 am Fork
      `ulmrobert/OptikSystemMVP`, dort bislang nur Production-Deployments
      sichtbar). Danach die Tabelle oben, den Deployment-Ablauf und ggf.
      die Dev-/Preview-URL hier bzw. in der Repo-Beschreibung ergänzen.

## Edge-Function-Secrets (Twilio/Resend/WhatsApp)

> Tracking-Issue: #104 (Dev/Prod-Trennung), dieser Abschnitt setzt #102 um.

Wie die Vercel-Environment-Variablen oben sind auch die Secrets der drei
Edge Functions (`send-email`, `send-sms`, `send-whatsapp` unter
`supabase/functions/`) **pro Supabase-Projekt getrennt** zu setzen: Dev
(`psxrxggwqlltfhfskeoa`) erhält Sandbox-/Test-Zugangsdaten der jeweiligen
Anbieter, Prod (`cktdtojgrxskihihmnjm`) die echten - ein Testlauf auf Dev
darf nie eine echte Nachricht an einen echten Kunden auslösen. Benötigte
Secret-Namen je Function, Setup-Befehle sowie eine optionale
Empfänger-Allowlist für Dev: siehe
[`supabase/README.md`](supabase/README.md#edge-function-secrets-getrennt-für-dev-und-prod).

## Abnahmekriterien

Ein PR gilt als bereit zum Mergen, wenn:

- [ ] Mindestens ein Review erfolgt ist (Pflicht durch Branch-Protection auf `main`; für `dev` empfohlen).
- [ ] `npm run lint`, `npm run type-check`, `npm run test` und `npm run build`
      (jeweils in `my-admin/`) fehlerfrei durchlaufen. Seit #100 laufen diese
      automatisiert als Status Check `Lint, Typecheck, Test, Build (my-admin)`
      (siehe [`ci.yml`](.github/workflows/ci.yml)).
- [ ] Neue/geänderte Dateien unter `supabase/migrations/` wurden tatsächlich
      auf dem betroffenen Supabase-Projekt angewendet (Dev nach dem
      `dev`-Merge, Prod nach dem `main`-Merge) - seit #100 automatisch über
      die `Supabase Migrate`-Workflows, siehe
      [`supabase/README.md`](supabase/README.md#migrationen-werden-automatisch-angewendet-cicd-100);
      trotzdem den zugehörigen Actions-Lauf auf Erfolg prüfen, nicht nur dass
      die SQL-Datei im Repo liegt.
- [ ] Für PRs nach `main`: Die Änderung wurde zuvor auf `dev` mit den
      Testdaten aus #78 manuell getestet (Ausnahme: Hotfixes, siehe oben,
      dort genügt eine gezielte Verifikation des Fixes).
- [ ] Der PR beschreibt, ob und welche manuellen Nacharbeiten nötig sind
      (z. B. Migrationen anwenden, Env-Variablen setzen), falls diese nicht
      Teil der CI werden können.
