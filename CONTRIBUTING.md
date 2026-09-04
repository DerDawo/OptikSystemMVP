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
