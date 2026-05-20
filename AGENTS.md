# AGENTS.md — The First Perception

> Agent-critical context. Read this before touching the repo. Deeper
> AGENTS.md files in subdirectories take precedence. The live roadmap
> and per-phase notes live in `progress.md`.

---

## Reconciliation Context (READ FIRST)

This repo is the **canonical codebase** for **The First Perception**.
A parallel design layer is maintained by Khoja in a separate Claude
Desktop session — Living Codex hub, `schema_pack_v0.5.json`, ~580
Greywake content records, 43 wireframes, manifesto/voice guardrails,
30+ spec markdowns. The two tracks converged on every load-bearing
design call (9-stat system, 5e overlay, Ink narrative, cosmic-horror
tone, fountain motif) but diverged on stack, agent topology, content
names, schema representation, and voice rules.

**Determination — salvage this repo, port the design into it.** See
`docs/RECONCILIATION_AUDIT.md` for the full per-component verdict
matrix. The engineering roadmap from Phase 12 onward lives in
`docs/ENGINEERING_PLAN.md`; the v1 slice ship criteria are in
`docs/POLISH_CRITERIA.md`.

### Critical coordination rule

> **Phases 12–17 (the reconciliation core) are SINGLE TRACK ONLY.**
> All work in either Claude Desktop OR Claude Code, **not both**.
> Recommended: **Claude Desktop** (it has the live design context).

If you've opened a Claude Code session and the most recent
`progress.md` entry is still in the Phase 12–17 range, stop and
verify with the user that you should be working here, not in
Claude Desktop. Phases 18+ allow a hybrid cadence, but every
session must start by re-reading this section + `docs/
RECONCILIATION_AUDIT.md` Sec V (Determination + Migration Plan).

### Reference set

- **`docs/RECONCILIATION_AUDIT.md`** — repo × design audit, 19-component
  verdict matrix, 14-phase migration plan, hard external gates.
- **`docs/ENGINEERING_PLAN.md`** — Phase 12 → 25 ticket catalog,
  critical path, parallel tracks, fragility points.
- **`docs/POLISH_CRITERIA.md`** — 10 engineering + 8 content + 7 UI
  binding criteria for v1 slice ship; explicit "NOT in v1" list;
  Definition of Done gate before Phase 25.

### Hard external gates (block specific phases)

- **MYTHOLOGY_AUDIT_v0.4 §11 / §11b outside-review** — blocks Phase 19
  substrate items. Khoja must engage outside reviewers.
- **Steam Next Fest application** — 3+ month lead time. Apply during
  Phase 22.
- **Local-LLM fallback model selection** — needs voice-eval-suite
  testing.

### Deprecated tooling (do not run)

- `scripts/sprint_sync.py` — replaced by the reconciliation flow.
  ARD-008 superseded. The repo's `progress.md` is the cadence record.

---

## Project Identity

**The First Perception** is a cosmic-horror narrative RPG played in the
browser. Stack:

- **Ink by Inkle** (via `inkjs`) for branching narrative
- **Tone.js** for generative ambient audio
- **gsap** for motion
- **Vite + vanilla TypeScript** for the web UI (no React framework)
- **Vercel Postgres** (via Supabase or any Postgres provider) for save
  slots + cross-run world memory + legacies
- **Claude Sonnet 4.6** (primary) + **Kimi K2** (fallback) via a
  serverless `/api/llm` proxy — keys never enter the browser bundle
- A **deterministic seeded engine** for dice rolls, state patches, and
  replay

---

## Monorepo Layout

```
packages/
  types/          shared TS interfaces + getLogger() shim
  engine/         deterministic dice + reducers + state adapter
  narrative/      Ink runtime (InkBridge, NarrativeEngine, ContentLoader,
                  WorldMemoryCache) + LLM agents (TurnOrchestrator,
                  NPCSubagent, FactionSubagent, GMNarrator)
  audio/          Tone.js generative audio engine
  ui-system/      shared CSS tokens + primitives
  persistence/    GameRepository contract + four impls
                  (Postgres/Http/LocalStorage/Memory). Dual exports:
                  ".", "./server".
  llm-client/     LLMClient interface + Claude/Kimi/Proxy adapters +
                  IntentClassifier. Dual exports: ".", "./server".
apps/
  web/            Vite browser app (title / creation / gameplay /
                  death / legacy screens)
api/              Vercel serverless functions (saves, world-events,
                  npc-memories, rumors, agent-logs, legacies, llm,
                  llm/stream, health)
content/
  narrative/      .ink source
  _compiled/      .json output (built by scripts/build-content.mjs)
  audio-presets/  Tone.js preset packs
  world-data/     factions / items / locations / npcs / conditions JSON
database/
  schema.sql           legacy reference (sqlite, 47 tables, unused)
  schema.postgres.sql  v1 production schema (6 tables — what's actually
                       used by the runtime)
scripts/
  build-content.mjs    .ink → .json
  validate-content.mjs scene-reference validator
  db-migrate.mjs       applies schema.postgres.sql
  deploy.mjs           Vercel deploy helper
docs/
  POSTGRES_SETUP.md    provisioning + credential rotation
  ...                  historical design docs (not all current)
```

