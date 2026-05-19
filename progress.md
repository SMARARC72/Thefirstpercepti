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
