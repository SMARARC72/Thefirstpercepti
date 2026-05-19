# The First Perception

A cosmic-horror solo text RPG. Ink-driven narrative, deterministic engine, Tone.js
generative audio, a Living World that remembers across runs.

## Stack

- **Vite + vanilla TypeScript** web app (no framework)
- **Ink** (via `inkjs`) for branching narrative
- **Tone.js** for reactive ambient audio
- **gsap** for motion
- **Vercel Postgres** for save slots + the cross-run world memory (Phase 3+)
- **Claude Sonnet 4.6** (primary) + **Kimi K2** (fallback) via a serverless `/api/llm` proxy (Phase 3+)

## Layout

```
packages/
  types/          shared TS domain model
  engine/         deterministic dice, rules, reducers, controller
  narrative/      Ink runtime (InkBridge, NarrativeEngine, ContentLoader)
  audio/          Tone.js generative audio engine
  ui-system/      shared CSS tokens + primitives
  persistence/    save-slot + world-memory client (Postgres in Phase 3b)
  llm-client/     provider-agnostic Claude/Kimi client (Phase 3c)
apps/
  web/            Vite browser app (title, creation, gameplay, death, legacy)
content/
  narrative/      .ink source
  _compiled/      compiled .json (built by scripts/build-content.mjs)
  audio-presets/  Tone.js preset packs
  world-data/     factions, items, locations, NPCs, conditions (JSON)
database/
  schema.sql      reference SQLite schema; Postgres port lands in Phase 3b
scripts/
  build-content.mjs    compile .ink → .json
  validate-content.mjs validate scene references
  deploy.mjs           Vercel deploy helper
```

## Setup

This is an npm workspaces monorepo. A single install at the root pulls everything.

```bash
npm install
```

Node `>= 20` required (see `engines` in `package.json`).

## Run

```bash
npm run dev          # vite dev server for apps/web
# add ?demo=1 to the URL to skip creation and load a playable gameplay state
```

## Verify

```bash
npm run verify       # typecheck + tests + content + build + Playwright smoke
```

Stage-by-stage:

```bash
npm run typecheck            # engine + web
npm test                     # engine vitest (9 specs) + web vitest (9 specs)
npm run content:compile      # .ink → .json
npm run content:validate     # scene-reference validator
npm run build                # production web bundle
npm run test:e2e             # apps/web/tests/smoke.mjs (Playwright)
```

CI runs the same pipeline on every PR (`.github/workflows/ci.yml`).

## Branching & contribution

- Default branch: `main`.
- Feature work happens on `claude/<short-slug>` or `feat/<slug>` branches.
- Open a PR against `main`; CI must be green before merge.

## Roadmap (active)

See `progress.md` for session-by-session notes and `AGENTS.md` for agent-critical
conventions. Live roadmap phases:

1. **Safety net** — versions, shared tsconfig, CI ✅
2. **Cleanup** — orphaned code, dev scratch, screenshots ✅
3. **Engine hygiene, Postgres persistence, Claude+Kimi LLM client, Living World writeback**
4. **Test coverage**
5. **Polish & docs**
6. **Immersion & diegetic UI** (occult-grimoire pass)
7. **Seamlessness & robustness** (Sentry, streaming tokens, bundle budget)
8. **Settings, accessibility, onboarding** ("The Lens" drawer, Witness Briefing)
