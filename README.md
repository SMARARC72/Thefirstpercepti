# The First Perception

Local implementation workspace for the game engine, database schema smoke checks,
and a playable web prototype.

## Packages

- `backend`: TypeScript game engine, deterministic dice, rules, state, controller,
  and intended-behavior tests.
- `database`: SQLite schema and seed data.
- `scripts/schema`: in-memory schema smoke validation using `sql.js`.
- `apps/web`: Vite TypeScript web game with title screen, six-step character
  creation, gameplay dashboard, command input, local save/load, and browser test
  hooks.

## Setup

```powershell
npm --prefix backend ci
npm --prefix scripts/schema ci
npm --prefix apps/web ci
```

## Run

```powershell
npm run web:dev
```

Open the Vite URL shown in the terminal. Add `?demo=1` to load directly into a
playable gameplay state.

## Verify

```powershell
npm run verify
```

This runs backend typecheck, backend tests, backend build, web build, and schema
smoke validation.
