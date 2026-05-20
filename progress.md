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
