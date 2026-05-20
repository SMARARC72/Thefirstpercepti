# UX/UI Audit — The First Perception

**Audit date:** 2026-05-20
**Branch reviewed:** `claude/codebase-audit-plan-n0dx0` at `e86e111`
**Method:** static code walkthrough across all screens + components, dev server boot verification, smoke test review. Did not execute interactive Playwright (environment is headless container).

## TL;DR

**The game is playable end-to-end.** The smoke test (`apps/web/tests/smoke.mjs`) exercises the full happy path — demo mode → quick action → narrative update → location travel → save → reload → restore → exit — and runs green in CI. The dev server boots, the HTML shell loads, all 262 unit tests pass, the build produces a 217 kB main.js (within budget), and the bundle leak grep is clean.

**The Wave-2 restructure left UX debt.** The story-engine + schema + combat rewrite work landed cleanly, but several of the *human* touchpoints — the tabs the player actually clicks, the feedback they read — drifted out of consistency. Three duplicated surfaces, a couple of buttons that do nothing, and one entire UI affordance (spell casting) with no consumer. Worst offenders are dead weight that confuses new players.

Findings below ranked by player-impact. The top three would each take under an hour to fix.

## 1. Critical — player-facing dead weight

### 1.1 `StatusPanel` ("The Vessel") duplicates content the new tabs already show

`apps/web/src/components/StatusPanel.ts:60-119` renders:

| Section | Duplicated by |
|---|---|
| HP meter | (unique — keep) |
| Focus meter | (unique — keep) |
| 3×3 stat grid | `CharacterSheetPanel` ability scores |
| Tag cloud + conditions | (unique — keep) |
| Inventory list | `InventoryPanel` ("The Trove") |
| Journal list | `JournalPanel` ("The Witness") |

Per the Phase 8a directive ("`old Status tab keeps the meters`"), the inventory + journal sections in StatusPanel should be **removed**. The stat grid is a judgment call — keeping it gives a compact at-a-glance view that complements the Sheet's deeper layout. But the inventory + journal duplication is just dead weight that confuses the mental model: when the player asks "where do I see my inventory?", three tabs answer yes.

**Fix:** delete StatusPanel.ts lines 91-120 (inventory + journal blocks). Three-line clean-up.

### 1.2 The Anvil's "Forge" button is a stub

`apps/web/src/screens/GameplayScreen.ts:40-47`:

```ts
private handleForge = (recipeId: string): void => {
  // Phase 9b ships the UI only. The engine-side dispatch ...
  // Until that lands we log the intent so e2e + manual play can confirm
  // wiring without crashing on a missing reducer.
  this.anvilLogger.info("anvil.forge.intent", { recipeId });
};
```

The player clicks the button and **nothing observable happens** — no narrative, no inventory change, no rejection, not even a "this is coming soon" tale entry. This is the worst kind of fake button: it looks live, costs nothing, accomplishes nothing.

**Fix (minimal):** make `handleForge` push a tale entry like `makeTaleEntry(game, "The Anvil sleeps", "You ready the materials. The forge is not yet ready to answer. (Forging dispatch lands next turn.)", "quiet")` so the player gets immediate feedback. Disable the button until the real reducer lands, or remove the click handler.

**Fix (real):** wire a `forgingReducer` in the engine that consumes inputs, rolls the smith check via `dice-expression.ts`, emits a tale entry from the recipe's `successNarrativeKey` / `partialNarrativeKey` / `failureNarrativeKey`, and produces the output item via Wave 1's `attemptForge`. The mechanical primitives are all there; ~80 lines of glue.

### 1.3 Spell slots have no casting affordance

Phase 10 shipped `Player.spellSlots` + the "Glimpses" UI section on the CharacterSheet — but **no way to use them**. A witness player sees `Glimpses: Level 1: 2 / 2` and discovers via experimentation that no command consumes a slot. There's no "cast" verb in any reducer, no list of available spells, no button.

**Fix (minimal):** add an explanation to the Glimpses section like "Cast with `glimpse <target>`. Each casting consumes one Level 1 slot." and add a single `glimpse` keyword to the investigation reducer that consumes a slot and rolls a perception check (or whatever the simplest semantics are).

**Fix (real):** Phase 10b. Define 2-3 actual spells, a casting reducer, a SpellListPanel (or extend the Sheet) showing the spells with descriptions, and a verb. Defer if not on this milestone.

## 2. High-impact — discoverability

