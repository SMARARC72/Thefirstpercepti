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
