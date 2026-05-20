# Phase 8b + 8c + 8d — Parallel Batch Plan

The three remaining 8-cluster story-engine fixes ship in parallel
because none of them touch each other's files. Each unit is a
self-contained PR into `claude/codebase-audit-plan-n0dx0` (the
integration branch, NOT master).

## Research summary

| Concern | Finding |
|---|---|
| IntentClassifier location | `packages/llm-client/src/IntentClassifier.ts` (325 lines) — owns regex map, LLM call, and a 200-entry LRU cache. Existing tests: `IntentClassifier.test.ts` (118 lines). |
| Ink scene graph | 11 `.ink` files under `content/narrative/scenes/`, plus `content/narrative/main.ink` (94 lines) which `INCLUDE`s them. Build pipeline: `scripts/build-content.mjs`. |
| `scripts/validate-content.mjs` | Referenced from `package.json:21` (`content:validate` script) but absent on disk. The build script (`build-content.mjs`) does compile-time syntax checking but no cross-file knot validation. |
| Synthetic Ink jump sites | Already mapped in `docs/PHASE_7_PUNCH_LIST.md §6` — four sites in `packages/narrative/src/NarrativeEngine.ts:111,118,125,132`. |
| `RollBand` vs `ResultBand` | `ResultBand` (7-value) exists today in `packages/types/src/index.ts:19`. `RollBand` is the NEW coarse-grained classification 8d adds — a 4-band layer (`disaster | failure | success | triumph`) that maps to `TaleTone` (`quiet | warning | danger | success | cosmic`). |
| Reducer tale-tone usage | 7 reducers under `packages/engine/src/reducers/*.ts` emit tale entries via `makeTaleEntry(game, title, body, tone)` with hardcoded tones. No consistency check today. |
| Engine test count | 113 (the floor); apps/web 27. |

## Work units (3)

### Unit 8b — IntentClassifier hardening

**Files:** `packages/llm-client/src/IntentClassifier.ts` + `packages/llm-client/src/IntentClassifier.test.ts`.

**Goal:** Tighten the parser misroutes — three concrete deliverables:

1. **Audit + tighten the regex map.** The current regex map maps free-text to `ReducerKind` (`move | combat | rest | item | dialogue | investigation | narrative_only`). Identify at least three regex patterns that currently misroute — common misfires to look for:
   - `"talk to <X>"` routing to `move` instead of `dialogue` because of a leading directional verb in `<X>` (e.g. `"talk to the man at the gate"`).
   - `"break the lock"` routing to `combat` because of `"break"` (should route to `investigation` or `item`).
   - `"rest"` as a substring (`"restless crowd"`) triggering `rest` reducer.

   Pick the three that are real (read the regex map, test against likely free-text), document them as "before" in commit message, and fix.

2. **Tighten the LLM JSON-mode prompt.** Read the existing prompt; if it doesn't already force `response_format: { type: "json_object" }` AND embed a strict schema description, do so. The current prompt likely allows the model to wander into prose. Goal: classification round-trip latency is the same but the parse-failure rate drops.

3. **Add regression specs.** For each fix in (1) and (2), add a vitest case in `IntentClassifier.test.ts` that asserts the new behavior. Existing pattern: the test file mocks the LLM client and asserts which `ReducerKind` the classifier returns. At least 4 new cases total.

**Out of scope:** Don't redesign the LLM client; don't change the public API surface; don't touch the cache invalidation logic (it works).

**E2E:** Skip browser e2e — the classifier is upstream of the UI. Unit tests are the verifier.

---

### Unit 8c — Ink scene routing validator

**Files:** `scripts/validate-content.mjs` (CREATE) plus any dead-jump fixes you find in `content/narrative/scenes/*.ink` or `content/narrative/main.ink`.

**Goal:** Build the validator that `package.json:21` already references but doesn't ship.

**Required behavior:**

1. Read every `.ink` file under `content/narrative/` recursively.
2. Parse out:
   - `INCLUDE scenes/<file>.ink` directives.
   - Knot definitions (lines matching `=== knot_name ===` and `=== knot_name`).
   - Knot references (every `-> knot_name` outside comments).
