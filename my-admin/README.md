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

## Customize The Application

Follow the instructions in your browser console once you start the application.

## Branch- und Umgebungsstrategie

Wie Änderungen von einem Feature-Branch über `dev` (Testdaten) nach `main`
(Prod) gelangen, welche Regeln für Hotfixes gelten und welche
Abnahmekriterien ein PR erfüllen muss, ist in
[`CONTRIBUTING.md`](../CONTRIBUTING.md) im Repository-Root beschrieben (#97).

