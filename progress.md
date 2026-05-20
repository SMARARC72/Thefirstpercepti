# The First Perception — Implementation Progress

> Original directive: /batch and execute on the plan in full
> Master plan: `docs/OPTIMIZED_BUILD_AND_DESIGN_PLAN.md`

---

## 2026-05-19 (Session 1) — Foundation & Monorepo Recovery

- Confirmed workspace was not a git repo and did not contain deployed frontend source.
- Established monorepo layout:
  - `packages/types` — shared TypeScript domain model
  - `packages/engine` — deterministic game engine with reducers
  - `packages/narrative` — Ink/inkjs narrative runtime (InkBridge, NarrativeEngine, ContentLoader)
  - `packages/audio` — Tone.js generative audio engine
  - `packages/ui-system` — shared CSS and UI primitives
  - `apps/web` — Vite + TypeScript browser app
  - `content/` — Ink narrative source + compiled JSON pipeline
- Fixed backend package metadata, scripts, TypeScript blockers, and module alignment.
- Added deterministic behavior fixes for character creation, content rewrites, consequence IDs/countdowns, and scene IDs.
- Built engine reducers: `combatReducer`, `moveReducer`, `investigationReducer`, `itemReducer`, `dialogueReducer`, `conditionReducer`, `restReducer`.
- Added Vitest coverage for dice bands, seeded replay, input parsing, character creation determinism, consequences, death checks, and a 10-turn golden smoke.
- Added Vite TypeScript web app with title screen, six-step creation, gameplay tabs, command dock, localStorage save/load, and browser test hooks.
- Added root README, .gitignore, and npm verification scripts.

## 2026-05-19 (Session 2) — Phase A: Ink Narrative Integration

**Goal:** Wire the Ink narrative engine into the web app so player commands drive Ink story flow instead of hardcoded strings.

### What was done

1. **Type alignment (`apps/web/src/game.ts` → shared `@first-perception/types`)**
   - Migrated web `GameState` to match shared `GameState` shape.
   - Added missing fields: `day`, `phaseIndex`, `phaseName`, `currentLocationId`, `locations`, `regions`, `consequences`, `rumors`, `gameOver`, `legacy`.
   - Converted `player.inventory` from `string[]` to `Item[]`.
   - Converted `player.conditions` from `string[]` to `Condition[]`.
   - Converted `suggestedActions` from `string[]` to `SuggestedAction[]`.
   - Updated `TaleEntry` creation to include required `id` and `tags`.
   - Updated `JournalEntry` creation to include required `id` and `category`.
   - Enriched `buildNpcs()` with engine-compatible fields: `stats`, `hp`, `maxHp`, `dialogueState`, `alive`, `locationId`, `secrets`.

2. **Component updates for shared types**
   - `StatusPanel.ts`: renders `condition.name` and `item.name` instead of plain strings.
   - `CommandDock.ts`: accepts `SuggestedAction[]`, displays `label`, submits `command`.
   - `TalePanel.ts`: passes `SuggestedAction[]` to `CommandDock`.

3. **`main.ts` integration**
   - `NarrativeEngine` initialized in `boot()` alongside `AudioEngine`.
   - `runCommand()` flow:
     1. Parses command → infers verb.
     2. Routes to engine reducer (`combatReducer`, `moveReducer`, etc.) based on verb.
     3. Applies `StatePatch[]` via `applyPatches()`.
     4. Ticks conditions via `conditionReducer`.
     5. Calls `NarrativeEngine.processCommand()` for Ink-driven narrative text + choices.
     6. Merges `NarrativeResult` into game state (tale entry, journal entry, suggestions, feedback).
     7. Falls back to engine reducer narrative when Ink produces no tale entry.
     7. Advances world time (phase index, day, pulse).
     8. Syncs audio engine to current game state.
     9. Plays sound cues from Ink tags.
   - `renderCreation()` calls `narrativeEngine.enterScene("arrival", game)` on embark.

4. **Shared type fix**
   - Added `data?: string` to `SaveSlot` interface (used by IndexedDB save slots).

5. **Build verification**
   - `npm run build` passes end-to-end (content compile + typecheck + vite build).
   - `packages/types`, `packages/engine`, `packages/narrative`, `packages/audio` all build cleanly.

### Known issues at end of Phase A

| Issue | Severity | Notes |
|-------|----------|-------|
| Engine reducers + web state | P2 | `moveReducer` needs exits in `locations[]` to function; web currently creates locations with `exits: []`. Movement works via Ink choices for now. |
| Audio lazy init | P2 | `AudioEngine.start()` requires first user click. `updateFromGameState()` on first command runs before click, so first-command audio adaptation is skipped. |
| No web unit tests | P2 | `apps/web` has zero `.test.`/`.spec.` files. Only engine tests exist. |
| Playwright smoke outdated | P2 | `apps/web/tests/smoke.mjs` needs updating for Ink-driven flow. |

---

## Phase B — Next Sprint Backlog

> Detailed plan: `docs/PHASE_B_PLAN.md`

### Completed during handoff
- ✅ **Browser story flow verified** — Ink narrative loads, commands produce tale entries, suggestions update, zero console errors.
- ✅ **Engine death-handling test fixed** — `GameController.processTurn()` now sets `alive: false` when `DeathSystem.checkDeath()` returns a record. All 9 engine tests pass.
- ✅ **Narrative/engine reducer merge fixed** — `main.ts` now applies engine reducer narrative when Ink returns empty `taleEntry`.

### Completed in this session
1. **Web test foundation** — Playwright smoke test `apps/web/tests/smoke.mjs` created. Verifies demo mode, command submission, tale updates, suggestion changes, cross-location travel, save/load, and console errors.
2. **Movement & location graph** — Verified working via Ink cross-location travel (arrival \u2192 fountain \u2192 market \u2192 archive).
3. **Audio polish** — Already worked; first click calls `audioEngine.start()` then `updateFromGameState()`.
4. **Content expansion** — Added `sound:` tags (combat_start, ambient_drip, market_murmur, archive_bell, breach_rumble, etc.), `animation:` tags (shudder, pulse, flash), `# consequence:` tags (wounded, danger_rise), and wired faction_reaction knots into fountain/market scenes.
5. **Death & legacy flow** — Full implementation:
   - `runCommand()` detects `player.hp <= 0`, calls `deathReducer()`, generates `Legacy` via `LegacySystem`, saves to `localStorage` history, transitions to `game_over` screen.
   - `DeathScreen` shows epitaph, death details, and legacy inheritance.
   - `LegacyScreen` shows chain of past lives with turns survived, vectors, and inherited items.
   - "Begin New Run" applies last legacy (inherited item, starting advantage) to new character.
   - TitleScreen "Legacy" button now navigates to `LegacyScreen`.
6. **Critical UI bug fix** — Fixed `mountScreen()` not preserving `update()`, `GameplayScreen.update()` not propagating to child panels, and `TalePanel.update()` comparing tale length after reassignment.

### Verification
- `npm run build` passes end-to-end
- Engine tests: 9/9 pass
- Web tests: 9/9 pass
- Playwright smoke: passes

---

## 2026-05-19 (Session 3) — Phase 1: Safety Net

**Goal:** Lock down toolchain versions, add a root tsconfig base, and stand up CI so future work doesn't regress silently.

### What was done
- Fixed `packages/engine/package.json` versions (`typescript ^6.0.3 → ^5.8.3`, `vitest ^4.0.13 → ^3.0.0`, `@types/node ^25.9.0 → ^22.0.0`). These versions didn't exist; npm was resolving them to whatever 4.x/25.x it could find, producing inconsistent test runs.
- Added `tsconfig.base.json` at repo root; every workspace `tsconfig.json` now `extends` it and only declares per-package overrides (lib, rootDir/outDir, paths, etc.).
- Added `.github/workflows/ci.yml` — runs `npm ci`, `build:packages`, `typecheck`, `content:compile`, `test`, web build, and Playwright smoke on every PR / push to `main`. Concurrency-grouped to cancel superseded runs.
- Regenerated `package-lock.json` from scratch after fixing engine versions to clear the stale Vitest 4.1.6 entry that was previously hoisted into `packages/engine/node_modules/`.

### Baseline (honest)
| Stage | Status |
|-------|--------|
| Workspace install (`npm install`) | ✅ |
| `npm run build:packages` (7 packages) | ✅ |
| `npm run typecheck` (engine + web) | ✅ |
| `npm test` — engine | ✅ 9/9 |
| `npm test` — web | ✅ 9/9 |
| `npm run content:compile` | ✅ |
| `npm run build` (web) | ✅ — main 222 kB / vendor 456 kB (audit target in Phase 7) |
| `npm run test:e2e` (Playwright smoke) | ⚠ Blocked locally: sandbox can't download Chromium binary. Harness boots preview server correctly; will run in CI. |

The previously documented "engine death-handling test failing" issue in `AGENTS.md:139` is **stale** — all 9 engine tests pass. `progress.md` Session 2 was more accurate.

## 2026-05-19 (Session 3 cont.) — Phase 2: Cleanup

**Goal:** Delete orphaned code, dev scratch, and ship-blocking screenshots so the
working tree reflects the actual product surface.

### Deleted
- `backend/` (entire directory) — duplicate `@first-perception/engine` v1.0.0
  with its own lockfile, unreferenced from any `apps/`, `packages/`, `scripts/`,
  root `package.json`, or `vercel.json`. The canonical engine is
  `packages/engine/`.
- Root Ink scratch: `test3.ink`, `test4.ink`, `test5.ink`, `test6.ink`,
  `test7.ink`, `test8.ink`, `test9.ink`, `debug.ink` (31 KB preprocessed
  dump) and the matching `*.ink.json`.
