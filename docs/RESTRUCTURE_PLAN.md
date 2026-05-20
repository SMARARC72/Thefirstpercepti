# Restructure Plan — Tabletop-Depth Refactor

Date: 2026-05-20
Author: Claude (planning pass)
Branch: `claude/codebase-audit-plan-n0dx0`

## What you said

> Step back, fix and expand screens + UI, fix the story engine, add true
> character development + sheet, full inventory, item rarity, forging
> + ranking, use DnD 5e (and adjacent tabletop) rules as the foundation.
> Right now it still looks and feels like a SaaS dashboard.

## Decisions locked

| Question | Answer |
|---|---|
| 5e adoption | **Layered** — keep our 9-stat (body/grace/sense/mind/will/presence/authority/ruin/creation); add 5e mechanics on top (advantage/disadvantage, action economy, dice expressions, item rarity, attunement, conditions, proficiency bonus, spell slots). |
| Story engine issues to fix | **Command parser misroutes**, **Ink scene routing**, **Narrative/mechanics desync** (tale entries reflecting roll bands honestly). LLM fallback aggressiveness is *fine as-is*. |
| Execution model | **Hybrid** — 6 truly-independent units run in parallel via batch agents NOW; the foundation work (schema, reducer rewrites, screen wiring) runs serially as Phase 7–11. |

## What the research surfaced

- `packages/types/src/index.ts` is 753 lines and touched by **every** reducer, every screen, every save format. Any unit that edits it blocks 4–6 others. → keep parallel units off this file.
- `packages/engine/src/reducers/*.ts` (7 reducers) all share `engine-utils.ts`. Rewriting one ripples. → reducer rewrites are foundation work, not parallel.
- `apps/web/src/screens/GameplayScreen.ts` wires every panel. → adding panels is fine; *wiring* them serializes there.
- `packages/engine/src/engine/CharacterCreation.ts` (1579 lines, legacy v1 surface) is still exporting types and seeding world generation. → foundation work needs to absorb it.
- `content/world-data/*.json` row counts are tiny right now: 5 conditions, 4 factions, 4 locations, 3 NPCs, a handful of items. → *huge* room to expand without touching code.

## The plan

### Wave 1: Parallel batch (6 units, dispatch now)

Each unit is fully self-contained, lands in an isolated worktree, opens its own PR, and ships independently. No unit touches `packages/types/src/index.ts`, the existing reducers, `game.ts`, or any wiring file shared by another unit.

#### Unit 1 — Dice expression engine
**Files (new):**
- `packages/engine/src/dice-expression.ts`
- `packages/engine/tests/dice-expression.spec.ts`
- `packages/engine/src/index.ts` (additive re-export only)

**Scope:** Pure module that parses and rolls 5e-style dice expressions: `1d20+5`, `2d6+3`, `4d6kh3` (keep highest 3), `1d20kh1` (advantage), `1d20kl1` (disadvantage). Takes a seeded RNG so output stays deterministic. Public API: `parseDiceExpression(expr: string): ParsedDice`, `rollDice(expr: string, rng: SeededRNG): DiceRoll`. No consumers wired in this unit — foundation phase picks it up.

**Tests:** Parser unit tests (valid/invalid expressions), roll-result range tests with fixed seeds, advantage/disadvantage selection assertions.

#### Unit 2 — Item rarity, attunement, forging primitives
**Files (new):**
- `packages/engine/src/item-rarity.ts`
- `packages/engine/src/forging.ts`
- `packages/engine/tests/item-rarity.spec.ts`
- `packages/engine/tests/forging.spec.ts`
- `content/world-data/rarity-tiers.json`
- `content/world-data/forging-recipes.json`
- `packages/types/src/items-5e.ts` (new file — NOT edits to existing types/index.ts)

