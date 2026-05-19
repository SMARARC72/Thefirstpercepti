# The First Perception - Optimized Build and Design Plan

Generated: 2026-05-19

Scope reviewed:
- Local workspace: `backend`, `database`, `.sixth`
- Live game: `https://j5cwhotat2vuo.kimi.page/`
- Subagent lanes: engine/mechanics, build/data/deployment, live UI/UX

## Executive Summary

The live game has a strong atmospheric vertical slice: title screen, six-step character creation, world-generation transition, and a dense gameplay dashboard with narrative, commands, dice/fate records, journal, status, factions, NPCs, and world pulse. The local workspace, however, does not contain the frontend source that produced the live app. It contains only a TypeScript engine package and a large SQLite schema.

The highest-leverage path is not a visual-only redesign. The build needs a product spine:

1. Make the local engine compile, test, and run.
2. Reconcile frontend gameplay data with the backend engine model.
3. Implement real action reducers for movement, combat, items, rest, dialogue, investigation, conditions, consequences, death, and world simulation.
4. Rebuild gameplay UI around player intent and mobile reachability.
5. Add persistence, deterministic replay, and scenario tests before expanding content.

## Verified Current State

### Local Files

The workspace is not a Git repository and contains:
- `backend/package.json`
- `backend/tsconfig.json`
- `backend/src/types/index.ts`
- `backend/src/engine/*.ts`
- `database/schema.sql`
- `.sixth/skills` with no visible files

No frontend source, route files, app shell, deployment config, README, CI config, or runtime adapter are present locally.

### Build Validation

Command run from `backend`:

```powershell
node node_modules\typescript\bin\tsc --noEmit
```

Result: failed.

Current TypeScript errors:
- `backend/src/engine/ContentValidator.ts:285` severity narrowing issue.
- `backend/src/engine/StateEngine.ts:658` unsafe `StatBlock` indexing.

Packaging gaps:
- `package.json` points to `index.js`, but no built JS or `src/index.ts` exists.
- `package.json` declares `"type": "commonjs"` while `tsconfig.json` emits `"module": "ESNext"`.
- Only script is placeholder `test`, which exits with failure.
- `node_modules/.bin` is missing in the checked-out install artifact.

### Live App Findings

Verified with browser automation:
- HTTP 200, title `The First Perception`.
- Main menu: `BEGIN`, disabled `CONTINUE`, `LEGACY`, `SETTINGS`, `EXIT`.
- `BEGIN` opens a six-step character creation flow.
- `EMBARK` transitions to `#/gameplay` after a generation overlay.
- Gameplay includes narrative log, command input, suggested actions, quick commands, dice/fate history, status, journal, world pulse, factions, and NPC tabs.
- No app-crashing console errors were captured during smoke exploration.

Live UX issues:
- Mobile gameplay is materially broken: panels overflow off the right edge and key controls become unreachable.
- Desktop gameplay is visually impressive but cognitively overloaded on first arrival.
- Command controls are present but not obvious enough for first-turn play.
- Several icon-only controls and settings controls lack accessible names/roles.
- `EXIT` calls browser window close behavior, which does not work for normal tabs.
- Page title remained on character creation after gameplay.
- Missing `favicon.ico` returns 404.

## P0 Blockers

### 1. Local Package Cannot Be Treated As A Runnable Product

Evidence:
- `backend/package.json` has no build/start/typecheck scripts.
- `backend/package.json` has `main: index.js`, but no built `dist` and no source entrypoint.
- `backend/tsconfig.json` emits ESNext modules while package metadata says CommonJS.

Required plan:
- Choose one runtime target for this repo: library package, browser app, CLI game, HTTP API, or full-stack app.
- Add scripts:
  - `typecheck`
  - `build`
  - `test`
  - `test:watch`
  - `start` or `dev`
  - `clean`
- Add a real entrypoint or explicitly mark the package as engine-library-only.

Acceptance:
- `npm ci`
- `npm run typecheck`
- `npm run build`
- `npm test`
- No reliance on globally installed TypeScript.

### 2. Core Actions Resolve But Do Not Apply Real State Changes