- Root scratch scripts: `check.mjs` (Ink rebind probe), `debug-preprocess.mjs`
  (Ink include flattener).
- Root PNG screenshots: 3 × `current-state-*.png` + 7 × `live-*-1440.png`
  (~4.5 MB total).
- `.playwright-mcp/` (3 Playwright MCP page snapshots).

### Changed
- `.gitignore` — added `.playwright-mcp/` so MCP-driven sessions don't re-leak.
- `.vercelignore` — added `.github/`, `docs/`, `AGENTS.md`, `progress.md`,
  `tests`, `*.test.ts`, `*.spec.ts`, `.playwright-mcp` to keep the deploy
  upload lean.
- `README.md` — rewrote to reflect the actual workspace layout, single
  `npm install` at root, and the active 8-phase roadmap.

### Verify
- `npm run typecheck` ✅ — engine + web.
- `npm test` ✅ — 9/9 engine + 9/9 web.
- `npm run content:compile` ✅.
- `npm run build` ✅ — same bundle sizes (main 222 kB, vendor 456 kB).

The remaining `"backend"` references in `docs/OPTIMIZED_BUILD_AND_DESIGN_PLAN.md`
and historical sections of `progress.md` describe prior architecture; left in
place as history.

## 2026-05-19 (Session 3 cont.) — Phase 3a: Engine hygiene & movement

**Goal:** Close the audio first-command sync gap, harden the JSON-load type
boundary, and remove debug logging that survived from earlier development.

### Reality check

The audit had flagged "locations have no exits — `moveReducer` cannot move
the player." That issue is **stale**. `apps/web/src/data/worldLoader.ts`
already maps exits from `content/world-data/locations.json` into the game
state, and `packages/engine/src/reducers/moveReducer.ts` honors them
(label-or-id matching, visibility/lock gating, travelRisk → DC scaling,
discovery side-effects). The hybrid mechanical-plus-Ink movement model
the audit asked for was already in place. Added a regression test so any
future loader change that drops exits is caught immediately.

### Changes

1. **Audio first-command sync.** `AudioEngine.start()` was fire-and-forget
   — it called `void this.initialize()` and returned immediately, so the
   first `audioEngine.updateFromGameState(game)` in `main.ts` ran on an
   uninitialized engine and was silently dropped. Made `start()` async
   (`packages/audio/src/AudioEngine.ts:67`); the first-click handler in
   `apps/web/src/main.ts:716` now awaits it before calling
   `updateFromGameState`.

2. **Strengthened the JSON-load boundary.** `apps/web/src/data/worldLoader.ts`
   defined every `map*` function with `raw: any[]`, dropping six type
   signals at the seam between authored content and runtime types. Replaced
   with explicit `RawLocation`, `RawExit`, `RawPoi`, `RawFaction`, `RawNpc`,
   `RawSecret`, `RawCondition`, `RawConditionEffect`, `RawItem`, and
   `RawLocked` interfaces. `RawLocked` and `RawConditionEffect` extend the
   shared runtime types so JSON authors can't silently drift the schema.

3. **Stripped debug-only logging.** Removed five `console.log` calls used as
   init pulses (`apps/web/src/main.ts` "LLM layer disabled/initialized",
   "SQLite repository initialized", "Narrative engine ready"), one debug
   dump (`apps/web/src/screens/SettingsModal.ts:292` "Import payload"),
   and one operational log
   (`packages/narrative/src/agents/TurnOrchestrator.ts:321`
   "[TurnOrchestrator] Fallback: ..."). All `console.warn` and
   `console.error` calls remain — Phase 7 will route those through
   Sentry.

4. **Reconciled AGENTS.md "Active Issues".** Items 1–5 were marked with
   their real status (4 of 5 resolved; web smoke is sandbox-blocked but
   runs in CI).

### Verify
- `npm run typecheck` ✅
- `npm test` ✅ — 9/9 engine + **10/10 web** (added exits-integrity spec)
- `npm run build:packages` ✅
- `npm run content:compile` ✅
- `npm run build` ✅ — main 221.84 kB / vendor 455.80 kB

## 2026-05-20 (Session 4) — Phase 3b: Persistence on Vercel + Supabase Postgres

**Goal:** Replace the browser sql.js layer with a Postgres-backed server tier
and the necessary client glue, so the Living World can actually persist across
runs.

### Changes

1. **Schema.** `database/schema.postgres.sql` ships a focused 6-table baseline
   — `save_snapshot`, `world_event`, `npc_memory`, `rumor`, `agent_log`,
   `legacy_record` — with the indexes needed for the runtime queries (location
   recall, importance-ordered NPC memory, recent events, player-known rumors).
   Idempotent (`IF NOT EXISTS`) so `db:migrate` can rerun.

