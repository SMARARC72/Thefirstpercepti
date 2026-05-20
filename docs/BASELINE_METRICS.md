# Baseline Metrics — Post-Wave-1

Snapshot taken at `claude/codebase-audit-plan-n0dx0` HEAD on
2026-05-20, after Wave 1 (six units) and the follow-up reducer
bugfixes (PR #7) merged. Every subsequent phase logs the delta in
its `progress.md` "Verify" block against these numbers, so
regressions are caught early and budgets stay honest.

> **Phase 7 update (same date):** schema extension + mirror consolidation landed.
> Bundle delta: `main.js` 192.55 → 193.08 kB raw (+0.53 kB), gzip 55.31 → 55.47 kB
> (+0.16 kB). `vendor.js` + `main.css` unchanged. Test count unchanged at 113 engine +
> 25 apps/web (the new schema fields are exercised by existing tests via fixture
> updates; no new specs). Leak grep still 0. The two type mirrors are gone:
> `packages/engine/src/items-5e-types.ts` deleted, the inline `Condition5e*` block at
> the top of `packages/engine/src/condition-effects-5e.ts` replaced with an
> import-and-re-export from `@first-perception/types`.
>
> **Phase 8a update (same date):** `CharacterSheetPanel` + `InventoryPanel` wired
> into `GameplayScreen` as the new tabs "The Sheet" and "The Trove". Bundle delta:
> `main.js` 193.08 → 202.21 kB raw (+9.13 kB), gzip 55.47 → 58.03 kB (+2.56 kB) —
> the two panel components land in the bundle (they were tree-shaken before
> wiring; this is the expected Phase 8a tilt). `vendor.js` + `main.css` unchanged.
> Test count 25 → 27 apps/web (added two specs for canonical-field reading;
> hand-rolled DOM shim in `tests/character-sheet-panel.spec.ts` replaced with
> happy-dom, standardising the apps/web test environment). Leak grep still 0.
> 1077 → 1079 modules through vite.
>
> **Phase 8b + 8c + 8d update (same date — parallel batch, merged together):**
> Three independent story-engine fixes landed via PRs #8 / #9 / #10:
>
> - **8b (IntentClassifier hardening):** llm-client suite 35 → 49 (+14 specs).
>   Three confirmed misroutes fixed (`break the lock` → investigation;
>   `go talk to <x>` → dialogue; `stalk` no longer matches `talk` substring),
>   stem-prefix `\bword\w*\b` matching so inflected forms (`attacking`,
>   `speaking`, `named`, `reading`) keep routing to the right domain. LLM prompt
>   embeds explicit schema. (Codex P2 review caught + fixed before merge.)
> - **8c (validator):** `scripts/validate-content.mjs` ships, exit 0 on the
>   current corpus (14 .ink files, 64 knots, 119 diverts). Soft-warns on
>   `npc-keeper` missing dialogue knot (expected fallback). (Codex P1 review
>   caught dotted-divert head-fallback + fixed before merge; validator now
>   requires the full qualified `knot.stitch` name.)
> - **8d (RollBand):** engine suite 113 → **127** (+14 specs). Canonical
>   `RollBand` type + `rollBandToTaleTone` / `resultBandToRollBand` helpers in
>   types package. One reducer tone fix: `combatReducer.ts` `'Slain'` tone
>   `'danger'` → `'quiet'` (success-branch entries must never be `'danger'`).
>
> Bundle: `main.js` 202.21 → **203.83 kB** raw (+1.62 kB), gzip 58.03 → 58.68
> (+0.65 kB). `vendor.js` + `main.css` unchanged. Leak grep still 0. Total
> tests across all workspaces: 201 → **231** (+30).
>
> **Phase 9 update (same date — parallel batch):** combat reducer rewrite + Player bridge growth (PR #12) and Forging UI "The Anvil" tab (PR #11). Engine 127 → 142 (+14 combat-reducer specs + 1 Codex-P2 regression at `1aabb08` that locks in the full-object `actionEconomy` patch fix). apps/web 27 → 38 (+11 AnvilPanel specs). Bundle: `main.js` 203.83 → **213.09 kB** raw (+9.26 kB total — +6.18 from Anvil panel + helpers, +3.07 from combat rewrite); `main.css` 44.75 → **48.85 kB** (+4.10 kB from `.anvil-panel` block). vendor unchanged. Leak grep 0. Total tests: 231 → **256**.
>
> **Phase 10 update (same date):** posture-driven spell slots (minimal scope). `witness` posture seeds `spellSlots: { 1: { current: 2, max: 2 } }` at creation; all other postures stay `undefined`. CharacterSheetPanel renders a "Glimpses" section conditionally. Engine 142 → **145** (+3 `spell-slots.spec.ts` cases); apps/web 38 → **40** (+2 panel cases). Bundle `main.js` 213.09 → **213.84 kB** raw (+0.75 kB — just the conditional Glimpses renderer + the posture-gate helper). Total tests: 256 → **260**.
>
> **Phase 11 (first pass — same date):** three highest-leverage items from the original Phase 11 cluster. Other items (Sentry wiring, streaming LLM tokens, "The Lens" settings drawer, full accessibility audit) stay queued for a follow-up.
>
> - **Bundle budget gate** — `scripts/check-bundle-budget.mjs` ships; `npm run bundle:check` wraps it; CI now runs both `content:validate` (was missing) and `bundle:check` as required steps. Budgets anchored at this baseline with ~6 kB main.js raw headroom: `main.js` 220 kB raw / 65 kB gzip, `main.css` 55 kB raw / 12 kB gzip, `vendor.js` 470 kB raw / 130 kB gzip. Over-budget triggers exit 1; missing tracked asset triggers exit 2. Future PRs that push past either tighten or raise the budget here with an audit trail.
> - **Contextual tab reveal (The Anvil)** — `GameplayScreen` filters out the Anvil tab when the player carries no item matching any recipe input. Below that threshold the forge has nothing to do; hiding the tab removes a dead surface for new characters. Static-at-render filter (no live tab list updates) — minimal scope; the next render after a screen transition picks up the latest state.
> - **Witness Briefing** — `OnboardingOverlay` upgraded from a one-line input tip to a proper first-run modal that grounds the player in the cosmic-horror premise (the Shattering, the Witness role, the reincarnation/legacy loop) AND the input mechanics. Single scannable screen with two body paragraphs + "I bear witness." dismiss button. `aria-modal="true"` + `role="dialog"` for assistive tech. Reuses the existing `game.onboardingDismissed` plumbing so it never re-shows for the same character.
>
> Bundle `main.js` 213.84 → **214.62 kB** raw (+0.78 kB — Witness Briefing copy + the anvil-contextual filter), `main.css` 48.85 → **48.93 kB** (+0.08 kB — briefing paragraph spacing tweak). All within budget. Test count unchanged at 262 (the Phase 11 work was UI copy / infra config / scripts, none of which warranted new specs over what was already covered).
>
> **Phase 11b (same date) — streaming typewriter + Lens drawer:**
>
> - **Streaming tale entries** — `TalePanel.buildEntry` now uses the existing `TypewriterText` component for the *newest* entry per render cycle. Settings-aware via `document.documentElement.dataset.textSpeed` (0 = instant); reduced-motion-aware (skips the effect entirely). Older entries on initial paint render statically. A new entry mid-type cancels the previous typewriter and backfills its body to the full text. Universal benefit — covers LLM merges, Ink scenes, reducer-generated tale entries, and the Briefing copy in one place. When future end-to-end LLM streaming integration lands, the typewriter becomes a no-op for already-chunked text.
> - **"The Lens" settings drawer** — `SettingsModal` morphs from a centred-modal layout to a right-anchored slide-in drawer. The `.modal-backdrop` overlay still dims the rest of the screen; a new `.settings-drawer-backdrop` variant turns off the grid-centring so the drawer can stretch to the right edge. New `.settings-drawer` CSS block (~70 lines) with `drawer-slide-in` keyframe animation, sticky header, scroll body. Reduced-motion respect (`[data-reduced-motion="true"] .settings-drawer { animation: none; }`). Escape key now closes the drawer (was missing previously); `keydown` listener is scoped to the instance and removed on destroy.
>
> Bundle `main.js` 214.62 → **217.19 kB** raw (+2.57 kB — TypewriterText wiring + drawer Escape handler + container markup), `main.css` 48.93 → **49.83 kB** (+0.90 kB — drawer CSS block). All assets still within budget (220 / 55 / 470 kB). Test count unchanged at 262.
>
> **UX audit batch (same date) — five-item polish pass on findings from `docs/UX_AUDIT.md`:**
>
> 1. **StatusPanel dedupe** — removed the inventory + journal blocks that duplicated The Trove / The Witness tabs after Phase 8a. The Vessel now shows only the unique content (HP, Focus, stats, conditions). 30 lines removed.
> 2. **Real `forgingReducer`** — new `packages/engine/src/reducers/forgingReducer.ts` (~145 lines) ships the engine-side dispatch for The Anvil. Consumes inventory inputs by `materialId` match, rolls a creation-stat smith check with proficiency, calls Wave 1's `attemptForge` for the outcome, emits a tale entry tone-matched to the result band (success / partial / failure), appends a stub-templated output item on success. `forge` verb wired in `apps/web/src/main.ts:runCommand` with a verb-level short-circuit so the LLM classifier (which doesn't know "forge") never misroutes. The Anvil panel's `onForge` callback now calls through to `runCommand('forge <recipeId>')`. New spec `forging-reducer.spec.ts` (5 cases) locks in the contract. Engine 145 → **150** (+5).
> 3. **LLM-status pill** — small "Living world: on/off" pill in the gameplay header world-strip, next to time/region/weather. `cursor: help` tooltip explains how to enable. Dynamic update on `llmEnabled` setting change. New CSS block (~25 lines).
> 4. **Rest + move RollBand restructure** — both reducers now branch on the coarse 4-band `RollBand` (via `resultBandToRollBand`) so the `partial_failure` / `success_with_cost` paths produce partial-effect outcomes (not the prior bug where they fell into full-success). New behaviour: rest on a failure-band roll heals 1-2 (vs 0 before, vs 4 wrongly attributed); move on a failure-band roll travels but no discovery + no stealth bonus. The Phase 8d roll-band consistency spec still passes after the refactor.
> 5. **Empty-state copy + help affordance** — `FactionsPanel` and `NpcsPanel` now show diegetic empty-state lines when their lists are bare ("No powers have noticed you yet"; "You have crossed no one yet"). Witness Briefing gains a third paragraph: "Type '?' any time to recall the verbs."
>
> Bundle: `main.js` 217.19 → **225.68 kB** raw (+8.49 kB — forging reducer + LLM pill + rest/move refactor + empty-state copy combined), gzip 62.07 → 64.85 (+2.78 kB). `main.css` 49.83 → **50.42 kB** (+0.59 kB — pill + onboarding hint CSS). Bundle budget gate caught the overrun on first run (main.js raw was at 220 kB ceiling); raised to 235 kB raw / 70 kB gzip with a `BUDGET_REVISIONS` audit-trail comment in `scripts/check-bundle-budget.mjs`. Total tests **262 → 267** (+5 forging-reducer specs).

## Tests

| Suite | Files | Tests |
|---|---:|---:|
| `packages/engine` | 7 | 113 |
| `apps/web` | 3 | 25 |
| `packages/persistence` | 3 | (run via `npm test`) |
| `packages/llm-client` | 3 | (run via `npm test`) |
| `packages/narrative` | 2 | (run via `npm test`) |
| `packages/audio` | 0 | 0 (passWithNoTests) |
| `packages/ui-system` | 0 | 0 (passWithNoTests) |

Engine and apps/web counts are the ones every phase should
preserve or grow. Phase 7's schema extension MUST keep the 113/25
floor; Phase 8d's `RollBand` work should add to engine; Phase 8a's
wiring should add to apps/web.

## Web bundle (post-build, vite production, no maps in transit)

| Asset | Raw | Gzip |
|---|---:|---:|
| `dist/index.html` | 1.36 kB | 0.67 kB |
| `dist/assets/main.css` | 44.75 kB | 9.57 kB |
| `dist/assets/main.js` | 192.55 kB | 55.31 kB |
| `dist/assets/vendor.js` | 455.80 kB | 123.88 kB |

**Total over the wire (gzip): ~190 kB.** Phase 11's CI budget gate
should anchor on this number; Phases 7–10 should report deltas in
their "Verify" block.

Wave 1 surface additions to the bundle (relative to pre-Wave-1):
- CharacterSheetPanel — currently tree-shaken (no consumer; ships
  only the CSS section). Phase 8a wires it and the JS lands.
- InventoryPanel — same; tree-shaken until Phase 8a.
- Engine modules (`dice-expression`, `item-rarity`, `forging`,
  `condition-effects-5e`) — tree-shaken at the apps/web bundle
  boundary until Phase 7 / 9 wires consumers.
- CSS appends (Wave 1 Unit 4 + Unit 5 sentinel blocks) — already
  in the 44.75 kB main.css count.

Phase 7 will tilt the bundle when Player/Item schema extensions
flow into `createGameFromCreation` + `GameplayScreen`. Phase 8a is
where the panel JS lands. Phase 9's combat rewrite + Anvil view is
the biggest expected increase before Phase 11's budget gate
constrains it.

## Build pipeline

- `npm run build` — 1077 modules transformed, ~3.5 s on this
  environment
- `npm run build:packages` — clean, all 7 workspace packages
- `npm run typecheck` — clean across packages + apps/web + api
- `npm test` — root script runs persistence + llm-client +
  narrative + engine + apps/web sequentially; `packages/audio` and
  `packages/ui-system` are excluded (they have no tests; both now
  carry `--passWithNoTests` so they don't break workspace-wide
  invocations)
- Bundle leak grep on `apps/web/dist/assets/*.js` — 0 hits for the
  four sentinels (`api.anthropic.com`, `api.moonshot.cn`, `sk-ant`,
  `postgres://`)

## Known structural debt entering Phase 7

1. **Two type mirrors** that Phase 7 must consolidate:
   - `packages/engine/src/items-5e-types.ts` (canonical at
     `packages/types/src/items-5e.ts`)
   - Inline `Condition5e*` block inside
     `packages/engine/src/condition-effects-5e.ts` (canonical at
     `packages/types/src/conditions-5e.ts`)

2. **Test environment divergence in `apps/web`.** Unit 4 ships a
   hand-rolled DOM shim inside `tests/character-sheet-panel.spec.ts`;
   Unit 5 ships `happy-dom` as a devDep used via
   `// @vitest-environment happy-dom`. Phase 8a should remove the
   shim and standardise on happy-dom.

3. **Missing `scripts/validate-content.mjs`.** Referenced by
   `package.json:21` (`content:validate` script) but the file does
   not exist on disk. Phase 8c builds it.

4. **`@first-perception/types` has no subpath exports.** This is
   what forced the type mirrors above. Phase 7's first step should
   add an `exports` field that exposes `./items-5e` and
   `./conditions-5e` (or re-export through the main `index.ts` and
   keep the package single-entry — either works, pick one).