The backend controller resolves intent and rolls, but `phaseUpdateWorld()` only adjusts NPC relationship values and marks an investigated/examined location explored. Major gameplay verbs are not wired to state patches:
- `go` does not move the player.
- `attack` does not damage NPCs.
- `rest` does not heal or tick conditions.
- `use` does not equip/consume items.
- `flee` does not change scene/location/threat state.
- combat helper `RulesEngine.calculateDamage()` is not used by the turn pipeline.

Required plan:
- Introduce typed action reducers:
  - `moveReducer`
  - `combatReducer`
  - `restReducer`
  - `itemReducer`
  - `dialogueReducer`
  - `investigationReducer`
  - `conditionReducer`
  - `deathReducer`
- Each reducer returns a typed `StatePatch[]`, `RollResult[]`, `NarrativeEvent[]`, and `Consequence[]`.

Acceptance:
- Every suggested action changes at least one meaningful state field or intentionally returns a no-op reason.
- A golden 10-turn playthrough can be replayed deterministically.

### 3. Consequence Scheduler Is Not Reliable

Issues:
- Consequences process only during world simulation ticks, not every turn.
- `getPendingConsequences()` returns clones, then `turnsRemaining--` mutates the clone instead of stored state for delayed consequences.
- condition/action/location triggers return false by default.
- death-check consequences are created but never resolved by the scheduler.
- random consequences use `Math.random()` instead of seeded RNG.

Required plan:
- Move consequence ticking into the core turn loop after action reducers.
- Persist trigger countdown changes on stored consequences.
- Implement trigger resolvers for `time`, `action`, `condition`, `location`, and seeded `random`.
- Convert death checks into immediate or scheduled typed effects.

Acceptance:
- Delayed consequence with `turnsRemaining: 3` fires exactly on the third turn.
- Death-check consequence either resolves immediately or blocks progression until resolved.
- No `Math.random()` in deterministic game paths.

### 4. Death Handling Uses Stale Player State

`processTurn()` captures a cloned player before phase mutations and checks `player.hp <= 0` after costs may have been applied elsewhere. This can miss lethal outcomes.

Required plan:
- Re-read current player state after applying effects.
- Make lethal damage and death checks part of a single typed effect pipeline.
- Add tests for HP reaches zero, lethal roll band, and death-survival roll.

Acceptance:
- HP reduction to zero always transitions to death/legacy flow.
- Survival/death outcome is deterministic under a fixed seed.

## P1 Architecture And Data Improvements

### Canonical Domain Model

The TS model and SQL schema are not aligned:
- TS character creation uses low starting stat values.
- SQL player stats are 1-20 with 10 as average.
- TS uses nested camelCase structures.
- SQL uses normalized snake_case columns.

Decision needed:
- Option A: Make backend engine snapshot-first and treat SQL as optional analytics/export.
- Option B: Make SQL the source of truth and build repository/mappers.

Recommendation:
- Use snapshot-first for the next playable milestone.
- Add a repository abstraction so SQLite can be introduced after gameplay reducers are stable.

### Persistence

Current state:
- Backend `GameController` writes browser `localStorage`.
- SQL `save_snapshot` exists but no runtime DB adapter uses it.
- `save` command creates a snapshot but does not return/store it in a visible way.
- RNG state is not fully restored on load.

Plan:
- Define `SaveRepository` interface:
  - `saveSlot(snapshot)`
  - `loadSlot(id)`
  - `listSlots()`
  - `deleteSlot(id)`
  - `exportSnapshot()`
  - `importSnapshot()`
- Implement localStorage repository for browser.
- Add SQLite repository only after schema validation.
- Store RNG state and migration version in every snapshot.

### Schema Repair If SQL Stays

Known schema issues:
- `v_player_summary` selects `p.current_turn`, but the player table has no `current_turn`.
- Seed inserts `condition_type_id` values like `debt_bound` and `exhausted` that are not seeded in `enum_condition_type`.
- NPC death cascade writes a location ID into a region FK field.

Plan:
- Add a schema smoke script:
  - create empty DB
  - run schema
  - run FK check
  - query every view
  - verify seed row counts
- Add enum consistency tests.
- Add TS-to-SQL mapper tests only after canonical model is chosen.

## UI/UX Build Plan

### Design Direction

