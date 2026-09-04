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
| `main` | Produktiv-Branch, geschützt, enthält ausschließlich getesteten, freigegebenen Code | Supabase-Prod-Projekt (`cktdtojgrxskihihmnjm`), Vercel-Produktions-Deployment |
| `dev`  | Entwicklungs-Branch, **Standardziel für neue Feature-/Bugfix-PRs** | Supabase-Dev-Projekt (`psxrxggwqlltfhfskeoa`) mit Testdaten aus #78 |

`dev` ist als Standard-Branch des Repositories eingerichtet, d. h. neue PRs
zielen ohne weiteres Zutun auf `dev`.

**Für `main` muss der Repo-Owner in den GitHub-Repository-Einstellungen
(Settings → Branches → Branch protection rules) eine Regel anlegen, die
diese Session nicht automatisiert setzen kann (kein API-Zugriff auf
Repository-Admin-Einstellungen über die verfügbaren Werkzeuge):**

- "Require a pull request before merging" (keine direkten Pushes nach `main`)
- "Require approvals" (mind. 1 Review-Pflicht)
- "Require status checks to pass before merging" - vorbereitet, aber noch
  ohne konkrete Checks, solange #100 (CI/CD-Pipeline) nicht existiert. Sobald
  #100 umgesetzt ist, die dort neu entstehenden Checks (Lint/Typecheck/Test/
  Build) hier als required Status Checks eintragen, damit die Regel greift,
  ohne dass vorher alles blockiert war.
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
       main ──── Deployment nach Prod ◄──────────────────────────┘
```

1. **Feature-/Bugfix-Branch** von `dev` abzweigen, z. B. `feature/<kurzbeschreibung>`
   oder `<issue-nr>-<kurzbeschreibung>`.
2. **PR gegen `dev`** öffnen. Review + die in den Abnahmekriterien genannten
   Checks (siehe unten) müssen erfüllt sein.
3. Nach dem Merge nach `dev`: **auf der Dev-Umgebung testen** (`my-admin`
   lokal oder als Dev-Deployment gegen das Supabase-Dev-Projekt mit den
   Testdaten aus #78). Enthält der PR neue Dateien unter
   `supabase/migrations/`, müssen diese zusätzlich auf dem Dev-Projekt
   angewendet werden (siehe [`supabase/README.md`](supabase/README.md#wichtig-migrationen-müssen-nach-dem-merge-auf-beiden-projekten-angewendet-werden) -
   das Vergessen dieses Schritts hat bereits zweimal zu Bugs geführt, #81/#95).
4. Ist eine Änderung auf Dev bestätigt getestet, **PR von `dev` nach `main`**
   öffnen (i. d. R. gebündelt für mehrere fertige Änderungen, nicht
   zwingend 1:1 pro Feature-PR).
5. Nach dem Merge nach `main`: **Deployment nach Prod.** Bis #99/#100
   umgesetzt sind, ist das ein manueller Schritt; danach automatisiert.
   Enthält der PR Migrationsdateien, müssen diese zusätzlich auf dem
   Prod-Projekt angewendet werden - **ohne** die `*_testdaten.sql`-Seeds.

## Hotfixes

Für Fehler, die dringend in Prod behoben werden müssen und nicht auf den
regulären `dev` → `main`-Weg warten können:

1. Hotfix-Branch von `main` (nicht von `dev`) abzweigen, z. B. `hotfix/<kurzbeschreibung>`.
2. PR gegen `main` öffnen. Die Abnahmekriterien gelten unverändert (Review,
   grüne Checks) - ein Hotfix überspringt die Review-Pflicht nicht, nur den
   Umweg über eine separate Testphase auf Dev.
3. Vor dem Merge nach `main`: den Fix lokal bzw. gegen das Dev-Supabase-Projekt
   verifizieren, auch ohne vollen Dev-Deployment-Zyklus.
4. Nach dem Merge nach `main`: **`main` zeitnah zurück in `dev` mergen**
   (PR `main` → `dev` oder direkter Merge), damit `dev` nicht hinter `main`
   zurückfällt und derselbe Fehler nicht versehentlich erneut auftritt, wenn
   als nächstes wieder reguläres `dev` → `main` gemerged wird.

## Hosting (Vercel)

> Tracking-Issue: #104 (Dev/Prod-Trennung). Dieser Abschnitt setzt #99 um
> (Schritt 4 von 8) und baut auf #97/#98 auf.

`my-admin` wird über [Vercel](https://vercel.com) gehostet, per
GitHub-Integration an dieses Repository angebunden (kein separates
Deploy-Tooling nötig; sichtbar am automatischen "Vercel Preview
Comments"-Check auf PRs). Zusätzliche Konfiguration für sauberes
Build/Routing liegt in [`my-admin/vercel.json`](my-admin/vercel.json)
(SPA-Rewrite, damit tiefe Links wie `/kunden/1/show` nicht mit 404
fehlschlagen, da `my-admin` clientseitiges Routing via `react-router`
verwendet).

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
  | Production | `main` | Prod (`cktdtojgrxskihihmnjm`) |
  | Preview (Standard) bzw. ein dediziertes Custom Environment "Development" | `dev` sowie alle PR-Preview-Deployments | Dev (`psxrxggwqlltfhfskeoa`) |

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

- Push/Merge nach `dev` → Deployment mit den Dev-Supabase-Werten.
- Push/Merge nach `main` → Deployment mit den Prod-Supabase-Werten
  (Production-Environment).
- Jeder offene PR erhält zusätzlich automatisch ein eigenes
  Preview-Deployment (Standard-Vercel-Verhalten, sichtbar als Check/
  Kommentar im PR) - keine Extra-Konfiguration nötig.

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
- [ ] Sobald Production/Preview mit den korrekten Env-Variablen laufen,
      die finalen URLs hier bzw. in der Repo-Beschreibung ergänzen.

## Abnahmekriterien

Ein PR gilt als bereit zum Mergen, wenn:

- [ ] Mindestens ein Review erfolgt ist (Pflicht durch Branch-Protection auf `main`; für `dev` empfohlen).
- [ ] `npm run lint`, `npm run type-check`, `npm run test` und `npm run build`
      (jeweils in `my-admin/`) fehlerfrei durchlaufen. Sobald #100 (CI/CD)
      existiert, laufen diese automatisiert als Required Status Checks;
      bis dahin manuell vor dem Merge ausführen.
- [ ] Neue/geänderte Dateien unter `supabase/migrations/` wurden tatsächlich
      auf dem betroffenen Supabase-Projekt angewendet (Dev vor dem
      `dev`-Merge, zusätzlich Prod vor bzw. unmittelbar nach dem
      `main`-Merge) - nicht nur im Repo committet.
- [ ] Für PRs nach `main`: Die Änderung wurde zuvor auf `dev` mit den
      Testdaten aus #78 manuell getestet (Ausnahme: Hotfixes, siehe oben,
      dort genügt eine gezielte Verifikation des Fixes).
- [ ] Der PR beschreibt, ob und welche manuellen Nacharbeiten nötig sind
      (z. B. Migrationen anwenden, Env-Variablen setzen), falls diese nicht
      Teil der CI werden können.