3. Validate that every `-> X` target resolves to a defined knot, OR to one of the reserved tokens `DONE`, `END`, `->->` (the function-return marker). Cross-file references must resolve through the include graph.
4. Validate the four synthetic-jump construction sites in
   `packages/narrative/src/NarrativeEngine.ts` (lines 111, 118, 125, 132):
   - `combat_<encounterId>` — for every encounter id the engine
     might pass in, the matching `combat_<id>` knot must exist.
     Since encounter IDs are dynamic, the script should look for at
     least one `combat_*` knot definition as a sanity check and
     warn (not fail) if there are dispatcher patterns without a
     fallback `combat_default` knot.
   - `dialogue_<npcId>` — same shape; check against NPC IDs in
     `content/world-data/npcs.json`.
   - `consequence_<consequenceId>` — same shape; check against
     consequence type ids in `content/world-data/*.json`.
   - `legacy_death` — must exist as a knot (it's the hardcoded
     fallback).
5. Exit code 0 on clean; 1 on any unresolved jump. Print a tidy
   report: `<file>:<line>: -> X (no such knot)`.
6. Implementation language: Node.js ESM (`.mjs`), same shape as
   `scripts/build-content.mjs`. No new dependencies.
7. Wire it: nothing to wire — `npm run content:validate` already
   points to this file path.

**If you find dead jumps:** Fix them in the .ink source. If the dead
jump represents a missing scene knot the design clearly intended,
add a stub knot with a TODO comment and `-> DONE`. Document any
fixes in your PR body.

**Out of scope:** Don't compile the Ink (`build-content.mjs` already
does that). Don't validate variable references or function calls
inside Ink. Just knot resolvability.

**E2E:** Run `npm run content:validate` from repo root — must exit 0.
As a sanity check, temporarily introduce a `-> definitely_not_a_knot`
line into one .ink file, run the validator, confirm it exits 1
with a tidy report pointing at that exact line, then revert.

---

### Unit 8d — RollBand enum + reducer tale-tone consistency

**Files:**
- `packages/types/src/index.ts` — add `RollBand` type + `RollBand → TaleTone` mapping helper.
- `packages/engine/src/reducers/combatReducer.ts`, `dialogueReducer.ts`, `itemReducer.ts`, `restReducer.ts`, `conditionReducer.ts`, `deathReducer.ts`, `investigationReducer.ts`, `moveReducer.ts` — audit each `makeTaleEntry(...)` call site against the mechanical outcome.
- `packages/engine/tests/roll-band-consistency.spec.ts` — NEW spec file.

**Goal:** Add a coarse `RollBand` classification AND assert that
reducer narrative tone matches the mechanical outcome.

**Specific work:**

1. **Add `RollBand` to canonical types:**
   ```ts
   export type RollBand = 'disaster' | 'failure' | 'success' | 'triumph';
   export function rollBandToTaleTone(band: RollBand): TaleTone {
     switch (band) {
       case 'disaster': return 'danger';
       case 'failure':  return 'warning';
       case 'success':  return 'success';
       case 'triumph':  return 'cosmic';
     }
   }
   export function resultBandToRollBand(r: ResultBand): RollBand {
     if (r === 'critical_failure' || r === 'failure') return 'disaster';
     if (r === 'partial_failure' || r === 'success_with_cost') return 'failure';
     if (r === 'clean_success' || r === 'strong_success') return 'success';
     return 'triumph';  // critical_success
   }
   ```
   Re-export from `packages/types/src/index.ts` (the canonical file).

2. **Audit reducer tale-entries.** For each reducer, find pairs
   like `if (rollFailed) { ...narrative.push(makeTaleEntry(..., 'success')) }` — a tone that contradicts the mechanical outcome. Most reducers in the engine today are already self-consistent; you're looking for outliers and locking the invariant in with the spec below.