### 2.1 No LLM-status indicator

`settings.llmEnabled` defaults to `false` (`apps/web/src/game.ts:111`). New players run in regex-only mode without any UI signal that:

- The "Living World" subagents (`NPCSubagent`, `FactionSubagent`, `GMNarrator`) are dormant.
- Their narrative reads like the lower-end Ink fallback, not the richer LLM-synthesized passages.
- The Lens drawer has a toggle that fixes this.

Result: most new players experience the degraded narrative and leave thinking that's the game. There's no nudge.

**Fix:** small status pill in the gameplay header (next to time/region/weather strip) that reads "Living world: off" when `llmEnabled === false`, with a tooltip "Enable in The Lens for richer narrative." Or — simpler — a first-turn-only callout in TalePanel below the Witness Briefing that says the same.

### 2.2 Tab labels are diegetic but inconsistently mapped

The tab nav (`GameplayScreen.ts:64-76`) ships diegetic labels with explanatory `title=` tooltips. Quality varies:

| Label | Tooltip / mapping | Mapping clarity |
|---|---|---|
| The Unfolding | Tale | Excellent — body-of-narrative metaphor lands |
| What Waits | Fate — recent rolls | Confusing — "what waits" implies future, but it's a log of past rolls |
| The Sheet | Character sheet | Clear — terminology familiar to RPG players |
| The Trove | Inventory | Clear — pack/loot metaphor |
| The Anvil | Forging | Clear |
| The Vessel | Status — body and mind | Vague — "vessel" is poetic but doesn't telegraph HP/Focus/conditions |
| The Known | World — map and region | OK |
| The Powers | Factions | OK |
| The Met | NPCs you have crossed | Clear |
| Names of Things | Codex | Vague — no hint at what's catalogued |
| The Witness | Journal | OK |

Two specific cases bear renaming:
- **"What Waits" → "The Tally"** or **"The Reckoning"** (a record, which is what Fate is)
- **"Names of Things" → "The Catalogue"** or just **"Codex"** kept as-is

Hover-only tooltips fail on touch devices entirely.

**Fix:** rename the two outliers, add a small `(?)` glyph on first-visit-of-each-tab that surfaces the literal meaning + one-line description inline. The contextual reveal mechanic Phase 11 added means new tabs already appear when relevant — leverage that moment.

### 2.3 Conditions are bare text spans

`StatusPanel.ts:84-88` renders each condition as `<span>{condition.name}</span>` inside `.tag-cloud`. No tooltip, no icon, no remaining-turns indicator. The 5e condition catalogue (`packages/types/src/conditions-5e.ts` + the engine resolver) carries rich data — descriptions, levels for exhaustion, recovery vectors — none of which the player sees.

**Fix:** turn each condition span into a hoverable affordance:
- `title=` with the condition description
- `data-stacks` / `data-level` displayed as a subscript number for levelled conditions (exhaustion)
- `data-turns-remaining` as a fading visual cue (opacity, or a small "Nt" suffix)

## 3. Medium-impact — friction

### 3.1 Header action buttons lack onboarding

Save / Load / New Game / Settings in the gameplay header use diegetic labels: **Bind**, **Recall**, **Withdraw**, **⚙**. Cool. But new players don't know which is which. The `title=` tooltips work on desktop hover only.

**Fix:** when the user mouses over (or focuses with keyboard) any of these for the first time per session, show a small inline label below the button strip for ~3s. Alternatively: keep the diegetic words but pair each with a tiny icon (a knot for Bind, an ear for Recall, an open door for Withdraw, the existing gear for Settings).

### 3.2 No command history

The CommandDock input doesn't support up-arrow to recall prior commands. The smoke test path is "click a quick action, see what happened, type a follow-up" — but if the player typos, they retype.

**Fix:** maintain a per-session ring buffer of the last 16 commands. Up-arrow walks back; down-arrow walks forward; typing exits the history mode. ~30 lines in CommandDock.

### 3.3 Settings changes have no confirmation

The Lens drawer applies settings via `onSettingsChange(partial)` on each input change. Some changes (textSpeed, font size) take effect on the next render; others (llmEnabled) trigger an `initLLMLayer` call. There's no visual confirmation either way.

**Fix:** a subtle "saved" pill next to each setting that appears for 1.5s after a change. Reuses existing CSS tone variables.

### 3.4 The `restReducer` and `moveReducer` partial-failure-vs-failure asymmetry (Phase 8d agent note)

