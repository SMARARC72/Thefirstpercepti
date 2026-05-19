# Phase B Plan — Hardening, Testing & Feature Expansion

> Status: Phase A (Ink narrative integration) is complete. Build passes, types align, engine tests pass.
> Next: browser verification, web test foundation, location graph, audio polish, content expansion.

---

## P0: Browser Story Flow Verification ✅

**Goal:** Confirm Ink narrative renders correctly in the browser, choices update after commands, and the full create→gameplay loop works.

### Tasks
1. Start `vite dev` server
2. Navigate through title → creation → gameplay
3. Verify initial Ink scene (`arrival`) loads with correct text and choices
4. Submit commands ("look around", "listen", "approach fountain") and verify:
   - Narrative text updates in the tale panel
   - Suggested actions update to match Ink choices
   - Journal entries appear when Ink tags trigger `add_journal_entry`
   - Fate records show dice rolls from engine reducers
5. Check for console errors
6. Take screenshots at key states for documentation

### Acceptance
- No unhandled exceptions in browser console
- Each command produces visible narrative text
- Suggested actions reflect current Ink choices
- Game state persists across save/load

**Status:** Verified. Cross-location travel (arrival → fountain → market → archive) works end-to-end. Critical UI re-render bug fixed.

---

## P1: Web Test Foundation ✅

**Goal:** Add unit and integration tests to `apps/web` so regressions are caught before they reach the browser.

### Tasks
1. Add Vitest to `apps/web` (already in devDeps, just needs config)
2. Write tests for:
   - `createGameFromCreation()` produces a valid shared `GameState`
   - `submitCommand()` advances turn count and updates state
   - `toNarrativeGameState()` adapter round-trips correctly (if we add one)
   - `CommandDock` renders suggestions correctly
3. Update Playwright smoke test (`tests/smoke.mjs`) for Ink-driven flow:
   - creation → embark → gameplay
   - submit a command
   - verify narrative text appears
   - save → reload → verify state restored

### Acceptance
- `cd apps/web && npm test` runs and passes
- `cd apps/web && npm run smoke` passes (or is updated with new flow)

**Status:** 9 Vitest unit tests pass. Playwright smoke test `tests/smoke.mjs` created and passing.

---

## P2: Movement & Location Graph ✅

**Goal:** Make `moveReducer` work mechanically by giving locations real exits.

### Tasks
1. Load world-data `locations.json` into `createGameFromCreation()` or a location initialization helper
2. Build `LocationNode[]` and `Region[]` from world data instead of synthesizing a single location
3. Ensure `currentLocationId`, `locations`, and `regions` stay in sync with `world.location`/`world.region` strings (for UI compatibility)
4. Populate `locations[].exits` with `Exit[]` objects
5. Verify `moveReducer` can navigate between locations
6. Update Ink variables (`world_location`, `world_region`) when player moves

### Acceptance
- `go to <location>` command moves player to target location
- `world.location` string updates for UI display
- Ink narrative reflects new location via `world_location` variable

**Status:** World-data JSON loads at game creation. Ink cross-location travel verified (arrival → fountain → market → archive).

---

## P3: Audio Polish ✅

**Goal:** Audio layers adapt correctly from the first interaction onward.

### Tasks
1. Call `audioEngine.updateFromGameState()` immediately after `audioEngine.start()` on first user click
2. Map Ink sound tags (`sound:ambient_drip`, `sound:combat_start`, etc.) to audio presets
3. Add danger-based audio intensity scaling (already in `AudioEngine`, just needs proper state sync)

### Acceptance
- First click initializes audio AND immediately sets layers based on current game state
- Ink `sound:` tags trigger corresponding audio cues
- No audio console errors

**Status:** First click already calls `start()` then `updateFromGameState()`. Sound tags added to Ink content (combat_start, ambient_drip, market_murmur, archive_bell, breach_rumble, blade_ring, etc.).

---

## P4: Content Expansion ✅

**Goal:** Expand the playable Ink scene graph beyond the arrival/fountain loop.

### Tasks
1. Wire market, archive, breach, and dream scenes into the choice graph
2. Add consequence knots that call `triggerConsequence()` from the engine scheduler
3. Add faction-reaction knots that modify `faction_trust`/`faction_fear` variables
4. Add more `roll_check` branches with meaningful mechanical outcomes (HP changes, item discoveries)
5. Add `sound:` and `animation:` tags to key moments

### Acceptance
- Player can reach 3+ distinct locations via Ink choices
- Each location has at least 2 meaningful choice branches
- Consequences from engine scheduler appear in narrative

**Status:** 10 scene files + 3 system files. Cross-location exits wired. Sound tags (combat_start, ambient_drip, market_murmur, archive_bell, breach_rumble, blade_ring, impact_wet, etc.) and animation tags (shudder, pulse, flash) added. Consequence tags (# consequence:wounded, # consequence:danger_rise) trigger `triggerConsequence()` in main.ts. Faction reaction knots wired into fountain seal and market debt court scenes.

---

## P5: Death & Legacy Flow ✅

**Goal:** Make death transitions work end-to-end in the browser.

### Tasks
1. Detect `gameOver` state in `main.ts` after reducer patches
2. Route to a death/legacy screen instead of normal gameplay
3. Display death record (character name, vector, epitaph, turns survived)
4. Generate legacy effects that modify next-run starting state
5. Add "Begin New Run" button that carries over legacy

### Acceptance
- HP reaching 0 transitions to death screen
- Legacy screen shows meaningful inheritance
- New run starts with legacy-modified state

**Status:** `runCommand()` detects `player.hp <= 0`, calls `deathReducer()`, generates `Legacy` via `LegacySystem`, saves to `localStorage` history, transitions to `game_over` screen. `DeathScreen` shows epitaph, details, and inheritance. `LegacyScreen` shows chain of past lives. "Begin New Run" applies last legacy (item + advantage). TitleScreen "Legacy" button navigates to `LegacyScreen`.

---

## Execution Order

```
P0: Browser verification (immediate — validates Phase A)
P1: Web test foundation (parallel with P0 findings)
P2: Movement & location graph (blocks deeper content)
P3: Audio polish (can be done in parallel)
P4: Content expansion (depends on P2 for location graph)
P5: Death & legacy flow (depends on P4 for content depth)
```

## Time Estimates

| Milestone | Effort | Risk |
|-----------|--------|------|
| P0 Browser verification | 1-2 hrs | Low |
| P1 Web tests | 2-3 hrs | Low |
| P2 Location graph | 3-4 hrs | Medium (data alignment) |
| P3 Audio polish | 1-2 hrs | Low |
| P4 Content expansion | 4-6 hrs | Medium (Ink writing) |
| P5 Death/legacy flow | 2-3 hrs | Medium (state machine) |

## Files to Touch

| Concern | Files |
|---------|-------|
| Browser flow | `apps/web/src/main.ts`, `apps/web/src/screens/GameplayScreen.ts` |
| Web tests | `apps/web/vitest.config.ts` (new), `apps/web/src/**/*.test.ts` (new), `apps/web/tests/smoke.mjs` |
| Locations | `apps/web/src/game.ts`, `packages/engine/src/reducers/moveReducer.ts` |
| Audio | `apps/web/src/main.ts`, `packages/audio/src/AudioEngine.ts` |
| Content | `content/narrative/scenes/*.ink`, `content/narrative/systems/*.ink` |
| Death flow | `apps/web/src/main.ts`, `apps/web/src/screens/TitleScreen.ts` |