3. **Write the consistency spec** at
   `packages/engine/tests/roll-band-consistency.spec.ts`:
   - Drive each reducer through both a clear-failure and a
     clear-success roll outcome (use the existing
     `tests/fixtures.ts` Game builder + a seeded RNG).
   - Assert: tale entries emitted on the failure path have tone
     `'warning'` or `'danger'` (never `'success'` or `'cosmic'`);
     tale entries emitted on the success path have tone
     `'success'` or `'cosmic'` (never `'danger'`).
   - At least 6 cases total across the reducers.

4. **Fix any inconsistencies** the spec surfaces (low likelihood;
   the reducers I sampled looked OK). Note in the PR body which
   reducer paths you had to adjust.

**Out of scope:** Don't refactor reducer signatures. Don't change
how `makeTaleEntry` works. Don't introduce `RollBand` as a return
type from `rollD20` (Phase 9 will do that as part of combat
rewrite). This phase just adds the type + the consistency
guarantee at the test level.

**E2E:** Skip — pure engine work. Unit tests are the verifier.

## Worker conventions

Discovered during research:

1. **Branch target.** All PRs go into `claude/codebase-audit-plan-n0dx0` (the integration branch), NOT master.
2. **No `_compiled/` content commits.** The build pipeline regenerates `content/_compiled/*.json` and `apps/web/public/content/_compiled/*.json` with new timestamps every build. Workers MUST revert these from their final commit (`git checkout -- content/_compiled/ apps/web/public/content/_compiled/`). Real content changes live in `content/world-data/*.json` and `content/narrative/scenes/*.ink`.
3. **Logger discipline.** Use `getLogger()` from `@first-perception/types` (or the engine's own logger import), never bare `console.warn` / `console.error`.
4. **No `*/server` imports from `apps/web/**`.** The persistence package has a server entrypoint that must not bleed into the browser bundle.
5. **Test floor.** The engine package must hold its 113 test count; apps/web must hold its 27. Adding tests is encouraged; subtracting requires a paragraph of justification in the PR body.
6. **Bundle leak grep.** After any build, run `grep -cE "api\\.anthropic\\.com|api\\.moonshot\\.cn|sk-ant|postgres://" apps/web/dist/assets/*.js` — must return 0 across all matches.
7. **Verify chain.** Every PR must show clean output from `npm run typecheck`, `npm run build:packages`, `npm test`, and (for changes that touch apps/web or content) `npm run build`.

## E2E recipe summary

| Unit | Recipe |
|---|---|
| 8b | Unit tests only. The classifier is upstream of UI — no browser flow to exercise. |
| 8c | `npm run content:validate` from repo root must exit 0. Sanity: introduce a fake `-> nope` jump, confirm exit 1 + tidy error, revert. |
| 8d | Unit tests only. Pure engine work; no UI surface. |

None of the three units need a dev server, screenshot, or browser interaction.

## Worker instructions (shared template)

Each agent receives the worker instructions verbatim:

> After you finish implementing the change:
> 1. **Simplify** — Invoke the `Skill` tool with `skill: "simplify"` to review and clean up your changes.
> 2. **Run unit tests** — Run `npm test` from the repo root. The full chain is `npm run typecheck && npm run build:packages && npm test`. Your unit's tests must pass; the engine 113 + apps/web 27 floor must hold (unless your unit explicitly justifies a change).
> 3. **Test end-to-end** — Follow the e2e recipe in the per-unit prompt. If the recipe says "skip e2e", skip it. For 8c specifically: run `npm run content:validate` from repo root, confirm exit 0; introduce a fake bad jump as a sanity check, confirm exit 1, revert.
> 4. **Commit and push** — Commit all changes with a clear message. Revert any `content/_compiled/*` or `apps/web/public/content/_compiled/*` files (timestamp drift only). Push your worktree branch and open a PR with `gh pr create --base claude/codebase-audit-plan-n0dx0` (NOT master). Use a descriptive title like "Phase 8b: IntentClassifier hardening".
> 5. **Report** — End your message with a single line: `PR: <url>`. If `gh` is unavailable or the push fails after retries, end with `PR: none — <reason>`.