The Phase 8d agent flagged but didn't fix:

> "`partial_failure` band currently falls into the success branch in both `restReducer` and `moveReducer`. I considered fixing this but it would change mechanical behavior (whether the player advances/rests), beyond the 'tone-only' scope of 8d."

This means on a `partial_failure` rest roll, the player still recovers HP (success branch) but the tone is `warning`. Tonal split is in place; mechanical split isn't. Player sees mixed signals: "Your rest is restless" but HP went up the full amount.

**Fix:** in restReducer + moveReducer, branch on `RollBand` (4-band) instead of `ResultBand` (7-band) for the success/failure threshold, AND apply a half-effect on the `failure` band (= partial_failure / success_with_cost). One reducer-pair update; ~20 lines each. Tests already lock in the tonal invariant; mechanical assertions would need ~3 new specs.

## 4. Small wins — polish

| # | Item | Estimated effort |
|---|---|---|
| 4.1 | Empty-state copy audit for FactionsPanel, NpcsPanel, CodexPanel, JournalPanel (some still ship generic copy) | 20 min |
| 4.2 | `help` / `?` discoverability — surface as a quick action on turn 0 alongside the existing 5 | 5 min |
| 4.3 | Onboarding dismissal note "Press `?` any time for help" | 5 min |
| 4.4 | Per-tab `aria-labelledby` pairing — current `panel-{id}` ids don't have matching `tab-{id}` labels | 30 min |
| 4.5 | Focus-trap on Witness Briefing modal — `aria-modal="true"` is set but Tab key still escapes | 45 min |
| 4.6 | Focus-trap on The Lens drawer — same issue | 45 min |
| 4.7 | The `domainLabel(domain)` function display — humanise underscored values (`metaphysical` → `Metaphysical` instead of raw lowercase) — verify it does this | 10 min |
| 4.8 | Tale entry timestamp / turn pill is per-entry but doesn't include the time-of-day phase — minor delta | 15 min |

## 5. Verification status

**The game IS playable.** Specific evidence:

| Check | Status | Source |
|---|---|---|
| Dev server boots | ✓ | `npx vite --port 5173` returns the HTML shell |
| Build clean | ✓ | `npm run build` 1082 modules, 3.11s, no errors |
| Unit tests | ✓ | 262/262 across 5 workspaces |
| Bundle leak grep | ✓ | 0 hits across all 4 sentinels |
| Bundle budget | ✓ | All 3 tracked assets within budget |
| Content validate | ✓ | 14 .ink files, 119 diverts, 0 unresolved |
| End-to-end smoke | ✓ | `apps/web/tests/smoke.mjs` covers demo → quick action → narrative → travel → save → reload → restore → exit; runs green in CI |
| Save/load round-trip | ✓ | Smoke test steps 7-8 |
| Cross-location travel | ✓ | Smoke test step 6 |
| Character creation flow | (untested interactively) | 6-step form with validation per step, exists at `apps/web/src/screens/CreationScreen.ts` |
| Death + legacy flow | (untested interactively) | Screen + ceremony exist at `apps/web/src/screens/DeathScreen.ts`; smoke test does NOT trigger death |

**Untested in this audit:** interactive character creation, interactive death + legacy, interactive Anvil click, interactive Briefing dismissal. All should be wired into the smoke test in a follow-up.

## 6. Recommended fix order (one session)

If you wanted a single focused pass on UX, the order I'd take:

1. **Delete StatusPanel dupe sections** (§1.1). 5 min. Highest signal-to-noise.
2. **Wire `handleForge` to a forging reducer** (§1.2 real fix). 60 min. The Anvil becomes a live system.
3. **Add LLM-status pill in the gameplay header** (§2.1). 20 min. Critical for player perception of narrative quality.
4. **Fix partial_failure mechanical split** in rest/move reducers (§3.4). 45 min. Closes the tone-vs-mechanic gap.
5. **Empty-state + help-affordance polish** (§4.1–4.3). 30 min. Quick wins.

Total: ~2.5 hours for a substantially-improved UX baseline.

## 7. Out of scope (defer)

- Sentry wiring (Phase 11b remaining)
- End-to-end LLM streaming integration (Phase 11b remaining)
- Full accessibility audit + focus traps (Phase 11b remaining; partially captured in §4.5, §4.6)
- Mobile touch-target audit (separate pass)
- Performance / animation timing review (separate pass)
