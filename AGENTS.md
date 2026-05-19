# AGENTS.md — The First Perception

> This file contains agent-critical context that supplements README.md and docs/OPTIMIZED_BUILD_AND_DESIGN_PLAN.md.
> When working on files in subdirectories, deeper AGENTS.md files take precedence over this root file.

---

## Project Identity

**The First Perception** is a cosmic-horror narrative RPG played in the browser. It uses:
- **Ink by Inkle** (via `inkjs`) for interactive narrative
- **Tone.js** for generative ambient audio
- A **deterministic seeded engine** for dice rolls, state patches, and replay
- **Vite + vanilla TypeScript** for the web UI (no React framework)

---

## Monorepo Layout

```
├── packages/
│   ├── types/          # Shared TS interfaces (GameState, Player, TaleEntry, etc.)
│   ├── engine/         # Deterministic game engine + reducers + state adapter
│   ├── narrative/      # Ink runtime wrapper (InkBridge, NarrativeEngine, ContentLoader)
│   ├── audio/          # Tone.js audio engine (reactive to danger/location/weather)
│   └── ui-system/      # Shared CSS tokens and UI primitives
├── apps/
│   └── web/            # Vite browser app (title, creation, gameplay screens)
├── content/
│   ├── narrative/      # .ink source files
│   └── _compiled/      # .json output (built by scripts/build-content.mjs)
├── database/
│   └── schema.sql      # SQLite schema (not currently used at runtime)
└── scripts/
    └── build-content.mjs   # Compiles .ink → .json, copies to apps/web/public/
```

---

## Critical Conventions

### Types

All game types live in `packages/types/src/index.ts`. The web app **does not define its own `GameState`** — it re-exports from `@first-perception/types`:

```ts
// apps/web/src/game.ts
export type { GameState, AppState, Player, /* ... */ } from "@first-perception/types";
```

**Key type shapes:**
- `Player.inventory` is `Item[]` (not `string[]`)
- `Player.conditions` is `Condition[]` (not `string[]`)
- `GameState.suggestedActions` is `SuggestedAction[]` (not `string[]`)
- `TaleEntry` requires `id: UUID` and `tags: string[]`
- `JournalEntry` requires `id: UUID` and `category: "perception" | "evidence" | ...`

### State Flow

```
Player command
    → parseCommand() → verb
    → engine reducer (combat/move/item/etc.) → ActionResult { patches, narrative, suggestions }
    → applyPatches(game, patches) → updated GameState
    → conditionReducer() → more patches
    → NarrativeEngine.processCommand(cmd, game) → NarrativeResult { text, choices, taleEntry, journalEntry, soundCue }
    → merge into game state
    → audioEngine.updateFromGameState(game)
    → render
```

### Ink Pipeline

1. Ink source lives in `content/narrative/` (`.ink` files)
2. `npm run content:compile` runs `scripts/build-content.mjs`
3. Output goes to `content/_compiled/*.json`
4. Build script copies to `apps/web/public/content/_compiled/` so Vite serves it
5. `ContentLoader` fetches from `/content/_compiled/*.json` at runtime
6. `NarrativeEngine` loads `main.json` (which `INCLUDE`s all scenes)

**External functions bound in Ink:**
- `get_player_stat(stat_name)` → reads `game.player.stats`
- `roll_check(domain, difficulty)` → deterministic D20 roll
- `add_journal_entry(label, detail)` → buffers journal entry
- `min(a, b)`, `max(a, b)` → math helpers

### Audio

- `AudioEngine` is lazy-initialized on first user click (Tone.js requirement)
- `audioEngine.updateFromGameState(game)` must be called after every command resolution
- `audioEngine.playCue({ layer, type, soundId })` expects an `AudioCue` object, not a string

---

## Known Traps

### 1. Web `GameState` must stay aligned with shared types
If you add a field to shared `GameState`, you must also update `createGameFromCreation()` in `apps/web/src/game.ts` to populate it. Otherwise runtime crashes when engine reducers or InkBridge read it.

### 2. Engine reducers expect `locations` and `currentLocationId`
The web app creates a single location on game start. If you want `moveReducer` to work mechanically, you need to populate `locations[].exits` with `Exit[]` objects pointing to other `LocationNode`s.

### 3. `NarrativeEngine` does not write patches
Ink produces narrative text and choices. It does NOT return `StatePatch[]`. Mechanical state changes (HP, items, conditions) must come from engine reducers or be applied manually in `main.ts`.

### 4. `applyPatches` uses path traversal
Patch paths are JSON-pointer style: `/player/hp`, `/world/danger`, `/locations/0/exits/0/visible`. The function mutates via `structuredClone`, so the returned object may have extra fields not in the original web state.

### 5. `buildNpcs()` must include `locationId`
`getNpcsAtLocation()` filters by `npc.locationId === locationId`. `lastSeen` is only for display.

---

## Build & Test

```bash
# Full build (content + web)
npm run build

# Dev server
npm run dev          # from apps/web

# Typecheck only
cd apps/web && npx tsc --noEmit
cd packages/engine && npx tsc --noEmit

# Tests
cd packages/engine && npm test    # vitest — 1 death-handling test currently failing
cd apps/web && npm test           # no tests yet — exits 0
```

---

## Active Issues (do not lose track of these)

1. **Engine death-handling test** — ✅ resolved in Session 2. All 9 engine tests
   pass.
2. **Web unit tests** — ✅ minimal coverage in place (9 specs covering
   `createGameFromCreation`, command dispatch, location/exits integrity,
   tale tone). Wider coverage lands in Phase 4.
3. **Playwright smoke** — present at `apps/web/tests/smoke.mjs`; verified
   booting against the Vite preview. Browser binary download is sandbox-
   blocked locally but CI installs it.
4. **Locations have exits** — ✅ wired. `apps/web/src/data/worldLoader.ts`
   maps `content/world-data/locations.json` exits into the game state.
   `moveReducer` honors them mechanically and discovery side-effects fire
   on first entry. Ink-driven movement still complements this.
5. **Audio first-command sync** — ✅ resolved in Phase 3a. `AudioEngine.start()`
   is now async; `apps/web/src/main.ts` awaits it before the first
   `updateFromGameState()` so the first command's audio adaptation no
   longer runs on an uninitialized engine.

---

## Design Directive

> "UX/UI team = wild imaginative mad scientists with free reign."

The UI should feel like an artifact from the game world. Don't be afraid of unusual layouts, atmospheric effects, or unconventional interaction patterns — as long as they are accessible and mobile-reachable.

---

## File Ownership

| Concern | Primary Files |
|---------|--------------|
| Game state model | `packages/types/src/index.ts` |
| Web state builder | `apps/web/src/game.ts` |
| Command routing | `apps/web/src/main.ts` |
| Ink runtime | `packages/narrative/src/NarrativeEngine.ts`, `InkBridge.ts`, `ContentLoader.ts` |
| Engine reducers | `packages/engine/src/reducers/*.ts` |
| State patches | `packages/engine/src/state-adapter.ts` |
| Audio | `packages/audio/src/AudioEngine.ts` |
| Ink source | `content/narrative/*.ink`, `content/narrative/scenes/*.ink` |
| UI components | `apps/web/src/components/*.ts`, `apps/web/src/screens/*.ts` |
