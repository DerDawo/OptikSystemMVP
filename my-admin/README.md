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
Supabase **Dev-Branches** sein, nicht die von Production. Details zum
Einrichten und Zurücksetzen des Dev-Branches: siehe
[`supabase/README.md`](../supabase/README.md#dev-branch-supabase-branching).
Solange der Dev-Branch noch nicht existiert, zeigen diese Werte zwangsläufig
auf das einzige vorhandene Projekt.

## Customize The Application

Follow the instructions in your browser console once you start the application.