---

## Critical Conventions

### Types

All game types live in `packages/types/src/index.ts`. The web app **does
not define its own `GameState`** — it re-exports from
`@first-perception/types`. Key shapes:

- `Player.inventory: Item[]` (not `string[]`)
- `Player.conditions: Condition[]` (not `string[]`)
- `GameState.suggestedActions: SuggestedAction[]`
- `TaleEntry` requires `id: UUID` and `tags: string[]`
- `JournalEntry` requires `id: UUID` and `category` enum

### Logging

All packages must use `getLogger()` from `@first-perception/types`. Never
call `console.log` / `console.warn` / `console.error` directly in shipped
code — Phase 7 swaps the global for a Sentry/OTel sink and direct console
calls bypass it.

```ts
import { getLogger } from "@first-perception/types";
getLogger().warn("NPC subagent failed", { npcId, error: err });
```

### Persistence

`packages/persistence` ships four `GameRepository` impls:

- `PostgresRepository` — server-only, pg.Pool. Import from
  `@first-perception/persistence/server`.
- `HttpRepository` — browser-side, calls `/api/*`. Browser entry default.
- `LocalStorageRepository` — fallback when API is unreachable. Save
  slots + legacies persist; world events + NPC memories are session-
  scoped (cross-run memory genuinely requires the server).
- `MemoryRepository` — tests + SSR.

The web client tries `HttpRepository.init()` (which pings `/api/health`)
and falls back to `LocalStorageRepository` on failure. **Never import
`/server` from `apps/web/**`** — it would pull `pg` into the browser
bundle.

### LLM

`packages/llm-client` ships an `LLMClient` interface with three impls:

- `AnthropicClient` (server-only, Claude Sonnet 4.6 default tier)
- `MoonshotClient` (server-only, Kimi K2)
- `ProxyLLMClient` (browser, POSTs to `/api/llm` and `/api/llm/stream`)

The narrative agents (`TurnOrchestrator`, `NPCSubagent`, `GMNarrator`,
`FactionSubagent`) accept the `LLMClient` interface, so a test can swap
in a stub and the browser swaps in `ProxyLLMClient`. **No API keys in
the browser bundle.** CI greps for `api.anthropic.com`, `api.moonshot.cn`,
`sk-ant`, `ANTHROPIC_API_KEY`, `MOONSHOT_API_KEY` in the built JS and
should never find them.

### State Flow (per turn)

```
Player command
  → intentClassifier.classify()  → ClassifiedIntent (LLM or regex)
  → reducer dispatch              → ActionResult { patches, narrative, rolls, suggestions }
  → applyPatches(game, patches)   → updated GameState
  → conditionReducer()            → more patches
  → narrativeEngine.prepareWorldMemory()  → pre-warms recall cache from repo
  → narrativeEngine.processCommand()      → NarrativeResult { text, choices, taleEntry, soundCue }
  → TurnOrchestrator.processTurn() if Living World enabled
  → repo.recordEvent(buildWorldEvent(...))  → WorldEvent writeback
  → if pulse: repo.recordEvent(buildFactionWorldEvent(...))
  → audioEngine.updateFromGameState()
  → render
```

### Ink Pipeline

1. Ink source in `content/narrative/` (`.ink` files)
2. `npm run content:compile` runs `scripts/build-content.mjs`
3. Output → `content/_compiled/*.json` + copied to
   `apps/web/public/content/_compiled/`
4. `ContentLoader` fetches `/content/_compiled/*.json` at runtime
5. `NarrativeEngine` loads `main.json` (which `INCLUDE`s all scenes)

**Externals bound in Ink:**

- `get_player_stat(name)` → reads `game.player.stats`
- `get_world_danger()`, `get_faction_trust(id)`, `get_faction_fear(id)`
- `has_condition(typeId)`, `has_item(id)`
- `get_turn_count()`
- `roll_check(domain, difficulty)` → deterministic d20
- `add_journal_entry(label, detail)`
- `set_variable(name, value)`
- `min(a, b)`, `max(a, b)`
- **`recall(location_id)`** → reads `WorldMemoryCache`, fallback
  "Nothing in particular comes to memory here." Pre-warmed by
  `NarrativeEngine.prepareWorldMemory()`.
- **`llm_generate(prompt)`** → reads `WorldMemoryCache`, fallback is
  a hash-keyed pick from a small pool. Real async LLM mid-passage
  lands in Phase 6.

### Audio

- `AudioEngine.start()` is async; the first user click must `await` it
  before `updateFromGameState()` so the first command's audio
  adaptation doesn't drop.
- `audioEngine.playCue({ layer, type, soundId })` expects an
  `AudioCue` object, not a string.

---

## Known Traps

### 1. Web `GameState` must stay aligned with shared types
If you add a field to `@first-perception/types/GameState`, also update
`createGameFromCreation()` in `apps/web/src/game.ts`. Otherwise reducers
or InkBridge crash on missing fields.