Keep the cosmic-horror identity, but make gameplay easier to parse. The visual identity already has a strong voice; the problem is information hierarchy, reachability, and player guidance.

### Mobile-First Gameplay Rebuild

Replace desktop-only multi-column gameplay with:
- Top compact status strip: character, location, time, danger/conditions.
- Primary tab: `Tale`.
- Bottom command dock: text input, submit, quick actions.
- Secondary tabs or bottom sheets:
  - `Fate`
  - `Status`
  - `Journal`
  - `World`
  - `Factions`
  - `NPCs`

Acceptance:
- No horizontal overflow at 390px width.
- All core controls are reachable with touch.
- Tap targets are at least 44px.
- Kimi badge and app nav never overlap critical buttons.

### Desktop Gameplay Recomposition

Recommended desktop layout:
- Center: narrative/tale and command input.
- Left collapsible rail: perceived elements/map/local context.
- Right collapsible rail: status/journal/factions.
- Dice/fate record collapsed by default, expanded on demand.
- World pulse shown as a concise alert, not competing with narrative.

Acceptance:
- First gameplay view shows one primary next action.
- Suggested actions stay above fold.
- Command input is visually dominant and labeled.
- Logs and factions are accessible but not visually louder than the story.

### First-Turn Onboarding

Add a dismissible first-turn overlay:
- "Pick a suggested action or type your own."
- "Rolls show risk and outcome."
- "World pulse shows offscreen movement."
- "Status tracks what the world has done to you."

Acceptance:
- Player can understand what to do within 10 seconds.
- Overlay is keyboard dismissible and never blocks save/quit.

### Character Creation Improvements

Keep the six-step ritual, but improve input clarity:
- Show selected state clearly on form/posture choices.
- Add short mechanical preview per choice.
- Make all preset chips/tap targets at least 44px.
- Add progress labels that are clickable only if previous steps are valid.
- Preserve typed values when navigating back.
- Add final review screen before `EMBARK`.

Acceptance:
- Full creation flow works with keyboard only.
- Full creation flow works on mobile without overlap.
- Randomize can randomize current step or all steps with clear scope.

### Accessibility

Immediate fixes:
- Add accessible names to icon-only buttons.
- Replace clickable div settings with buttons/radios.
- Label all inputs and textareas.
- Use `aria-pressed` or `aria-selected` for selected controls.
- Announce world-generation and command-processing states.
- Update document title on route changes.

Acceptance:
- No unnamed buttons in Playwright accessibility snapshot.
- Keyboard can reach every visible control in logical order.
- Focus is moved after major route/screen transitions.

## Feature Expansion Plan

### Gameplay Mechanics

Build these in order:

1. Movement and location graph:
   - Visible exits, hidden exits, lock requirements, travel risk.
   - Location state changes after investigation or faction events.

2. Combat and threat:
   - Initiative or turn exchange.
   - Damage, defense, wounds, flee, surrender.
   - NPC death/unconscious states.

3. Items and inventory:
   - Equip, consume, inspect, drop, trade.
   - Charges/durability.
   - Item-triggered scene options.

4. Dialogue:
   - Topic discovery.
   - Relationship thresholds.
   - Secrets, lies, rumor transfer.
   - Consequences for failed persuasion/threats.

5. Conditions and meters:
   - Vitality, clarity, spirit, tide/corruption.
   - Condition durations and stacked effects.
   - Rest and recovery rules.

6. Factions and world pulse:
   - Plans with timers and visible player-facing hints.
   - Faction response to player actions.
   - Rumor propagation and belief drift.

7. Legacy/death:
   - Death vector, epitaph, world changes.
   - Next character inherits rumor, curse, item, reputation, or altered faction state.

### UI Features

Add:
- Save slots and continue screen.
- Settings modal with accessibility and motion controls.
- Command history and command autocomplete.
- Journal search/filter that works on mobile.
- World map / relationship graph.
- Roll probability preview before risky actions.
- Event timeline.
- Codex of discovered terms, factions, places, and beings.
- Reduced-motion mode that disables heavy ambience and typewriter effects.

## Implementation Roadmap

### Phase 0 - Repository Recovery And Source Alignment

Goal: determine whether this local folder should own the live frontend.

