# my-admin

## Installation

Install the application dependencies by running:

```sh
npm install
```

## Development

Start the application in development mode by running:

```sh
npm run dev
```

## Production

Build the application in production mode by running:

```sh
npm run build
```

## Development Setup

Copy `.env.example` to `.env` and populate the environment variables with the
values found on your Supabase project's API settings:

```sh
cp .env.example .env
```

```sh
# Your supabase instance URL
VITE_SUPABASE_URL=
# Your supabase publishable/anonymous key
VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=
```

**Wichtig:** Für lokale Entwicklung sollten dies die Zugangsdaten des
Supabase **Dev-Projekts** (`psxrxggwqlltfhfskeoa`, "Optik-System Dev") sein,
nicht die des Prod-Projekts. Details zu beiden Projekten (URLs, Keys
ermitteln, Zurücksetzen/Neubefüllen von Dev): siehe
[`supabase/README.md`](../supabase/README.md#zwei-getrennte-supabase-projekte-dev-und-prod).
Zeigt `VITE_SUPABASE_URL` beim lokalen `npm run dev` versehentlich auf das
Prod-Projekt, bricht der Start mit einem Fehler ab (siehe `src/utils.ts`,
#98) - Prod-Werte gehören ausschließlich in die Vercel-Environment-Variablen
der Produktions-Umgebung (#99).

## Customize The Application

Follow the instructions in your browser console once you start the application.

## Branch- und Umgebungsstrategie

Wie Änderungen von einem Feature-Branch über `dev` (Testdaten) nach `main`
(Prod) gelangen, welche Regeln für Hotfixes gelten und welche
Abnahmekriterien ein PR erfüllen muss, ist in
[`CONTRIBUTING.md`](../CONTRIBUTING.md) im Repository-Root beschrieben (#97).

## Deployment (Vercel)

Diese App wird über Vercel gehostet. Produktiv-URL:
https://optik-system-mvp.vercel.app (die frühere URL
`optik-system-mvp-demo2.vercel.app` existiert nicht mehr).

**Stand 2026-10-16:** Vercel deployt Production seit ca. 2026-10-12 aus
dem Fork `ulmrobert/OptikSystemMVP` (Branch `main`), nicht aus
`DerDawo/OptikSystemMVP`. Ein Merge nach `main` in `DerDawo/OptikSystemMVP`
deployt deshalb **nicht sofort**. Ein Release geht so live:

1. Release-PR `dev` → `main` in `DerDawo/OptikSystemMVP` mergen.
2. `main` des Forks direkt danach von Hand synchronisieren:

   ```sh
   gh api -X POST repos/ulmrobert/OptikSystemMVP/merge-upstream -f branch=main
   ```

   (alternativ im Fork auf GitHub der Button "Sync fork").
3. Vercel deployt nach ca. 20-60 s automatisch.

Im Fork gibt es zusätzlich einen automatischen Sync (Workflow
"Upstream-Sync (main)", alle 15 Minuten eingeplant). GitHub startet ihn
aber oft erst Stunden später, und bei Änderungen unter
`.github/workflows/` schlägt er fehl. Deshalb Schritt 2 nicht auslassen
(Details in `CONTRIBUTING.md`).

Ob `dev` bzw. PRs derzeit noch eigene Preview-Deployments erhalten, ist
ungeklärt (offener Punkt in `CONTRIBUTING.md`).

`vercel.json` in diesem Verzeichnis enthält die SPA-Rewrite-Regel für das
clientseitige Routing. Details zur Projekt-Konfiguration im
Vercel-Dashboard (Root Directory, Environment Variables pro Environment)
und zum Deployment-Ablauf stehen im Abschnitt
["Hosting (Vercel)"](../CONTRIBUTING.md#hosting-vercel) in
`CONTRIBUTING.md` (#99).