**Scope:** Pure modules + content data. Rarity tier ladder (common → uncommon → rare → very rare → legendary → artifact) with mechanical modifiers, attunement-slot bookkeeping helpers, and a `attemptForge(recipe, materials, smithRoll): ForgeOutcome` function. Forging recipes are JSON: inputs (material items + quantities), output item template, smith DC, success/partial/failure narrative hooks. `items-5e.ts` defines `RarityTier`, `AttunementRequirement`, `ForgeRecipe` interfaces *separately* — Wave 2 foundation phase merges them into the canonical `Item` type.

**Tests:** Rarity comparison + tier-bonus tests; forge-success / forge-partial / forge-failure paths; recipe validation.

#### Unit 3 — 5e condition catalog + effect resolver
**Files (new):**
- `content/world-data/conditions-5e.json`
- `packages/engine/src/condition-effects-5e.ts`
- `packages/engine/tests/condition-effects-5e.spec.ts`
- `packages/types/src/conditions-5e.ts`

**Scope:** Author the 14 canonical 5e conditions (blinded, charmed, deafened, exhaustion 1–6, frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned) as JSON with category, mechanical effects, narrative blurb, and recovery vector. A pure `evaluateConditions(conditions: ConditionStack[]): { disadvantage: Set, advantage: Set, skipTurn: boolean, hasSpeed: boolean }` resolver. Does NOT touch `conditions.json` (that's the cosmic-horror set; both coexist).

**Tests:** Each condition's effect map; exhaustion stacking 1→6 with cumulative penalties; resolver for stacks of overlapping conditions.

#### Unit 4 — CharacterSheetPanel component
**Files (new):**
- `apps/web/src/components/CharacterSheetPanel.ts`
- `apps/web/src/styles.css` (append-only new section, with a sentinel comment to prevent merge conflict with Unit 5)

**Scope:** A new panel component (does NOT replace `StatusPanel`; both coexist). Renders a full character sheet: 9 stats with `(stat - 10) / 2`–style modifiers as a sidebar callout, proficiency bonus (computed from turn count milestones), hit dice tracker (placeholder; foundation phase wires real data), Armor Class derived from `grace + form bonus`, passive perception (sense-based), saving throw rows. Reads from `game.player` *only*; no writes. Visually styled in the grimoire register (sigil-gold headings, Cormorant body, paper-grain).

**Wire-up deferred:** This unit does NOT touch `GameplayScreen.ts`. Wiring lands in foundation Phase 8a.

#### Unit 5 — InventoryPanel component
**Files (new):**
- `apps/web/src/components/InventoryPanel.ts`
- `apps/web/src/styles.css` (append-only new section, with a sentinel comment to prevent merge conflict with Unit 4)

**Scope:** A new panel component for a grid-style inventory. Slot tiles with rarity-tier borders (common = bone, uncommon = moss, rare = teal, very rare = twilight, legendary = sigil-gold, artifact = ember). Weight totals, attunement counter (3/3), item hover tooltip with full description + effects. Equip/unequip buttons fire `onEquip(itemId)` / `onUnequip(slot)` callbacks (props; the orchestrator wires them in foundation phase). Drag-and-drop NOT in scope.

**Wire-up deferred:** Wiring lands in foundation Phase 8a.

#### Unit 6 — Design docs + authoring guides
**Files (new):**
- `docs/RULES.md` — the canonical "what we picked from 5e and what we didn't" decision log
- `docs/CHARACTER_SHEET.md` — sheet schema spec + tooltip glossary
- `docs/AUTHORING_5E_ITEMS.md` — how content authors add a 5e item to `items.json`
- `docs/AUTHORING_FORGING_RECIPES.md` — how forging recipes are authored
- `docs/STORY_ENGINE_AUDIT.md` — captures the three story-engine issues we'll fix in foundation phase (parser misroutes, Ink routing, narrative/mechanics desync) with concrete reproduction steps so the foundation worker has a clear punch list

**Scope:** Pure documentation. No code, no JSON, no tests.

### Wave 2: Serial foundation (queued in progress.md as Phases 7–11)

These cannot run in parallel because they all touch shared schema or wiring. Each ships in one push after Wave 1 lands.

| Phase | Scope |
|---|---|
| 7 | Extend `Player` schema: proficiency bonus, hit dice, saving throw proficiencies, attunement slots, spell slots (if a posture grants them). Extend `Item` schema: rarity, attunement, magical bool, requires (form / posture / domain). Merge Unit 2's `items-5e.ts` types into canonical `Item`. Update `createGameFromCreation` + `buildStats`. |
| 8a | Wire `CharacterSheetPanel` + `InventoryPanel` into `GameplayScreen` as two new tabs: "The Sheet" (replaces tab "The Vessel" as primary character view; old Status tab keeps the meters). "The Trove" (inventory). Update tab definitions, tab-id type. |
| 8b | Story engine fix: command parser misroutes. Audit `IntentClassifier` cache + regex map; tighten the LLM JSON-mode prompt; add a small regression spec set with the cases that misfire today. |
| 8c | Story engine fix: Ink scene routing. Walk every scene file; verify every `-> knot_name` resolves; fix the dead jumps; add `npm run content:validate` enforcement. |
| 8d | Story engine fix: narrative/mechanics desync. Every reducer's tale-entry body must mention what mechanically happened (e.g. "miss" maps to a tale entry that doesn't claim damage was dealt). Add a test that asserts roll band ↔ tale tone consistency. |
| 9 | Forging UI: a new "The Anvil" view that surfaces inventory materials, valid recipes, smith roll, success/failure prose. Plus combat reducer rewrite to use dice expressions + 5e action economy (action + bonus action + reaction). |
| 10 | Spell/ability system (only if a posture or form grants spellcasting; minimal scope first). |
| 11 | The original Phase 7+8 from the earlier plan: Sentry, streaming LLM tokens, bundle budget CI gate, "The Lens" settings drawer, Witness Briefing. Re-numbered, not dropped. |