Tasks:
- Locate or recover the frontend source that built the live Vite bundle.
- Initialize or restore Git metadata.
- Add `.gitignore`, README, env example, and CI stub.
- Decide monorepo layout:
  - `/apps/web`
  - `/packages/engine`
  - `/packages/content`
  - `/packages/persistence`
  - `/database`

Exit criteria:
- Frontend source is in repo or explicitly documented as unavailable.
- One command installs dependencies.
- One command runs local app.

### Phase 1 - Build And Test Foundation

Tasks:
- Fix TypeScript errors.
- Align package module type and tsconfig.
- Add Vitest.
- Add tests for dice, input parser, character creation, content validator, state snapshots.
- Add CI command matrix.

Exit criteria:
- `npm run typecheck`, `npm run build`, and `npm test` pass.
- No placeholder test script remains.

### Phase 2 - Engine Reducer Rewrite

Tasks:
- Replace `AgentPhaseResult.output as unknown as string` with typed results.
- Implement state patch pipeline.
- Add action reducers for movement, combat, item use, rest, investigation, dialogue.
- Implement consequence scheduler.
- Add deterministic seed/replay harness.

Exit criteria:
- Golden 10-turn scenario passes from fixed seed.
- Every action produces a state diff and narrative event.
- Death and consequence tests pass.

### Phase 3 - Persistence

Tasks:
- Define snapshot schema version and migration strategy.
- Implement browser save repository.
- Add save slots and continue screen.
- Decide whether SQLite is runtime, export, or future-server storage.
- Repair SQL if kept.

Exit criteria:
- Save/load resumes exact state, including RNG sequence.
- Continue button works.
- Export/import snapshot works.

### Phase 4 - Gameplay UI Rebuild

Tasks:
- Rebuild mobile layout with tabs/sheets.
- Recompose desktop hierarchy.
- Add onboarding overlay.
- Add accessible command input and processing feedback.
- Fix settings semantics and route titles.

Exit criteria:
- Playwright smoke passes at 390x844, 768x1024, 1440x1000.
- No horizontal overflow.
- No unnamed critical controls.
- User can complete creation, start gameplay, submit command, save, reload.

### Phase 5 - Content And Feature Expansion

Tasks:
- Add 3 complete starting scenarios based on first perception archetypes.
- Add faction arcs and NPC dialogue topic trees.
- Add item and condition libraries.
- Add legacy outcomes.
- Add balancing data files with validation.

Exit criteria:
- 30-minute playable loop with real consequences.
- At least 3 replay-distinct openings.
- Death/legacy creates a materially different next run.

## Test Strategy

Automated:
- Typecheck and build.
- Unit tests:
  - dice probabilities and bands
  - input interpretation
  - reducer patches
  - consequence countdowns
  - death checks
  - save/load determinism
  - schema smoke if SQL retained
- Integration:
  - character creation to gameplay
  - 10-turn deterministic scenario
  - save, reload, continue
- Playwright:
  - desktop creation and gameplay
  - mobile creation and gameplay
  - settings accessibility
  - command submission

Manual:
- First-turn comprehension test.
- Mobile thumb reachability.
- Narrative density review.
- Reduced-motion review.
- 20-minute play session bug bash.

## Suggested Workstream Ownership

1. Engine/mechanics agent:
   - Typecheck fixes, reducers, scheduler, deterministic replay, unit tests.

2. Frontend/UI agent:
   - Mobile layout, desktop hierarchy, command UX, settings accessibility.

3. Persistence/data agent:
   - save repository, schema repair decision, snapshot migrations.

4. Content/design agent:
   - scenarios, faction arcs, NPC topic trees, journal/world-pulse tuning.

5. QA agent:
   - Playwright smoke, accessibility, mobile overflow, golden scenario.

## Immediate Next Sprint Backlog

1. Restore frontend source or confirm it cannot be recovered.
2. Fix TypeScript compile blockers.
3. Add package scripts and Vitest.
4. Implement movement, rest, and item use reducers first.
5. Repair consequence countdown persistence.
6. Build save/load repository and enable `CONTINUE`.
7. Replace mobile gameplay layout with tabbed/sheet layout.
8. Add command submit button and processing feedback.
9. Add first-turn onboarding.
10. Add Playwright smoke for create -> embark -> command -> save -> reload.