### 2. Exits live in JSON content, not in code
`packages/engine/src/reducers/moveReducer.ts` honors `LocationNode.exits`.
`apps/web/src/data/worldLoader.ts` maps exits from
`content/world-data/locations.json`. If you change the locations JSON
shape, update both `worldLoader.ts` AND the regression spec
`apps/web/src/game.test.ts` ("starts the player at a location with
mechanical exits").

### 3. `NarrativeEngine` does not write patches
Ink produces narrative text and choices, not `StatePatch[]`. Mechanical
state changes (HP, items, conditions) come from engine reducers.

### 4. `applyPatches` uses JSON-pointer paths
`/player/hp`, `/world/danger`, `/locations/0/exits/0/visible`. The
function mutates via `structuredClone`, so the returned object may
contain extra fields not in the original web state.

### 5. NPCs are filtered by `npc.locationId`
`getNpcsAtLocation()` matches `npc.locationId === locationId`.
`lastSeen` is display-only.

### 6. The browser must never import from `*/server`
`@first-perception/persistence/server` pulls in `pg` (Node-only).
`@first-perception/llm-client/server` holds provider URLs and key-
handling logic. Both are gated by package.json `exports`; importing
them from `apps/web/**` would bloat the bundle and (worse) leak
configuration paths. CI doesn't fail on this yet — add the check.

### 7. `prepareWorldMemory()` is best-effort
A persistence outage leaves the recall cache cold; the Ink fallback
"Nothing in particular comes to memory here." fires. Do not let a
DB error block a turn.

---

## Build & Test

```bash
npm install
npm run dev          # Vite dev server (no /api/* — pair with `vercel dev`)
npm run build        # production bundle
npm run typecheck    # all workspaces + api/
npm test             # 96 unit + integration specs across all packages
npm run test:coverage  # v8 coverage report per workspace (advisory)
npm run test:e2e     # Playwright smoke against preview
npm run verify       # the four above, chained
npm run db:migrate   # apply schema.postgres.sql
```

CI runs `verify` on every push.

---

## Active Roadmap

See `progress.md` for per-session notes. High level:

- ✅ Phase 1 — Safety net (versions, tsconfig, CI)
- ✅ Phase 2 — Cleanup (orphan code, screenshots, docs)
- ✅ Phase 3a — Engine hygiene (audio sync, JSON types, debug log strip)
- ✅ Phase 3b — Postgres + serverless API + dual-export persistence
- ✅ Phase 3c — Claude + Kimi proxy, browser holds no keys
- ✅ Phase 3d — Living World wiring (intent classifier, Ink externals,
  WorldEvent writeback)
- ✅ Phase 4 — Test coverage (96 specs; +32 net)
- ⏳ Phase 5 — Polish + docs (this file, LICENSE, CONTRIBUTING, logger
  migration, main.ts decomposition)
- Phase 6 — Immersion & diegetic UI (occult grimoire aesthetic)
- Phase 7 — Seamlessness & robustness (Sentry, streaming, bundle
  budget)
- Phase 8 — Settings, accessibility, onboarding (The Lens drawer,
  Witness Briefing)

---

## File Ownership

| Concern | Primary files |
|---------|---------------|
| Game state model | `packages/types/src/index.ts` |
| Logger shim | `packages/types/src/logger.ts` |
| Web state builder | `apps/web/src/game.ts` |
| Command routing | `apps/web/src/main.ts` |
| Local IDB saves | `apps/web/src/data/idbSaves.ts` |
| Legacy ledger | `apps/web/src/data/legacyHistory.ts` |
| World-event builders | `apps/web/src/data/worldEvents.ts` |
| Ink runtime | `packages/narrative/src/NarrativeEngine.ts`, `InkBridge.ts`, `ContentLoader.ts` |
| Ink externals bridge | `packages/narrative/src/bindings/gameStateBindings.ts`, `WorldMemoryCache.ts` |
| Engine reducers | `packages/engine/src/reducers/*.ts` |
| State patches | `packages/engine/src/state-adapter.ts` |
| Audio | `packages/audio/src/AudioEngine.ts` |
| LLM provider adapters | `packages/llm-client/src/AnthropicClient.ts`, `MoonshotClient.ts` |
| Browser LLM client | `packages/llm-client/src/ProxyLLMClient.ts` |
| Intent classifier | `packages/llm-client/src/IntentClassifier.ts` |
| Postgres repo | `packages/persistence/src/PostgresRepository.ts` |
| Serverless API | `api/*.ts`, `api/_lib/*.ts` |
| Ink source | `content/narrative/**/*.ink` |
| UI screens | `apps/web/src/screens/*.ts` |

---

## Design Directive

> "UX/UI = wild imaginative mad scientists with free reign."

The UI should feel like an artifact from the game world (occult
grimoire register — chosen in Phase 5/6 planning). Tabs, meters, save
controls all get diegetic copy. Cinematic motion + audio reactivity
are intentional; respect `prefers-reduced-motion` and the in-game
Settings drawer toggles when those land.
