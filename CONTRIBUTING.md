# Contributing

Short version: pick a branch from the `claude/` or `feat/` prefix, run
`npm run verify` before pushing, and keep PRs scoped to one concern.

## Setup

```bash
git clone https://github.com/SMARARC72/Thefirstpercepti.git
cd Thefirstpercepti
npm install
cp apps/web/.env.example apps/web/.env.local   # fill in keys if iterating on the server
```

Node `>= 20` required.

## The verify gate

Before opening a PR, the following must be green:

```bash
npm run typecheck      # persistence + llm-client + narrative + engine + web + api
npm test               # 96+ unit + integration specs across all workspaces
npm run content:compile
npm run build          # web app, no errors, no source-map warnings
npm run test:e2e       # Playwright smoke against the preview server
```

`npm run verify` chains these. CI runs the same pipeline on every push.

## Branch naming

- `claude/<short-slug>` — work driven through Claude Code (the agent runner).
- `feat/<slug>` — human-driven features.
- `fix/<slug>` — bug fixes.

Open the PR against `main`. Squash merge by default; the branch is deleted
after merge.

## Commit style

Look at recent commits for the shape:

```
type(scope): one-line summary

Optional body paragraph explaining the *why*, not the *what*. Wrap at
~72 characters. Reference issue numbers only when they add context.
```

Examples of `type`: `feat`, `fix`, `chore`, `test`, `docs`, `refactor`.
Examples of `scope`: `engine`, `persistence`, `phase-3c`, `ui`.

## Workspace layout

```
packages/
  types/          shared TS types + logger contract
  engine/         deterministic dice + reducers + state adapter
  narrative/      Ink runtime + WorldMemoryCache + LLM agents
  audio/          Tone.js generative audio
  ui-system/      shared CSS tokens + primitives
  persistence/    GameRepository contracts + four backends
  llm-client/     LLMClient interface + Claude/Kimi/proxy adapters
apps/
  web/            Vite browser app (the only frontend)
api/              Vercel serverless functions
content/          narrative .ink + world-data + audio presets
database/         schema.postgres.sql
docs/             roadmap + ADR-style notes
scripts/          build-content, db-migrate, deploy
```

## Rules of thumb

- **No console.log in shipped code.** Use `getLogger()` from
  `@first-perception/types`; the Phase 7 Sentry hook will swap the
  global without touching call sites.
- **No package may depend on `apps/web`.** The web app is the leaf;
  packages are leaves below it.
- **`@first-perception/persistence/server` and
  `@first-perception/llm-client/server` are server-only.** Importing
  them from `apps/web/src/**` will silently bloat the browser bundle
  with `pg` and provider URLs — both of which the bundle scrubber in
  CI will catch eventually but you should not push.
- **Authored content lives in `content/`.** Don't put narrative strings
  in TS files unless they're test fixtures.
- **`.env.local` is gitignored.** Don't commit secrets.

## Filing issues

Use GitHub issues with one of these prefixes:

- `[bug]` — something broken in shipped code
- `[ask]` — design question or architectural pivot
- `[content]` — Ink narrative bug or polish ask
- `[a11y]` — accessibility regression or improvement

Include the version you saw it on (`git rev-parse HEAD`) and the
shortest reproduction you can write.

## Running locally with full stack

The Vite dev server alone does not run the serverless functions under
`/api/`. To exercise saves, world events, and the LLM proxy locally:

```bash
npm install -g vercel
vercel dev   # serves Vite + functions on one port (default 3000)
```

For DB-touching paths, run `npm run db:migrate` once after copying
`.env.example → .env.local` (see `docs/POSTGRES_SETUP.md`).

## Adding a new package

1. `mkdir packages/<name> && cd packages/<name>`
2. Add `package.json` (copy a sibling, change name + description), a
   `tsconfig.json` that extends `../../tsconfig.base.json`, and `src/`.
3. Add it to the build chain in root `package.json:build:packages`.
4. Add it to the typecheck chain in root `package.json:typecheck`.
5. Add to the test chain if it has a `test` script.
6. From the root: `npm install` (links the workspace).

## Tests

- **Unit specs live next to the code** (`src/Foo.test.ts`) when they
  test the same file, OR in `tests/<topic>.spec.ts` for cross-cutting
  flows.
- **Coverage** is advisory right now (`npm run test:coverage`);
  thresholds get enforced after Phase 5.
- **Playwright smoke** is one file, `apps/web/tests/smoke.mjs`, that
  exercises the happy path end to end. Don't add scenario branches
  to it — write a new spec.

## Phase tracking

The roadmap and per-phase notes live in `progress.md`. Each phase
ends with: "Verify" (what passes), "What's not in this push" (what was
skipped on purpose), and bundle/test deltas. Read the last few
entries before starting work to avoid duplicating effort.
