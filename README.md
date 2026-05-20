# The First Perception

A cosmic-horror solo text RPG. The world is an artifact you read, not a
state machine you steer. Words bind, recall the dead, and stay
remembered across runs.

Stack: Vite + vanilla TypeScript, **Ink** for branching narrative,
**Tone.js** for generative audio, **gsap** for motion, **Vercel Postgres**
for cross-run memory, **Claude Sonnet 4.6** (primary) + **Kimi K2**
(fallback) for procedural narrative, all behind a serverless `/api/llm`
proxy so the browser never holds a provider key.

---

## Run it locally

```bash
npm install
npm run dev              # Vite dev server (no /api/* — pair with `vercel dev`)
```

The Vite dev server alone does not serve the serverless functions under
`/api/`. To exercise saves, world events, and the LLM proxy locally:

```bash
npm install -g vercel
vercel dev               # Vite + functions on one port (default 3000)
```

Add `?demo=1` to the URL to skip creation and load a playable starter.

## Set up the database

The Living World layer compounds across runs via Postgres. See
`docs/POSTGRES_SETUP.md` for the full setup (Vercel + Supabase
recommended).

```bash
cp apps/web/.env.example apps/web/.env.local
# fill in POSTGRES_URL / POSTGRES_URL_NON_POOLING
npm run db:migrate
```

Six tables get created idempotently: `save_snapshot`, `world_event`,
`npc_memory`, `rumor`, `agent_log`, `legacy_record`.

## Set up the LLM proxy

Set in Vercel Project Settings → Environment Variables (or in
`apps/web/.env.local` for local dev):

| Var | What it does |
| --- | --- |
| `ANTHROPIC_API_KEY` | Primary provider (Claude Sonnet 4.6) |
| `MOONSHOT_API_KEY`  | Fallback provider (Kimi K2). Optional. |

The proxy at `POST /api/llm` (and SSE at `/api/llm/stream`) reads these
server-side, fails over automatically when both are configured, and
returns `x-llm-provider` / `x-llm-failover-from` response headers so
the browser can attribute latency. The browser bundle is grepped for
provider URLs and key patterns at build time; if any leak, the build
should be considered broken.

## Verify

```bash
npm run verify           # typecheck + tests + content + build + smoke
```

Sub-stages:

```bash
npm run typecheck        # persistence + llm-client + narrative + engine + web + api
npm test                 # 96 specs across all workspaces
npm run test:coverage    # advisory v8 coverage reporter
npm run content:compile  # .ink → .json
npm run content:validate # scene-reference linter
npm run build            # production web bundle
npm run test:e2e         # apps/web/tests/smoke.mjs (Playwright)
```

`.github/workflows/ci.yml` runs the same pipeline on every push.

---

## Aesthetic

Phase 6 settled on **occult-grimoire**: parchment + ink, sigil-gold +
ember accents, Cormorant Garamond for body voice on Inter UI chrome.
Tabs and buttons read as in-world labels (*The Unfolding*, *What
Waits*, *The Vessel*, *Bind*, *Recall*, *Withdraw*) with literal
translations in tooltips. Status meters are reskinned as physical
objects — HP is a wax seal, focus is a candle, danger is a tide line
rising on the meter track.

Audio is cinematic by default (always-on ambient, audio reacts to
every action) and respects `prefers-reduced-motion` and the in-game
*Silent* toggle. Cross-run faction memory compounds when the LLM proxy
is configured; offline mode falls back to a localStorage scope that is
explicit about not compounding across sessions.

---

## Workspace layout

```
packages/
  types/          shared TS types + getLogger() shim
  engine/         deterministic dice + reducers + state adapter
  narrative/      Ink runtime + WorldMemoryCache + LLM agents
  audio/          Tone.js generative audio
  ui-system/      shared CSS tokens (void/teal/gold base + grimoire layer)
  persistence/    GameRepository contract + four backends
                  (Postgres / Http / LocalStorage / Memory).
                  Dual exports: ".", "./server"
  llm-client/     LLMClient interface + Claude/Kimi/Proxy adapters
                  + IntentClassifier.
                  Dual exports: ".", "./server"
apps/
  web/            Vite browser app (the only frontend)
api/              Vercel serverless functions
                  (saves, world-events, npc-memories, rumors,
                  agent-logs, legacies, llm, llm/stream, health)
content/
  narrative/      .ink source
  _compiled/      .json output (built by scripts/build-content.mjs)
  audio-presets/  Tone.js preset packs
  world-data/     factions / items / locations / npcs / conditions JSON
database/
  schema.postgres.sql   v1 production schema (six tables)
  schema.sql            historical sqlite reference (47 tables, unused)
scripts/
  build-content.mjs     .ink → .json
  db-migrate.mjs        applies schema.postgres.sql
  deploy.mjs            Vercel deploy helper
docs/
  POSTGRES_SETUP.md     provisioning + credential rotation
```

## Per-turn flow

```
Player command
  → IntentClassifier (LLM-first, regex fallback below 0.55 confidence)
  → engine reducer (combat / move / rest / item / dialogue / investigation)
  → applyPatches() → GameState'
  → conditionReducer() ticks status effects
  → NarrativeEngine.prepareWorldMemory() pre-warms recall cache
  → NarrativeEngine.processCommand() → Ink narrative
  → TurnOrchestrator.processTurn() if Living World enabled
       NPC subagents (parallel) → faction subagents → GM merge
  → repo.recordEvent() for the player turn (cross-run memory)
  → if faction pulse: repo.recordEvent() for that, too
  → AudioEngine.updateFromGameState()
  → render
```

## Roadmap

| Phase | What | Status |
| --- | --- | --- |
| 1 | Safety net (versions, tsconfig, CI) | ✅ |
| 2 | Cleanup (orphan code, screenshots) | ✅ |
| 3a | Engine hygiene (audio sync, JSON types) | ✅ |
| 3b | Postgres + serverless persistence | ✅ |
| 3c | Claude + Kimi proxy, no keys in browser | ✅ |
| 3d | Living World wiring (intent, recall, writeback) | ✅ |
| 4 | Test coverage (96 specs) | ✅ |
| 5 | Polish + docs (logger, LICENSE, CONTRIBUTING) | ✅ |
| 6 | Immersion & diegetic UI (occult-grimoire) | 🚧 in progress |
| 6b | Cinematic ceremonies (title coalesce, death rite, legacy register) | next |
| 7 | Seamlessness & robustness (Sentry, streaming, bundle budget) | planned |
| 8 | Settings, accessibility, onboarding ("The Lens", Witness Briefing) | planned |

Detailed per-session notes live in `progress.md`. Agent-critical
conventions live in `AGENTS.md`. Contribution rules + workflow live in
`CONTRIBUTING.md`.

## License

MIT — see `LICENSE`.