## E2E test recipe for Wave 1

The Wave 1 units are additive — they ship new files only, no UI is wired yet. Concrete recipe each worker follows:

1. From repo root, run the worker's own unit test file via `npm test` (or `npm --prefix packages/engine test` etc. — the worker discovers via package.json scripts).
2. Run `npm run typecheck` from repo root. Must be clean.
3. Run `npm run build:packages` from repo root. Must be clean.
4. Run `npm run build` from repo root. Web build must produce no errors and the bundle leak grep (`grep -cE "api\\.anthropic\\.com|api\\.moonshot\\.cn|sk-ant|postgres://" apps/web/dist/assets/*.js`) must return 0.
5. Smoke (Playwright) is **opt-in** — the Wave 1 units are not user-visible yet. The worker may skip e2e with the note: "skip e2e — unit not yet wired; foundation phase exercises the surface".

If a worker's unit has a UI surface that *is* user-visible (no Wave 1 unit does, but if I missed a case), they should add a self-contained `<demo>` page under `apps/web/demos/<unit>.html` they can `vite preview` against.

## Why not full parallel batch

Six units instead of 20 because the dependency graph is unforgiving: every "deep" mechanical change (combat rewrite, action economy, character sheet wiring, the parser fix) all converge on `types/index.ts`, the seven reducers, or `GameplayScreen.ts`. Twenty agents editing those files would produce a 50%+ rework rate. The hybrid lands the additive 30% of work in parallel safely; the foundation work lands deterministically in single-author pushes.

## Worker prompt template (used in Wave 1 dispatch)

Each agent receives:
1. The overall goal (this user instruction).
2. Their specific unit (title + file list + scope + tests).
3. Codebase conventions: use `getLogger()` not `console.warn`, never import `*/server` paths from `apps/web/**`, follow `CONTRIBUTING.md` for branch + commit style.
4. The Wave 1 e2e recipe above.
5. The standard worker-instructions block (simplify → test → e2e → commit + push → open PR → report `PR: <url>`).

## Approval requested

Approve this plan and I will:
1. Spawn 6 parallel `Agent` calls (worktree-isolated, background) for the Wave 1 units.
2. As completions arrive, render a status table and link the PRs.
3. After all 6 land (or fail honestly), summarize and queue Wave 2 as Phase 7 in `progress.md` for the next session.