2. **`packages/persistence` rewritten.** sql.js wrapper deleted in full.
   Replaced with:
   - `GameRepository` interface (narrow, only what's actually called)
   - `PostgresRepository` — server-side, uses `pg.Pool` (exported from
     `@first-perception/persistence/server`)
   - `HttpRepository` — browser-side, calls `/api/*` serverless functions
   - `LocalStorageRepository` — browser fallback when the API is unreachable
     (saves + legacies persist; world events / NPC memories are
     session-scoped because cross-run memory genuinely needs the server)
   - `MemoryRepository` — for tests and SSR / non-browser

   The package now has dual exports: `@first-perception/persistence`
   (browser-safe) and `@first-perception/persistence/server` (Node-only,
   pulls in `pg`). The browser entry never reaches the server entry, so
   `pg` cannot leak into the web bundle.

3. **Serverless API at `/api/`.** 11 Vercel functions, all using the shared
   `getRepo()` singleton + `withErrors` wrapper:
   - `GET/POST /api/saves`, `DELETE /api/saves/:id`
   - `GET/POST /api/world-events`
   - `GET/POST /api/npc-memories`,
     `POST /api/npc-memories/:id/recall`, `POST /api/npc-memories/forget`
   - `GET/POST /api/rumors`, `POST /api/rumors/:id/known`,
     `POST /api/rumors/propagate`
   - `GET/POST /api/agent-logs`
   - `GET/POST /api/legacies`
   - `GET /api/health` (used by `HttpRepository.init()` as a DB ping)

4. **Migration script.** `scripts/db-migrate.mjs` reads
   `POSTGRES_URL_NON_POOLING` (preferred) or `POSTGRES_URL`, applies the
   schema, then verifies the six tables exist. Includes a tiny no-dep
   `.env.local` loader. `npm run db:migrate` (`-- --dry-run` to preview).

5. **Web boot wiring.** `apps/web/src/main.ts` tries `HttpRepository` first,
   falls back to `LocalStorageRepository` if `/api/health` fails, leaves
   `repo = null` only if both fail. `WorldContextAssembler` and
   `TurnOrchestrator` now take a `GameRepository` instead of a concrete
   `SqliteRepository` — matching changes in `FactionSubagent`,
   `NPCSubagent`, `TurnOrchestrator`, `WorldContextAssembler`.

6. **Vercel config.** API routes live at `/api/` (project root); Vercel
   auto-detects them. `api/tsconfig.json` typechecks them under
   `module: NodeNext` so `.js`-suffixed relative imports work as intended
   for Node serverless functions.

7. **Env handling.** `apps/web/.env.example` is the committed template;
   `apps/web/.env.local` (gitignored) holds real credentials for local
   migration. **The Supabase credentials shared in chat must be rotated**
   (`SUPABASE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_JWT_SECRET`,
   `POSTGRES_PASSWORD`) — instructions in `docs/POSTGRES_SETUP.md`.

8. **Docs.** `docs/POSTGRES_SETUP.md` covers: provisioning via Vercel +
   Supabase integration, local migration, fallback semantics, credential
   rotation, backups, and how to add future migrations.

### Verify

- `npm install` ✅ — `pg`, `@types/pg` added; 102 packages, 0 vulns
- `npm run typecheck` ✅ — persistence + engine + web + `api/`
- `npm test` ✅ — **23/23**: 4 persistence + 9 engine + 10 web
- `npm run build:packages` ✅ — all 7 packages
- `npm run build` ✅ — **main 167.68 kB / vendor 455.80 kB** (was
  221.84 kB main; sql.js elimination saved ~54 kB raw / ~18 kB gzipped)
- `grep "pg\|sql\.js\|sqljs" apps/web/dist/assets/main-*.js` → 0 hits.
  `pg` does not leak into the browser bundle.

### What did NOT run yet

`npm run db:migrate` against the real Supabase instance is blocked from
this sandbox — outbound TCP to ports 5432 and 6543 both time out. The
migration script and connection string have been smoke-tested via the
env loader; the failure is purely the sandbox's egress policy. Run
`npm run db:migrate` from your local machine (or from a Vercel build
hook once deployed) and the six tables will appear in Supabase.

## 2026-05-20 (Session 4 cont.) — Phase 3c: Claude + Kimi via `/api/llm` proxy

**Goal:** Get LLM keys out of the browser. The web client must never hold a
provider API key. All Claude and Kimi traffic goes through a Vercel serverless
proxy that reads keys from server env vars and dispatches.

### Changes

1. **`LLMClient` interface.** New abstract surface (`complete`, `stream`,
   `chat`) lives at `packages/llm-client/src/LLMClient.ts`. All narrative
   subagents now accept this interface instead of the concrete
   `KimiClient` — `TurnOrchestrator`, `NPCSubagent`, `GMNarrator`,
   `FactionSubagent` were all updated.

2. **Two server-side adapters.** Both implement `LLMClient`:
   - `AnthropicClient` — `packages/llm-client/src/AnthropicClient.ts`.
     Talks to `api.anthropic.com/v1/messages`. Translates our
     OpenAI-shaped `LLMRequest` into Anthropic's `system + messages`
     format. Streaming parses `message_start` / `content_block_delta` /
     `message_delta` / `message_stop` SSE events. Tier map:
     `fast → claude-haiku-4-5-20251001`, `balanced → claude-sonnet-4-6`,
     `deep → claude-opus-4-7`. Circuit breaker + retry + 4xx short-circuit.
   - `MoonshotClient` — `packages/llm-client/src/MoonshotClient.ts`.
     Replaces the old `KimiClient`; OpenAI-compatible wire, so the
     adapter is thin. `export const KimiClient = MoonshotClient` keeps
     one phase of import compatibility for anything I missed.

3. **`ProxyLLMClient`.** Browser-side `LLMClient` that POSTs envelopes
   to `/api/llm` and reads SSE from `/api/llm/stream`. Surfaces the
   chosen provider + failover breadcrumb via `lastMeta` so callers can
   attribute latency. Configurable `provider` override (`auto` | `claude`
   | `kimi`).

4. **Dual exports.** `@first-perception/llm-client` now exposes the
   browser-safe surface only. Server adapters live at
   `@first-perception/llm-client/server`. Keeps Anthropic + Moonshot
   URLs out of the web bundle.

5. **Two serverless functions.** Both share `api/_lib/llm-router.ts`
   for provider resolution + tier-to-model normalization:
   - `POST /api/llm` — non-streaming completion. Returns the standard
     `ApiResponse<LLMResponse>` envelope. Auto-failover (Claude → Kimi)
     for transient primary errors when `provider === "auto"`. Decorates
     response with `x-llm-provider` and `x-llm-failover-from` headers.
   - `POST /api/llm/stream` — SSE proxy. Forwards token chunks framed
     as `data: {json}\n\n` lines. No mid-stream failover (would scramble
     output); callers wanting durability use the non-streaming route.

6. **Browser-side cleanup.** `apps/web/src/main.ts` swapped
   `KimiClient({ apiKey })` → `new ProxyLLMClient()`. Deleted
   `loadApiKey`, `saveApiKey`, `API_KEY_STORAGE_KEY`, and the boot-time
   `localStorage.getItem("the-first-perception.moonshot-api-key")`
   plumbing. `SettingsModal` lost its `apiKey` prop, `onApiKeyChange`
   callback, the password input, and the "Moonshot API Key" label;
   replaced with a single explanatory note that points the player at
   the server config.

7. **Tests.** New `ProxyLLMClient.test.ts` (4 specs) stubs `fetch` to
   verify: POST envelope shape, response unwrapping, failover meta
   propagation via response headers, SSE chunk parsing + final usage
   capture, and `ProxyLLMError` on non-2xx. `tests/llm-client.test.ts`
   updated to import `MoonshotClient` + `AnthropicClient` from the
   server entry (browser entry no longer re-exports them).

### Verify

- `npm run typecheck` ✅ — persistence + engine + web + api
- `npm test` ✅ — **50/50** (27 llm-client + 4 persistence + 9 engine
  + 10 web). +27 specs net.
- `npm run build:packages` ✅
- `npm run build` ✅ — main 166.39 kB / vendor 455.80 kB (vs Phase 3b's
  167.68 kB main). Effectively flat — `ProxyLLMClient` is roughly the
  same size as the deleted `KimiClient`.
- `grep "api\.anthropic\.com\|api\.moonshot\.cn\|ANTHROPIC_API_KEY\|MOONSHOT_API_KEY\|sk-ant" dist/main-*.js`
  → **0 hits**. No provider URLs, no key patterns reach the browser
  bundle.

### What's required to actually exercise the proxy

1. Set `ANTHROPIC_API_KEY` and/or `MOONSHOT_API_KEY` in Vercel Project
   Settings → Environment Variables. `apps/web/.env.example` already
   lists them; copy to `.env.local` for local dev.
2. With at least one key set, `npm run dev` (Vite) + `vercel dev`
   (Vercel CLI) on the same port lets the browser hit `/api/llm`
   locally. Vite's dev server doesn't run serverless functions; pair
   it with `vercel dev` for the full stack.
3. Enable "Living World (LLM)" in the in-game Settings drawer. The
   proxy resolution order is: explicit `claude` / `kimi` override
   from the request envelope → ANTHROPIC_API_KEY → MOONSHOT_API_KEY →
   503 with `code: "unavailable"`.

## 2026-05-20 (Session 4 cont.) — Phase 3d: Living World wiring

**Goal:** Get the parser, the Ink externals, and the WorldEvent writeback
loop in place so future runs (and the LLM context assembler) can actually
refer to what happened in earlier turns.

### Changes

1. **LLM-first intent classifier.** New
   `packages/llm-client/src/IntentClassifier.ts`:
   - Async `classify(command)` → `{verb, target, domain, reducer,
     confidence, source}`. Always resolves. Calls the LLM at `model: fast`
     with a strict JSON system prompt; falls back to regex on any error,
     missing client, or sub-threshold confidence (default 0.55).
   - LRU cache (default 200 entries) keyed by lowercased command text.
   - Bounded by a default 800 ms abort; never blocks a turn.
   - Companion `regexClassify(command)` for the pure-fallback path.

2. **Orchestrator hookup.** `apps/web/src/main.ts` now awaits
   `intentClassifier.classify(trimmed)` before dispatching reducers:
   - When `intent.source !== "regex"` it dispatches by the classified
     `reducer` field (the LLM picked it).
   - When `intent.source === "regex"` it keeps the original
     keyword-table dispatch so the locked-in test behaviour doesn't
     drift.
   - The classifier is constructed without a client by default and
     re-wired with the proxy client when the Living World toggle flips
     on (so a regex turn never hits the network).

3. **Ink externals: `recall` + `llm_generate`.** New
   `packages/narrative/src/WorldMemoryCache.ts` is the bridge between
   the async persistence / LLM layer and Ink's synchronous external
   calls. `InkBridge` binds two new functions:
   - `recall(location_id)` → reads from cache, falls back to "Nothing
     in particular comes to memory here." when cold.
   - `llm_generate(prompt)` → reads from cache, falls back to a
     deterministic fragment (hash → small pool) so authored content
     never crashes when the LLM is offline.
   Real async-aware Ink generation (cache pre-warm + async resume)
   lands in Phase 6 immersion; the binding contract is locked now so
   content authors can start using `~ temp x = recall("loc-fountain")`
   today.

4. **`NarrativeEngine.prepareWorldMemory(game, {repo})`.** Pre-warms
   the recall cache for the current location by reading recent
   `world_event` rows via the repo and summarizing them into a
   three-event recall string ("Something happened here, once…"). Called
   before every `processCommand`. Best-effort: persistence outages
   leave the cache cold and the deterministic fallback fires instead.

5. **WorldEvent writeback.** New `apps/web/src/data/worldEvents.ts`
   holds `buildWorldEvent(game, command, result, campaignId)` +
   `buildFactionWorldEvent(...)` + `deriveCampaignId(game)`. After each
   resolved turn, `main.ts` persists the player's outcome via
   `repo.recordEvent(...)`. When a TurnOrchestrator faction pulse
   fires, that gets written as a second `WorldEvent` row so cross-run
   faction memory compounds. Best-effort — wrapped in try/catch and
   never blocks the save path.

6. **Narrative package now depends on persistence.** `NarrativeEngine`
   needs `GameRepository` + `WorldEvent` types for `prepareWorldMemory`.

### Verify

- `npm run typecheck` ✅ — persistence + llm-client + narrative +
  engine + web + api
- `npm test` ✅ — **64/64**: 35 llm-client (+8 IntentClassifier) +
  6 narrative (new WorldMemoryCache) + 4 persistence + 9 engine + 10 web
- `npm run build:packages` ✅
- `npm run build` ✅ — main 175.24 kB / vendor 455.80 kB (vs Phase 3c
  166.39 kB main; +8.85 kB for the classifier + cache + writeback
  helpers)
- `grep "anthropic\|moonshot\|sk-ant\|pg-types\|postgres://" dist/main-*.js dist/vendor-*.js`
  → 0 hits. The browser still holds no provider URLs, no keys, no
  Postgres driver.

### What's not in this push

- **Async-aware `llm_generate` mid-Ink.** Ink externals are
  synchronous; making `llm_generate` actually call the LLM mid-passage
  needs either Ink AST pre-analysis (scan the next passage for
  `llm_generate(...)` calls, batch them, await, then resume) or a
  pause-resume control flow. Both are too disruptive for Phase 3d.
  The binding is in place; the cache is in place; Phase 6 will wire
  the orchestrator's pre-warm path.
- **`recall(location_id, limit=5)` with a custom limit from Ink.** The
  external currently ignores extra args. The cache stores one summary
  per location; per-call limits would need either multiple cache keys
  or a richer cache value. Defer.

## 2026-05-20 (Session 5) — Phase 4: Test coverage

**Goal:** Stop relying on the one big legacy spec file. Every reducer, every
repo, the narrative pre-warm path, the LLM client + classifier all need
dedicated specs so future refactors get caught instead of slipping through.

### Changes

1. **Engine reducer specs.** New `packages/engine/tests/reducers.spec.ts`
   (14 specs) covering every reducer in `packages/engine/src/reducers/`:
   move (success path, hidden exit rejection, no-exit feedback), rest,
   combat (target + surrender), dialogue, investigation, item (inspect +
   drop), condition (tick + no-op), death (gameOver + no-op). Shared
   fixture in `packages/engine/tests/fixtures.ts` builds `GameState`
   with controllable seeds so rolls stay deterministic. Asserts
   structural effects (patches, narrative non-empty, suggestions
   present) without locking in authored prose.

2. **Persistence repo specs.** New
   `packages/persistence/src/HttpRepository.test.ts` (8 specs) stubs
   `fetch` to verify request URL/method/body for saves, world events,
   NPC memory; checks header propagation; asserts `HttpRepositoryError`
   on 503. New `packages/persistence/src/LocalStorageRepository.test.ts`
   (6 specs) installs a `MemoryStorage` shim onto `globalThis.localStorage`
   to round-trip save slots, legacies, and verify the
   `forgetOldMemories` filter respects the `isCoreMemory` / importance
   gates.

3. **NarrativeEngine integration spec.** New
   `packages/narrative/src/NarrativeEngine.test.ts` (4 specs) verifies
   `prepareWorldMemory` actually populates the recall cache from a
   `MemoryRepository`, falls back gracefully when no repo is provided,
   swallows repo errors so a persistence outage cannot block a turn,
   and uses the generic fallback when zero events exist.

4. **Coverage tooling.** Added `@vitest/coverage-v8` to every test
   workspace (persistence, llm-client, narrative, engine, web) and a
   `test:coverage` script. Root `npm run test:coverage` runs the
   v8 reporter across all five. Thresholds are **not enforced in CI
   yet** — current numbers (engine 56.14% lines, persistence 28.68%
   lines — the latter inflated by the un-mockable PostgresRepository
   that needs a real Postgres) make a CI gate premature. Phase 5
   polish will pick a defensible floor once we settle on how to mock
   `pg`.

5. **Playwright smoke refresh.**
   `apps/web/tests/smoke.mjs`: dropped the now-stale sql.js / WASM
   error suppression; added a soft "title-screen exit path" check after
   the gameplay loop; tolerates `/api/health` 503s (preview server
   doesn't run serverless functions, so the localStorage fallback fires
   — expected, not a regression). Death-and-legacy still needs a
   purpose-built dev hook to force HP→0 deterministically; deferred to
   Phase 5.

### Test counts

| Workspace      | Before | After | Delta |
|----------------|-------:|------:|------:|
| persistence    |      4 |    18 |   +14 |
| llm-client     |     35 |    35 |     0 |
| narrative      |      6 |    10 |    +4 |
| engine         |      9 |    23 |   +14 |
| web            |     10 |    10 |     0 |
| **Total**      |     64 |    96 |  **+32** |

### Coverage (advisory baseline)

| Workspace        | Lines   | Branches | Funcs   |
|------------------|--------:|---------:|--------:|
| engine           | 56.14%  | 63.49%   | 51.14%  |
| persistence      | 28.68%  | 80.80%   | 51.80%  |

Engine: the lower number is the historical `CharacterCreation`,
`RulesEngine`, `StateEngine`, `WorldSimulation` modules — they're
exercised by the integration spec but every code path is not. Reducer
files now sit between 60–100% lines.

Persistence: 28.68% looks bad but the runtime impls
(`MemoryRepository`, `HttpRepository`, `LocalStorageRepository`) are
fully exercised. `PostgresRepository` (~330 LOC of pg-driver glue)
needs either a pg-mem mock or an integration test against a real
Postgres — Phase 5 decision point.

### Verify

- `npm run typecheck` ✅ — persistence + llm-client + narrative +
  engine + web + api
- `npm test` ✅ — **96/96**
- `npm run test:coverage` ✅ — runs end to end; thresholds advisory
- `npm run build:packages` ✅
- `npm run build` ✅ — main 175.24 kB / vendor 455.80 kB (unchanged)

## 2026-05-20 (Session 5 cont.) — Phase 5: Polish & docs

**Goal:** Stop the documentation drift before Phase 6's UI rewrite, replace
direct `console.warn` / `console.error` calls with a pluggable sink so
Phase 7's Sentry hook can drop in without touching call sites, and split
the obvious extractables out of the 899-line `apps/web/src/main.ts`.

### Changes

1. **Pluggable logger.** New `packages/types/src/logger.ts` exports
   `Logger` + `LogLevel` + `LogContext` types, a `ConsoleLogger`
   default impl, and `getLogger()` / `setLogger()` / `resetLogger()`
   helpers. Re-exported from `@first-perception/types`. Phase 7's
   Sentry hook calls `setLogger(sentryLogger)` and every existing call
   site benefits without changes.

2. **Migrated all `console.warn` / `console.error` to the logger** in
   shipped code:
   - `packages/narrative/src/ContentLoader.ts` (1 site)
   - `packages/narrative/src/agents/*.ts` (5 sites across NPCSubagent,
     TurnOrchestrator, GMNarrator, FactionSubagent)
   - `packages/audio/src/AudioEngine.ts` (1 site)
   - `apps/web/src/main.ts` (9 sites — all narrative / LLM / writeback
     / boot errors)

   `console.log` sites (debug) were already removed in Phase 3a; what
   remains in shipped code is the `ConsoleLogger` impl itself plus
   `console.debug` inside the test runner harness — both intentional.

3. **`apps/web/src/main.ts` decomposition.** Pulled two extractable
   islands out:
   - `apps/web/src/data/idbSaves.ts` — `openDB`, `getSaveSlots`,
     `writeSaveSlot`, `deleteSaveSlot`, `readSaveSlot`. The old inline
     `onLoadState` handler that reached into `db.transaction(...)`
     directly was replaced with the new `readSaveSlot()` helper.
   - `apps/web/src/data/legacyHistory.ts` — `loadLegacyHistory`,
     `saveLegacyHistory`. The `MAX_LEGACIES = 20` cap is now a named
     constant instead of a magic number.

   `main.ts` went from 899 → 826 lines. `runCommand` and the screen
   renderers are still inline; extracting them needs a shared
   services-locator module, deferred to Phase 7 alongside the
   streaming / Sentry refactor.

4. **`AGENTS.md` fully reconciled.** Rewritten end-to-end. Drops every
   stale section (sql.js, sqljs WASM, per-user API keys, the "death
   handling test is failing" claim, etc.). New "Critical Conventions"
   covers logging, the dual-export discipline, the per-turn state flow
   diagram, the `recall` / `llm_generate` Ink externals. New "Known
   Traps" reflects what's actually risky now (exits in JSON not code,
   browser must not import `*/server`, `prepareWorldMemory` is
   best-effort).

5. **`LICENSE`** — MIT, repo-wide.

6. **`CONTRIBUTING.md`** — branch naming, the verify gate, commit
   style, workspace layout, the "never `console.log`" + "never import
   `*/server` from `apps/web/**`" rules, how to run with `vercel dev`,
   how to add a new package.

### What's deferred

- **Coverage gate in CI.** Numbers from Phase 4 (engine 56%,
  persistence 28%) need either a pg-mem mock or a real test DB before
  a defensible floor lands. Moved to Phase 7.
- **`apps/web/src/main.ts` runCommand + renderer extraction.** Requires
  a services-locator module to thread `repo`, `audioEngine`,
  `narrativeEngine`, `turnOrchestrator`, `intentClassifier` through
  the dispatch path. Phase 7.
- **Bundle audit + tree-shake check.** Phase 7 brings the `200 kB
  main chunk` CI budget, which subsumes this.
- **README architecture diagram.** Phase 6 will rewrite the README as
  part of the UI/identity pass.

### Verify

- `npm run typecheck` ✅ — persistence + llm-client + narrative +
  engine + web + api
- `npm test` ✅ — **96/96** (no regressions)
- `npm run build:packages` ✅
- `npm run build` ✅ — main **175.99 kB** / vendor 455.80 kB (+0.75 kB
  for the logger shim and the two new data/ imports; effectively flat)
- `grep` for leaks → 0 hits, as expected
- `apps/web/src/main.ts` 899 → **826 lines** (−73)

## 2026-05-20 (Session 6) — Phase 6 (part 1): Occult-grimoire surface

**Goal:** Stop reading like a SaaS dashboard. Land the high-leverage
visual + diegetic changes without touching the test surface. The
cinematic ceremonies (title coalesce, death rite, legacy stone
register) need bespoke gsap work and go in Phase 6b.

### Changes

1. **Grimoire token layer** added to `packages/ui-system/src/styles.css`.
   Imports Cormorant Garamond on top of Inter + Cinzel. New tokens:
   ember (warm punctuation), sigil-gold (revelation), bone (parchment
   body), ink (deeper void), whisper (desaturated voice). New
   `--grimoire-grain` SVG-noise data URL applied via `.grimoire-grain`.
   New `ember-breathe` keyframe with reduced-motion respect.

2. **Tale rendering refinements** in `apps/web/src/styles.css`:
   - Tale-panel gets the soft paper grain scoped to reading area.
   - Cormorant for tale body + heading; Inter for chrome.
   - Per-tone: **danger** glows ember + ember halo at right margin;
     **warning** italicizes body + sigil-gold heading; **success**
     adds a sigil-gold left edge; **cosmic** twilight italic;
     **whisper** indents + dims.
   - Soft turn dividers (centered hairline `·`) between entries.
   - Quick-action chips render as italic inner thoughts (em-dash
     prefix, sigil-gold hover).
   - Tab labels join Cormorant; active tab tints sigil-gold + glow.

3. **Status meter reskin** — `Meter` accepts `kind` + `diegeticLabel`.
   CSS targets `.meter[data-kind=...]`: HP = wax seal (ember radial),
   focus = candle (sigil-gold vertical gradient), danger = tide line.
   Meter labels join Cormorant italic.

4. **Turn pill** carries `data-danger` (low/mid/high/extreme) from
   `world.danger`. CSS pulses with `ember-breathe` at ≥55, faster at
   ≥80.

5. **Diegetic copy sweep** — every literal label is renamed in-world
   with the original preserved as `title` tooltip:
   - Tabs: Tale → "The Unfolding"; Status → "The Vessel"; etc.
   - CommandDock: "Submit" → "Speak it"; placeholder → "Speak. The
     world is listening."
   - GameplayScreen: Save → "Bind", Load → "Recall", Title →
     "Withdraw".
   - TitleScreen: Begin → "Awaken", Continue → "Resume the watch",
     Settings → "The Lens", Legacy → "The Register".

6. **`Meter` HTML** got a `.meter-fill` class on the inner span so the
   per-kind CSS reliably attaches.

7. **`README.md` rewritten** for the new identity.

### Deferred to Phase 6b (cinematic ceremonies)

- Title-particle coalescing
- Death ceremony (ash drift, audio decay, epitaph reveal, "The Record
  Closes" with glow)
- Legacy stone register
- Slow-reveal text on tale entries + auto-scroll "↓ new" pill

### Verify

- `npm run typecheck` ✅
- `npm test` ✅ — 96/96 (no regressions; tests assert behaviour, not
  prose)
- `npm run build:packages` ✅
- `npm run build` ✅ — main **177.24 kB** / css **31.71 kB**
  (vs Phase 5: 175.99 / 25.21). +1.25 kB JS, +6.5 kB CSS, +1.3 kB
  gzipped CSS for the grimoire override layer.
- Leak grep → 0 hits.

## 2026-05-20 (Session 6 cont.) — Phase 6b: Cinematic ceremonies

**Goal:** Land the four pieces deferred from 6.1 — title-particle coalesce,
death rite, legacy stone register, slow-reveal tale + auto-scroll pill —
without breaking the test surface or hurting headless smoke timing.

### Changes

1. **Title coalesce.** `TitleScreen` now wraps each character of "The
   First Perception" in a `.title-letter` span (aria-hidden; the H1
   carries the readable label). gsap scatters each letter to a random
   offset + rotation + blur, then settles them with a `stagger: random`
   over ~1 s. Eyebrow / lede / nav fade in once the letters have
   landed, so the page looks like the title is *settling out of the
   particles*. `prefers-reduced-motion` + the in-app
   `data-reduced-motion` attribute skip the choreography.

2. **Death rite.** `DeathScreen` now:
   - Mounts a denser ash `ParticleCanvas` (density 5 vs the title's 3).
   - Splits "The Record Closes" into `.title-letter` spans with a
     sigil-gold underline that "carves" beneath the heading.
   - Types the epitaph in letter-by-letter (~600 ms reveal at
     ~15 ms/char) in italic sigil-gold.
   - Calls `onMount?.()` after the DOM lands so the orchestrator can
     decay master audio in parallel.
   - Renames the actions: "Begin New Run" → "Awaken again", "Return to
     Title" → "Close the volume".
3. **Audio fade hook.** New `AudioEngine.fadeOut(durationSec = 2.5)`
   ramps master volume to `-Infinity` and suspends the AudioContext.
   `apps/web/src/main.ts` wires this into `renderDeath()` via the new
   `onMount` prop — fire-and-forget, errors swallowed so a never-
   started audio engine doesn't mar the screen.

4. **Legacy as stone register.** `LegacyScreen` replaces the card
   layout with a CSS grid of `.legacy-slab` tiles. Each slab is
   keyboard-reachable (`tabindex="0"`), has the paper-grain overlay,
   inset shadow + sigil rune top-right, and reveals a detail tray on
   hover/focus-within (final location, region danger at death,
   inheritance, advantage, altered factions). Header: "The Chain of
   Lives" → "The Register"; empty state reads "The page is blank.
   Nothing has died here yet." Action: "Return to Title" → "Close the
   volume".

5. **Slow-reveal tale + auto-scroll pill.** `TalePanel` rewritten to
   render incrementally:
   - Tracks `renderedIds: Set<string>`; first render seeds the set and
     scrolls to bottom.
   - On update, computes the diff — new entries get appended to the
     DOM and animated in via `gsap.from({ y: 12, opacity: 0,
     stagger: 0.08 })`.
   - If the reader was within ~80 px of the bottom when the turn
     resolves, auto-scrolls; otherwise drops a sticky
     `.tale-recall-pill` ("Something just happened ↓") at the bottom
     of the panel. Click snaps to bottom + dismisses the pill.
   - A `pruneStale` path covers loads / state restores where the tale
     contents shrink or replace.

### Verify

- `npm run typecheck` ✅ — persistence + llm-client + narrative +
  engine + web + api
- `npm test` ✅ — **96/96** (DOM changes are behind `aria-label`s and
  don't touch the JS state surface the tests assert on)
- `npm run build:packages` ✅
- `npm run build` ✅ — main **182.11 kB** / css **36.90 kB**
  (vs Phase 6.1: 177.24 / 31.71). +4.87 kB JS for the four ceremonies
  (mostly TalePanel rewrite + DeathScreen logic + LegacyScreen slabs);
  +5.19 kB CSS (~+0.80 kB gzipped) for the new keyframes, slab styles,
  recall pill, death glow + underline.
- Leak grep → 0 hits.

### Phase 6 complete

Combined Phase 6 (6.1 + 6b) totals: **+8.12 kB JS, +11.69 kB CSS**
across the surface. Tests still 96/96. The game now looks and reads
as an artifact from the world — diegetic copy across every screen,
type pairing settled on Cormorant + Inter, paper-grain texture where
the player reads, per-tone tale typography, in-world meters, title
particles coalescing into letters, a death rite with letter-by-letter
epitaph + audio fade, and a stone-register legacy view.

## 2026-05-20 (Session 7) — Wave 1: Tabletop-depth refactor (additive units)

Context: user asked us to step back and add real tabletop depth — DnD
5e mechanics layered on top of the existing 9-stat cosmic-horror
system, a true character sheet, full inventory with rarity / forging,
and a fix for the story engine. Original Phase 7/8 work (Sentry,
streaming, Lens, Witness Briefing) deferred to Phase 11 so depth
lands first.

Three decisions locked before dispatch (see
`docs/RESTRUCTURE_PLAN.md`):

1. **Layered 5e** — keep the 9 stats; add advantage / disadvantage,
   action economy, dice expressions, item rarity, attunement, the
   SRD conditions, proficiency bonus, hit dice, saving throws,
   conditional spell slots on top.
2. **Story engine issues to fix** — command parser misroutes, Ink
   scene routing, narrative/mechanics desync. LLM fallback
   aggressiveness is fine.
3. **Execution** — hybrid. Six additive units dispatched in parallel
   via worktree-isolated background agents; the foundation work
   (schema, reducer rewrites, screen wiring) serialises as Phase
   7–11.

### Wave 1 units landed

All six PRs merged into `claude/codebase-audit-plan-n0dx0`. Sentinel
strategies (sentinel-fenced CSS appends, additive-only re-exports)
prevented most collisions; the engine `index.ts` and `styles.css`
appends each needed one local rebase to resolve overlapping append
points.

| # | Unit | PR | Adds | New tests |
|---|---|---|---|---|
| 1 | Dice expression engine | #1 | 304 | 20 |
| 2 | Item rarity + forging | #4 | 1264 | 33 |
| 3 | 5e condition catalog + resolver | #5 | 1802 | 33 |
| 4 | CharacterSheetPanel | #3 | 863 | 6 |
| 5 | InventoryPanel | #2 | 643 | 9 |
| 6 | Design docs + authoring guides | #6 | 1093 | 0 |

**~5,969 additions, ~101 new tests, zero CI failures, zero review
threads.** Engine tests went 76 → 109 (5 specs added); web tests
went 10 → 25 (2 specs added).

### Wave 1 follow-up: story-engine bugfixes (#7)

Unit 6's documentation pass surfaced three concrete reducer bugs
while compiling `docs/STORY_ENGINE_AUDIT.md`. Small enough to land
surgically before Phase 8d's systemic work.

- `moveReducer.ts:92` — operator-precedence bug; Silent Passage
  fired on any strong/critical success regardless of `isSneak`.
- `combatReducer.ts:49-55` — silent retaliation on failure band;
  damage applied without tale mention.
- `combatReducer.ts:56-61` — Graze decremented
  `/npcs/<idx>/stats/body` (permanent ability score) instead of
  `/hp`. Every partial-success in combat permanently weakened the
  NPC's stat block.

Plus 4 new regression specs (`reducer-bugfixes.spec.ts`) sweeping
50–200 seeds per case. 113/113 engine tests green.

### Verify

- `npm run typecheck` ✅ across packages + apps/web + api.
- `npm --prefix packages/engine test` ✅ — 113/113 (76 pre-existing +
  4 Wave 1 specs adding 33+22+11+33 = 99 new across dice / forging
  / rarity / conditions, 5 reducer-bugfix; the 76 baseline already
  included reducers.spec which still passes).
- `npm --prefix apps/web test` ✅ — 25/25 (10 baseline + 6
  character-sheet + 9 inventory).
- `npm run build:packages` ✅.
- `npm run build` ✅. Bundle leak grep → 0.

### Known integration debt for Phase 7

- **Type mirrors to consolidate.** Unit 2 ships
  `packages/engine/src/items-5e-types.ts` (byte-identical mirror of
  `packages/types/src/items-5e.ts`); Unit 3 inlines a copy of
  `conditions-5e` contracts inside
  `packages/engine/src/condition-effects-5e.ts`. Both forced by the
  Wave 1 invariant "do not edit `packages/types/src/index.ts`" +
  `@first-perception/types` having no subpath exports. Phase 7
  deletes both mirrors and re-points the engine to canonical types.
- **Test environment divergence.** Unit 4 ships a hand-rolled DOM
  shim inside `character-sheet-panel.spec.ts`; Unit 5 adds
  `happy-dom` to `apps/web` devDeps. Phase 8a picks one.
- **Story engine — synthetic-jump drift.** Unit 6's static pass found
  zero dead `-> name` jumps across 64 knots / 54 targets. The real
  drift risk is in synthetic suffixes like `dialogue_${npcId}`,
  `combat_${encounterId}`, `consequence_${consequenceId}` that the
  Ink runtime constructs from runtime ids. Phase 8c owns the
  validator.

### Phase 7–11 forward queue

These were planned to ship as Phase 7 / 8 (Sentry, streaming, Lens)
but now run after the tabletop-depth foundation lands. Order is
dependency-driven, not vibes; each phase's outputs unblock the next.

- **Phase 7 — Schema foundation + type-mirror consolidation.**
  Extend `Player` with `proficiencyBonus`, `hitDice` (current/max),
  `savingThrowProficiencies`, `attunementSlots`, optional
  `spellSlots`. Extend `Item` with `rarity: RarityTierId`,
  `magical: boolean`, `attunement: AttunementRequirement`,
  optional `requires`. Merge Unit 2's `items-5e.ts` and Unit 3's
  `conditions-5e.ts` types into canonical `Item` / `Condition` via
  `packages/types/src/index.ts`. Delete the engine mirrors. Update
  `createGameFromCreation` + `buildStats`. The content-loading
  pattern in the engine gets a real loader (replacing Unit 2's
  frozen-const fallback).
- **Phase 8a — UI wiring + tab redesign.** Wire
  `CharacterSheetPanel` and `InventoryPanel` into `GameplayScreen`
  as new tabs "The Sheet" (replaces "The Vessel" as primary
  character view) and "The Trove" (inventory). Unify the test
  environment (pick `happy-dom`; remove the DOM shim). Pass real
  proficiency / hit dice / AC values from the post-Phase-7 Player.
- **Phase 8b — Command parser fix.** Tighten
  `packages/llm-client/src/IntentClassifier.ts` regex map at L70 +
  hints at L80; tighten the LLM JSON prompt at L61; add the
  parser-regression spec set. Verb synonyms `pick up` / `grab` /
  `pocket` / `cut` / `pay` / `whisper` / `bind` should route to the
  intended reducer instead of `narrative_only`.
- **Phase 8c — Ink synthetic-jump validator.** Build
  `scripts/validate-content.mjs` (the `package.json` already
  references it but it's missing on disk). Walks every scene,
  collects every static and synthetic jump construction site,
  verifies the target knot exists or is a known-safe template.
  Wired into `npm run verify`.
- **Phase 8d — RollBand enum + cross-reducer consistency.**
  Introduce `RollBand` (`critical-fail` / `miss` / `partial` /
  `success` / `critical-success`); every reducer must classify into
  one band per turn; every emitted tale entry must come from a
  band-appropriate template. Add `tale-band-consistency.spec.ts`.
  Catches the rest of the narrative/mechanics desync class
  systemically. Bugs from the Wave 1 follow-up (#7) are precedent
  fixtures.
- **Phase 9 — Forging UI + combat rewrite.** New "The Anvil" view
  surfaces inventory materials, valid recipes, smith roll
  prompts, success / partial / failure prose. Combat reducer
  rewritten to use `parseDiceExpression` + `rollDice` (Unit 1) and
  5e action economy (action + bonus action + reaction); decision
  on per-day vs. focus-cost recharge model carries through.
- **Phase 10 — Spell / ability system.** Scope limited to postures
  / forms that explicitly grant casting. Spell slots, prepared
  lists, save DCs derived from the new proficiency bonus + relevant
  9-stat. Skipped if no posture is finalised as a caster by Phase 9.
- **Phase 11 — Original Phase 7+8 deliverables.** Sentry wiring,
  streaming LLM tokens through the SSE proxy, bundle budget gate in
  CI, "The Lens" settings drawer, Witness Briefing first-run
  overlay, accessibility hardening, contextual tab reveals.

### What's still ahead

- **Phase 7** — see above.

---

## 2026-05-20 (Session 8) — Phase 7: Schema foundation + mirror consolidation

Foundation pass that lifts the Wave 1 type mirrors and ships the
canonical 5e-augmented `Player` and `Item` shapes. Sets up the
clean type surface Phase 8a's panel wiring, Phase 9's combat
rewrite, and Phase 10's spell system all build on.

### Pre-flight: optimization + planning
- Merged the Wave 1 follow-up PR #7 (three reducer bugfixes) into
  the integration branch `claude/codebase-audit-plan-n0dx0`.
- Deleted 7 stale local feature branches.
- Added `--passWithNoTests` to `packages/ui-system` and
  `packages/audio` test scripts so a future CI gate can fan out
  across every workspace uniformly.
- Captured `docs/BASELINE_METRICS.md` — the post-Wave-1 floor every
  subsequent phase reports a delta against.
- Captured `docs/PHASE_7_PUNCH_LIST.md` — the starting brief for
  this session. Includes verified Player + Item consumer maps,
  exact mirror-import sites, the export-strategy decision tree, and
  honest correction of a research-agent finding about
  `StateEngine.ts:1094` that turned out to be a false alarm (it's a
  validator on `player.stats`, not on `player`, so Phase 7
  additions don't enter the loop).

### What landed in Phase 7

**Types package surface.**
`packages/types/src/index.ts` now re-exports the 5e ruleset types
(`RarityTierId`, `RarityTier`, `AttunementRequirement`,
`ForgeRecipe`, `ForgeOutcome*`, the seven `Condition5e*` shapes,
and `ResolvedConditionEffects`) through its main entry. No
subpath exports needed; the `@first-perception/types` import path
stays single-entry. Verified no name collisions with the existing
exports before the re-write.

**Mirror deletion.** Both Wave 1 mirrors are gone:
- `packages/engine/src/items-5e-types.ts` deleted (was a
  byte-identical copy of the canonical, stripped of JSDoc); five
  consumer imports re-pointed to `@first-perception/types`
  (`engine/src/index.ts`, `item-rarity.ts`, `forging.ts`, plus the
  two engine spec files).
- The inline `Condition5e*` type block at the top of
  `packages/engine/src/condition-effects-5e.ts` (lines 19–97 of
  pre-Phase-7) replaced with a single `import-and-re-export` from
  `@first-perception/types`. The re-export pattern keeps the
  conditions-5e spec's bundled `import { fn, type Foo }` style
  working without touching the spec.

**Player schema extension.** Five new fields on the canonical
`Player` in `packages/types/src/index.ts`:
- `proficiencyBonus: number` (default 2; Phase 9 wires growth).
- `hitDice: HitDicePool` — `{ current, max, die }` with `die ∈ d6 | d8 | d10 | d12`.
- `savingThrowProficiencies: ReadonlyArray<CoreStat>` — empty by
  default; Phase 10 / posture system populates.
- `attunementSlots: AttunementSlots` — `{ used, max }`; max defaults to 3.
- `spellSlots?: Record<number, SpellSlotLevel>` — optional, only
  set when a posture grants casting (Phase 10 surface).

Seeded in four construction sites: `state-adapter.oldPlayerToNewPlayer`,
`apps/web/src/game.ts:createGameFromCreation`, plus the two web
test fixture helpers (`character-sheet-panel.spec.ts`,
`inventory-panel.spec.ts`).

**Item schema extension.** One required + three optional fields:
- `rarity: RarityTierId` — required.
- `magical?: boolean` — optional.
- `attunement?: AttunementRequirement` — optional.
- `requires?: ItemRequirements` — `{ form?, posture?, domain? }`,
  optional.

**Content migration.** `content/world-data/items.json` migrated:
every entry gains `rarity: "common"`; four entries with clear
supernatural effects gain `magical: true` (Brass Lens, Fountain
Water, Book of Backwards Names, Court Seal). Rarity left at
`common` across the board — upgrading specific items to
`uncommon`/`rare`/etc. is a deliberate content design pass, not a
foundation move.

**Wire-through sites.** `apps/web/src/data/worldLoader.ts:mapItems`
now reads the new fields from `RawItem` and defaults `rarity` to
`"common"` if missing (defensive default for any future content
authors who forget). `state-adapter.oldItemToNew` seeds `rarity:
'common'` on the legacy → canonical Item bridge.

### Surprise found (logged here for next-session continuity)

**The engine has its own internal `Player` shape.** The punch list
assumed one Player type; in fact `packages/engine/src/engine-types.ts`
declares a parallel `Player` interface with engine-internal fields
(`firstPerception`, `capabilityClaim`, `knowledgePosture`,
`abilities`, `traits`, `locationId`, `knownRumors`,
`factionStanding`, `relationships`, …). `CharacterCreation` and
`StateEngine` construct THIS shape; `state-adapter.ts` converts
between the engine-internal Player and the canonical Player.

This means Phase 7 only needed to extend the canonical Player and
seed the 5e fields in the `oldPlayerToNewPlayer` converter — NOT
in `CharacterCreation` as the punch list initially suggested. The
5e fields live on the canonical surface only. They don't yet
round-trip back to the engine-internal Player; Phase 9's combat
rewrite is where that two-way bridge will need to grow, since
combat rolls will read `proficiencyBonus` and write back to
`hitDice.current` on short rests.

Updating the punch list in-flight didn't seem worth a separate
commit since Phase 7 is the only consumer of it; flagged here so
future-me reads it before Phase 9.

### Verify

- `npm run typecheck` — clean across packages + apps/web + api.
- `npm run build:packages` — clean, all 7 workspace packages.
- `npm test` — 18 + 35 + 10 + 113 + 25 = **201 tests passing**
  across persistence + llm-client + narrative + engine + apps/web.
  Engine count held at 113; apps/web held at 25. Wave 1's
  `condition-effects-5e.spec.ts` still passes after the inline
  type block was replaced with a re-export.
- `npm run build` — 1077 modules, 3.31 s, no errors. Pre-existing
  PostCSS font-import-order warning unchanged.
- Bundle delta vs `BASELINE_METRICS.md`:
  - `main.js` 192.55 → 193.08 kB raw (**+0.53 kB**, +0.16 kB gzip)
  - `vendor.js` 455.80 kB — unchanged
  - `main.css` 44.75 kB — unchanged
- Leak grep on `apps/web/dist/assets/*.js` — 0 hits across all
  four sentinels.

### What's still ahead (Phase 8a onward)

Phase 8a now has a clean type surface to wire `CharacterSheetPanel`
and `InventoryPanel` against. Item.rarity is required, so the
panel's `getItemRarity` fallback can be deleted — it can read
`item.rarity` directly. `item.magical` and `item.attunement` are
optional but typed; the "magical halo" CSS Wave 1 shipped lights
up correctly off `item.magical === true`.

Phase 9 will need to grow the two-way bridge between the engine-
internal Player and the canonical Player so combat reducers can
read `proficiencyBonus` + write back `hitDice.current` on rests.

---

## 2026-05-20 (Session 8 cont.) — Phase 8a: Panel wiring + test env standardisation

Wires the two Wave 1 panels into `GameplayScreen` as new mobile
tabs, simplifies both panels to read canonical Player + Item
fields now that Phase 7 has shipped them, and standardises the
apps/web test environment on happy-dom (removing the hand-rolled
DOM shim Unit 4 had to ship as a Wave 1 work-around).

### What landed

**Tab surface.** `GameTab` extended in
`packages/types/src/index.ts` with two new ids: `"sheet"` and
`"trove"`. Apps/web stopped duplicating the union and now
re-exports `GameTab` from the canonical types package
(`apps/web/src/game.ts`). Single source of truth.

**GameplayScreen wiring** (`apps/web/src/screens/GameplayScreen.ts`):
- Two new tab entries between Fate and Status:
  - `{ id: "sheet", label: "The Sheet", title: "Character sheet — abilities, saves, hit dice" }`
  - `{ id: "trove", label: "The Trove", title: "Inventory — what the pack holds" }`
- New `renderMobilePanel` cases call the functional
  `createCharacterSheetPanel({ player })` and
  `createInventoryPanel({ player })` factories, set
  `id="panel-sheet"` / `id="panel-trove"` so the existing
  `syncMobilePanels` machinery picks them up, and add `panel` +
  `mobile-panel` classes for the styles.css rules.
- New private helper `refreshFunctionalPanel(panelId, build)`:
  when `game` changes in `update()`, the helper finds the panel
  by id and swaps it with a freshly-built one, preserving the
  `active-panel` class. The class-based panels still go through
  their `update()` methods in `panelInstances`; the functional
  panels go through this swap instead. Two code paths but a clear
  rule for which is which.

**CharacterSheetPanel simplified**
(`apps/web/src/components/CharacterSheetPanel.ts`):
- Reads `proficiencyBonus`, `hitDice.current`, `hitDice.max`,
  `hitDice.die`, and `savingThrowProficiencies` directly from
  `player`. Optional props are now overrides, not the only way to
  pass them.
- The `playerMaxHitDice` unsafe cast (Wave 1's optional-property
  workaround) is gone.
- The "Lineage" identity row that duplicated "Form" is removed
  — Phase 7 didn't add a lineage field and the dupe was awkward.
- The "Stillness/ruin meters arrive in Phase 7" placeholder comment
  is gone (Phase 7 shipped; the comment was a dead promise).
- The hit-die label is now `${current}/${max} ${die}` rather than
  hardcoded `d8`.

**InventoryPanel simplified**
(`apps/web/src/components/InventoryPanel.ts`):
- The `LocalRarityId` alias is gone; the panel now imports
  `RarityTierId` from `@first-perception/types`.
- The `getItemRarity` prop now defaults to `(item) => item.rarity`
  (was `() => "common"` as a placeholder). Phase 7 made rarity a
  required Item field, so the heuristic fallback is dead weight.
- `attunementUsed` / `attunementMax` default to
  `player.attunementSlots.used` / `.max`.
- `requiresAttunement` now checks `item.attunement?.required`
  first; the legendary/artifact heuristic stays as a secondary
  signal, but the description-text "attune" keyword scan is gone
  (was a brittle Wave 1 workaround; canonical data now drives it).

**Test environment standardisation.**
`apps/web/tests/character-sheet-panel.spec.ts` rewritten:
- Removed the 196-line hand-rolled DOM shim (Wave 1 Unit 4 had to
  ship this because happy-dom wasn't a devDep at the time).
- Added `// @vitest-environment happy-dom` at the file head,
  matching `apps/web/tests/inventory-panel.spec.ts` (Unit 5).
- Spec body now uses real `HTMLElement`, real `querySelector` with
  attribute selectors, real `classList`. Reads like normal DOM
  code.
- Added two new specs:
  - "reads hit-die from Player.hitDice rather than assuming d8" —
    locks in the new hit-die rendering.
  - "reads savingThrowProficiencies from Player when no prop
    override is passed" — locks in the canonical-field-reading
    behavior.
- File shrank from 372 lines to ~155 lines.

### Verify

- `npm run typecheck` — clean.
- `npm run build:packages` — clean.
- `npm test` — 18 + 35 + 10 + 113 + **27** = **203 tests passing**
  (+2 from new specs; engine count unchanged at 113).
- `npm run build` — 1077 → **1079** modules (+2 for the two
  functional panels now reachable from the bundle); 2.95 s.
- Bundle delta vs Phase 7 baseline:
  - `main.js` 193.08 → **202.21 kB** raw (**+9.13 kB**, +2.56 kB gzip)
  - `vendor.js` 455.80 kB — unchanged
  - `main.css` 44.75 kB — unchanged
- Leak grep — 0 hits across all four sentinels.

The +9.13 kB bump is exactly what the punch list and
BASELINE_METRICS predicted: the panel components were tree-shaken
before wiring; now they ship. Phase 11's bundle budget gate will
anchor against the post-Phase-8 floor, not the pre-Phase-7 floor,
to avoid penalising legitimate feature work.

### Notes for next session

- I did NOT add a GameplayScreen-level smoke spec for the new
  tabs because the wiring is exercised by the panel specs + the
  existing tab-sync flow. Phase 11's e2e pass is the natural home
  for "user clicks The Sheet, sees ability scores" coverage.
- Phase 8b (parser misroutes) and 8c (Ink scene routing +
  scripts/validate-content.mjs) and 8d (RollBand enum) can run in
  any order now; none of them touch each other's files.

---

## 2026-05-20 (Session 8 cont. ²) — Phase 8b + 8c + 8d: Parallel batch landed

Three independent 8-cluster fixes dispatched as background agents
in parallel (`docs/PHASE_8B_8C_8D_BATCH_PLAN.md` captured the
brief). All three landed as PRs into the integration branch and
were merged together via squash.

### What landed

**Phase 8b — IntentClassifier hardening (PR #9 → squash `a670f9f`)**

- Three confirmed misroutes fixed in
  `packages/llm-client/src/IntentClassifier.ts`:
  - `"break the lock"` → `narrative_only` → now → `investigation`
    (`break`/`pick`/`force`/`unlock`/`open` added to the
    `REDUCER_VERBS.investigation` bucket).
  - `"go talk to the man at the gate"` → `move` → now → `dialogue`
    via a new `PHRASE_OVERRIDES` table scanned before the
    first-word lookup. Sibling overrides cover `"take a look"` →
    `investigation` and `"approach and attack"` → `combat`.
  - `"stalk the priestess"` → `social` (via `talk` substring) →
    now → `stealth` via a new `containsWord` helper. Codex P2
    review noted the strict-boundary fix accidentally killed
    inflected forms; the helper now uses `\bword\w*\b` (leading
    boundary protects `stalk`, trailing `\w*` lets `attack` match
    `attacking`/`attacks`/`attacker`, `speak` match `speaker`,
    `name` match `named`, etc.).
- `DEFAULT_SYSTEM_PROMPT` rewritten to embed an explicit per-field
  schema, enumerate every reducer/domain enum value, and add
  per-reducer guidance. `jsonMode: true` already flows correctly
  through the LLM client adapters; no infra change needed.
- llm-client test count: 35 → **49** (+14 specs covering the three
  misroutes, the inflection regression, and the LLM-prompt path).

**Phase 8c — Ink scene routing validator (PR #8 → squash `2130200`)**

- `scripts/validate-content.mjs` ships. `package.json:21` has
  pointed at this file since before Phase 7; it finally exists.
- Walks every `.ink` file under `content/narrative/` (mirrors
  `scripts/build-content.mjs` discovery), collects knot
  definitions + stitches, validates that every `-> target`
  resolves to a defined knot, `DONE`, or `END`.
- Validates the four synthetic-jump construction sites in
  `packages/narrative/src/NarrativeEngine.ts`:
  - `legacy_death` must exist (hardcoded fallback in `enterLegacy`).
  - At least one `combat_*` / `dialogue_*` / `consequence_*` knot
    each (sanity for the encounter / NPC / consequence dispatchers).
- Soft-warns on NPC ids in `content/world-data/npcs.json` lacking
  a dedicated `dialogue_<id>` knot (engine falls back to default).
- Codex P1 review caught a real over-permissive bug: dotted
  diverts `-> knot.stitch` previously passed validation as long as
  `knot` existed, even when `stitch` was gibberish. Fix in commit
  `8a8b529` (now folded into the squash merge): `parseInk`
  tracks the current knot context and records every `= stitchname`
  line as `Knot.stitchname` qualified; the resolution check no
  longer head-falls-back.
- Current corpus: clean — 14 files, 64 knots, 119 diverts all
  resolve. One soft warning for `npc-keeper` (the dead Bell Keeper
  has no dialogue knot; that's the warn-only NPC fallback case).

**Phase 8d — RollBand enum + reducer tale-tone consistency (PR #10 → squash `6b4e78d`)**

- Canonical `RollBand` type added to `packages/types/src/index.ts`:
  `'disaster' | 'failure' | 'success' | 'triumph'`. Coarse
  4-band classification layered above the existing 7-band
  `ResultBand`.
- Two runtime helpers exported alongside the type:
  - `rollBandToTaleTone(band): TaleTone`
  - `resultBandToRollBand(r: ResultBand): RollBand`
- Phase 9 will adopt `RollBand` as the return type from `rollD20`
  in the combat rewrite; this phase ships the type + helpers +
  the consistency-at-the-test-level invariant only.
- One reducer body/tone mismatch surfaced + fixed:
  `combatReducer.ts:77` — the `'Slain'` tale entry on the
  successful-kill path was tagged tone `'danger'`. Retoned to
  `'quiet'` (the kill is consequential but not a player setback).
  All other reducers were already self-consistent.
- New spec `packages/engine/tests/roll-band-consistency.spec.ts`
  drives the six roll-gated reducers through deterministic
  failure and success outcomes (fixed-die RNG subclass), asserts
  tone matches outcome on both branches.
- Engine test count: 113 → **127** (+14 specs).

### Codex reviews

PRs #8 and #9 received automated reviews from the Codex bot. Both
findings were real and small enough to confidently fix before
merge:

- **PR #8 (validator)** — P1 dotted-divert head-fallback bug.
  Fixed at `8a8b529` and merged.
- **PR #9 (IntentClassifier)** — P2 inflection regression after
  the word-boundary switch. Fixed at `1f8e628` with 4 added regression
  specs (matched inflected verbs across combat/social/lore
  domains; locked in the `stalk → stealth` protection).

PR #10 received no review comments.

### Vercel deployment infra issue (flagged, not fixed)

All three PRs surfaced the same Vercel project config bug — `thefirstpercepti-web` runs `npm run build:packages && npm run build` with Root Directory set to `apps/web/`, but `build:packages` only exists at repo root, so the project always errors. The parallel `thefirstpercepti-web-mect` deployment (correctly configured) succeeded on each PR. Flagged for user decision; not silently changing the Vercel settings.

### Verify (integration branch post-merge)

- `npm run typecheck` — clean across packages + apps/web + api.
- `npm run build:packages` — clean.
- `npm test` — **231 tests passing** across all 5 workspaces:
  persistence 18 / llm-client 49 / narrative 10 / engine 127 /
  apps/web 27.
- `npm run build` — 1079 modules, 3.23 s.
- `npm run content:validate` — exit 0 on clean tree.
- Bundle delta vs Phase 8a baseline:
  - `main.js` 202.21 → **203.83 kB** raw (+1.62 kB, +0.65 kB gzip) —
    RollBand helpers + IntentClassifier additions land.
  - `vendor.js` 455.80 kB — unchanged.
  - `main.css` 44.75 kB — unchanged.
- Leak grep on `apps/web/dist/assets/*.js` — 0 hits.

### What's still ahead

- **Phase 9** — Forging UI ("The Anvil") tab + combat reducer
  rewrite using dice expressions + 5e action economy
  (action / bonus / reaction). 9a and 9b are independent and
  parallelisable: 9a (engine combat) touches `combatReducer.ts`
  + dice-expression integration + the engine-internal/canonical
  Player bridge growth; 9b (forging UI) touches new apps/web
  panel + GameTab + GameplayScreen wiring (same pattern as Phase
  8a).
- **Phase 10** — Spell slots: posture-driven casting surfaces
  for any posture that grants it. Player.spellSlots is already
  in the canonical schema (Phase 7); no consumer uses it yet.
- **Phase 11** — Sentry wiring, streaming LLM tokens, bundle
  budget CI gate, "The Lens" settings drawer, Witness Briefing
  first-run overlay, accessibility hardening, contextual tab
  reveals. The bundle gate should anchor at the post-Phase-9
  floor (Phase 9 is the last big additive feature wave).

---

## 2026-05-20 (Session 8 cont. ³) — Phase 12 / Wave A: ARD cleanup + memory sync

Completion of Wave A happened in the parallel Claude Desktop
design folder (not in this Claude Code session). This entry
records the **mirror landing** into the repo so any future
Claude Code session reads the reconciliation context first.

### What landed

- `docs/RECONCILIATION_AUDIT.md` — compressed audit summary; 19-
  component verdict matrix; determination (**salvage repo + port
  design**); 14-phase migration plan summary; hard external gates.
- `docs/ENGINEERING_PLAN.md` — Phase 12 → 25 ticket catalog with
  per-phase ticket lists for Phases 12-18 detailed; abbreviated
  scope for Phases 19-25; critical path + parallel tracks +
  fragility points.
- `docs/POLISH_CRITERIA.md` — slice scope (Greywake Market
  District vertical slice); 10 engineering + 8 content + 7 UI
  binding criteria; explicit "NOT in v1" list; Definition of Done
  gate before Phase 25.
- `AGENTS.md` gains a **Reconciliation Context (READ FIRST)**
  section at the very top (above Project Identity) with the
  critical single-track coordination rule for Phases 12-17
  ("Recommended: Claude Desktop — it has the live design
  context"), the reference set, hard external gates, and a
  deprecation note for `scripts/sprint_sync.py` (ARD-008
  superseded).

### Determination summary (from RECONCILIATION_AUDIT)

| | Repo wins | Design wins |
|---|---|---|
| Stack | Vite + TS (ARD-003 SUPERSEDED — no Godot) | — |
| Agent topology | 4 agents (5 incl. Content Boundary Validator in Phase 16) | — |
| Persistence | Postgres + GameRepository | — |
| LLM runtime | Claude + Kimi proxy via `/api/llm` | — |
| Deployment | Vercel | — |
| Content canon | — | ~580 Greywake records |
| Schema spec | — | schema_pack_v0.5.json (80 v0.5 additives); repo generates TS from it |
| Manifesto / voice | — | 7 binding rules — port to validator chain + Narrator prompt |
| Design system | — | palette + 8 motifs + brand bible + 11 JSX kit components |

### Critical-path checkpoint

```
Phase 12 ARD cleanup ✅
  → Phase 13 Schema reconciliation       ← NEXT (single-track only)
    → Phase 15 Greywake content slice port
      → Phase 18 Ink scenes
        → Phase 23 Slice integration
          → Phase 24 Demo prep
            → Phase 25 v1 ship
```

### Next: Phase 13 — Schema reconciliation (SINGLE-TRACK)

**Goal:** Generate TypeScript types from `schema_pack_v0.5.json`
into `packages/types/src/generated.ts`; align with current
`index.ts`; resolve diffs field-by-field.

**Tickets (ENG-101..106) — see docs/ENGINEERING_PLAN.md:**
1. ENG-101 — Add `json-schema-to-typescript` devDep + generator script.
2. ENG-102 — Copy `schema_pack_v0.5.json` to `content/schemas/`;
   generate `packages/types/src/generated.ts`.
3. ENG-103 — Diff generated vs existing index.ts field-by-field.
4. ENG-104 — Replace compatible entries; comment divergences.
5. ENG-105 — Update test files for breaking changes; keep 272-spec
   floor.
6. ENG-106 — CI step: fail if generated.ts is stale.

**Track recommendation: Claude Desktop** (it has schema_pack_v0.5.json
live). Phase 13 should NOT start in Claude Code until either (a)
Khoja confirms the switch or (b) the design folder doesn't have
bandwidth this sprint and we explicitly transfer ownership.

### What this Claude Code session WILL NOT do next

Per the single-track rule:

- Will not start Phase 13 (schema reconciliation) work autonomously.
- Will not touch `schema_pack_v0.5.json` (it's not in this repo yet).
- Will not begin Phase 14 (design system port) or Phase 15 (Greywake
  content) without an explicit "you have the wheel" handoff from
  Khoja.

This session may continue to land small follow-ups in already-shipped
phases (Phase 11b infra queue: Sentry, end-to-end LLM streaming, full
WCAG sweep) since those don't touch the reconciliation core.

## Build Commands

```bash
# Full project build
npm run build

# Content only
npm run content:compile

# Individual packages
cd packages/types && npm run build
cd packages/engine && npm run build && npm test
cd packages/narrative && npm run build
cd packages/audio && npm run build

# Web app
cd apps/web && npm run dev      # vite dev server
cd apps/web && npm run build    # production
cd apps/web && npm run smoke    # Playwright smoke
```
