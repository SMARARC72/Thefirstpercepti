# Phase 7 Punch List — Schema Foundation + Mirror Consolidation

This is the starting brief for the Phase 7 session. It maps the
blast radius of the schema extension, lists the concrete imports
each consolidation step touches, and flags claims the author
should verify before acting. The Wave 1 invariant ("do not edit
`packages/types/src/index.ts`") is now lifted — Phase 7 owns this
file.

**A note on confidence.** Sections marked "verified" were
inspected line-by-line during preparation; sections marked
"likely" are inferred from import graphs and merit a quick second
look before committing changes. Don't trust this doc more than the
codebase — verify and update as you go.

## 1. Goal

Lift the Wave 1 type mirrors and ship the canonical 5e-augmented
`Player` and `Item` shapes. Concretely:

| Task | Source of truth after Phase 7 |
|---|---|
| Add Player fields | `packages/types/src/index.ts` |
| Add Item fields | `packages/types/src/index.ts` |
| Delete the items-5e mirror | (deleted; canonical at `packages/types/src/items-5e.ts`) |
| Delete the inline conditions-5e block | (deleted; canonical at `packages/types/src/conditions-5e.ts`) |
| Decide the types package export surface | `packages/types/package.json` |
| Update `createGameFromCreation` to seed new Player fields | `packages/engine/src/engine/CharacterCreation.ts` |
| Update `buildStats` and any default-Player builders | same / `packages/engine/src/engine-utils.ts` if applicable |
| Update `apps/web/src/game.ts` if it constructs Player explicitly | `apps/web/src/game.ts` |

## 2. Fields to add

### Player

```ts
proficiencyBonus: number;                 // 2 at start; grows by milestone (Phase 9 wires growth)
hitDice: { current: number; max: number; die: 'd6' | 'd8' | 'd10' | 'd12' };
savingThrowProficiencies: ReadonlyArray<keyof Player['stats']>;
attunementSlots: { used: number; max: number };  // max defaults to 3
spellSlots?: Record<number, { current: number; max: number }>;  // keyed by spell level; only present if posture grants casting
```

### Item

```ts
rarity: RarityTierId;                     // default 'common' for legacy items in items.json
magical: boolean;                         // default false
attunement: AttunementRequirement;        // default { required: false }
requires?: { form?: string; posture?: string; domain?: string };
```

The Phase 7 author can choose between:
- (a) Adding these fields as **required** with a content migration
  pass that fills every existing entry in `content/world-data/items.json`, or
- (b) Adding them as **optional** with a runtime default in
  `createGameFromCreation` / `buildStats`. Recommend (a) for `rarity`
  and `attunement` (small enumerable values; cleaner long-term);
  (b) for `magical` and `requires` (saves an authoring pass).

## 3. Mirror consolidation — exact imports to re-point

### Mirror 1: `packages/engine/src/items-5e-types.ts`

Canonical: `packages/types/src/items-5e.ts` (byte-equivalent; verify
before deleting). Verified consumers:

- `packages/engine/src/index.ts:64` — re-export block
- `packages/engine/src/item-rarity.ts:19` — `import type { RarityTier, RarityTierId }`
- `packages/engine/src/forging.ts:30` — multi-symbol type import
- `packages/engine/tests/item-rarity.spec.ts:9` — `import type { RarityTierId }`
- `packages/engine/tests/forging.spec.ts:4` — `import type { ForgeRecipe }`

After re-pointing all five sites to `@first-perception/types`, delete
`packages/engine/src/items-5e-types.ts`.

### Mirror 2: inline `Condition5e*` block inside `packages/engine/src/condition-effects-5e.ts`

Canonical: `packages/types/src/conditions-5e.ts`. The inline copy
runs roughly lines 25–95 of `condition-effects-5e.ts` and exports:
`Condition5eId`, `Condition5eCategory`, `SaveAbility`,
`Condition5eEffectsAtLevel`, `Condition5eDef`, `ActiveCondition5e`,
and the related resolved-effects shape.

Verified consumers:
- `packages/engine/src/condition-effects-5e.ts` itself (self-referencing)
- `packages/engine/tests/condition-effects-5e.spec.ts:7-11` —
  imports several of these types from the engine module by name
  (`ActiveCondition5e`, `Condition5eDef`, `Condition5eId`)

After re-pointing to `@first-perception/types`, delete the inline
type block at the top of `condition-effects-5e.ts` (keep the
constants and resolver code).

### Pre-requisite: types package export surface

Currently `packages/types/package.json` exposes only the root `.`
export. Choose ONE strategy before re-pointing:

- **(a) Re-export through `index.ts`** (simpler): add
  `export * from './items-5e';` and `export * from './conditions-5e';`
  to `packages/types/src/index.ts`. Consumers continue to import
  from `@first-perception/types`. Risk: name collisions — verify
  no symbol in items-5e/conditions-5e conflicts with the existing
  index re-exports.
- **(b) Add subpath exports** (cleaner separation): add
  `"./items-5e"` and `"./conditions-5e"` entries to the `exports`
  field in `packages/types/package.json`. Consumers import from
  `@first-perception/types/items-5e`. Requires updating `tsconfig`
  paths in the engine package so TypeScript's module resolver
  finds the subpaths.

Recommend (a) unless a name collision forces (b).

## 4. Player consumers (verified)

Every engine file under `packages/engine/src/` that references
`player.` field access:

| File | Touches |
|---|---|
| `engine-utils.ts` | `player.stats[stat]` in `rollD20` (read-only) |
| `state-adapter.ts` | broad Player read/write via JSON patches |
| `engine-types.ts` | type declarations |
| `engine/fixtures.ts` | builds default Player for tests |
| `engine/RulesEngine.ts` | likely state mutation; verify |
| `engine/CharacterCreation.ts` | **constructs the canonical Player** — primary update site |
| `engine/StateEngine.ts` | `Object.entries(this.player.stats)` at line 1094 (validator only — iterates `stats`, NOT `player`; safe for Phase 7 since we're NOT adding new stat fields) |
| `engine/GameController.ts` | turn dispatch + condition processing |
| `engine/Narrator.ts` | reads `item.equipped` / inventory; likely reads Player conditions |
| `consequences/ConsequenceScheduler.ts` | consequence dispatch reads Player state |
| `legacy/LegacySystem.ts` + `legacy/DeathSystem.ts` | death + legacy capture from Player |
| `reducers/investigationReducer.ts` | uses `player.stats[stat]` via `rollD20` |
| `reducers/moveReducer.ts` | reads `player.inventory` (key check), writes `player.conditions` |
| `reducers/deathReducer.ts` | writes `gameOver`, narrative on hp=0 |
| `reducers/restReducer.ts` | writes `player.hp`, `player.focus` |
| `reducers/conditionReducer.ts` | reads + writes `player.conditions` |
| `reducers/itemReducer.ts` | reads inventory item fields (see §5), writes `player.hp` / `player.maxHp` |
| `reducers/combatReducer.ts` | reads `player.stats`, writes `player.hp` |

Plus apps/web consumers:
- `apps/web/src/components/CharacterSheetPanel.ts` — reads Player.
- `apps/web/src/components/InventoryPanel.ts` — reads `Player.inventory`.

**Risk assessment for Phase 7 additions** (proficiencyBonus,
hitDice, savingThrowProficiencies, attunementSlots, spellSlots):

All of these are net-new fields, so reducers + render code that
spread Player will simply carry them. The genuine risk surfaces in:
- `CharacterCreation.ts` — MUST initialize the new fields.
- `state-adapter.ts` — verify JSON-patch ops correctly handle nested
  objects (hitDice, attunementSlots, spellSlots are nested).
- Any persistence layer that serialises Player — verify save/load
  round-trips the new fields (look at `packages/persistence/src/`).

## 5. Item consumers (verified)

Every file that reads `item.` fields:

| File | Field access | Phase 7 risk |
|---|---|---|
| `packages/engine/src/engine/InputInterpreter.ts:440,442,695,698` | `item.name` | safe — Phase 7 doesn't touch `name` |
| `packages/engine/src/engine/GameController.ts:1281` | `item.effects[*].mechanicalEffect` | safe — Phase 7 doesn't touch `effects` |
| `packages/engine/src/engine/Narrator.ts:664-668` | `item.equipped`, `item.name` | safe |
| `packages/engine/src/reducers/itemReducer.ts` (multiple sites) | `name`, `description`, `type`, `effects`, `charges`, `durability` | safe — Phase 7 ADDS fields, removes none |
| `apps/web/src/components/InventoryPanel.ts:57,62,63,128,136` | `name`, `description`, `effects` | safe; Wave 1 fallback to `getItemRarity` / `getItemWeight` props can now use real fields |
| `apps/web/src/components/StatusPanel.ts:99` | `item.name` | safe |
| `apps/web/src/screens/DeathScreen.ts:121` | `inheritance.item.name` | safe |
| `apps/web/src/screens/LegacyScreen.ts:112` | `inheritance.item.name` | safe |

**Net call**: adding `rarity`, `magical`, `attunement`, `requires`
to Item is additive — no existing consumer breaks. The content
migration (filling these fields on existing items.json entries) is
the actual work.

## 6. Synthetic Ink jump construction sites (Phase 8c precedent)

Not Phase 7's job to fix — but Phase 7 should NOT touch these.
Captured here so Phase 8c has the list ready.

`packages/narrative/src/NarrativeEngine.ts`:
- L111 — `` `combat_${encounterId}` `` in `enterCombat(encounterId)`
- L118 — `` `dialogue_${npcId}` `` in `enterDialogue(npcId)`
- L125 — `` `consequence_${consequenceId}` `` in `triggerConsequence(...)`
- L132 — `'legacy_death'` hard-coded in `enterLegacy()`

Validation: every constructed string must resolve to an existing
Ink knot at runtime, or the player turn crashes. Phase 8c builds
`scripts/validate-content.mjs` that walks these construction sites
and verifies the resolvable suffixes against the Ink scene graph.

## 7. Step-by-step recipe for Phase 7

Suggested order; deviate as warranted:

1. **Read this entire doc + `docs/RESTRUCTURE_PLAN.md` Wave 2
   Phase 7 row.** Then read `packages/types/src/index.ts:1-200` to
   refresh on the canonical Player + Item shape.
2. **Decide export strategy** (§3 pre-req) — likely (a) re-export
   through `index.ts`.
3. **Add the type re-exports** if going with (a):
   - `packages/types/src/index.ts` — append `export * from './items-5e'; export * from './conditions-5e';` at end.
   - Run `npm --prefix packages/types run build` — must be clean.
4. **Re-point the engine mirror imports** (§3 mirror 1 + mirror 2)
   from local files to `@first-perception/types`.
5. **Build engine + run tests** — should be clean. (Note: mirrors
   are still on disk at this point; they're just unused.)
6. **Delete the mirror files** —
   `packages/engine/src/items-5e-types.ts` and the inline block at
   the top of `packages/engine/src/condition-effects-5e.ts` (leave
   the constants and the resolver function).
7. **Rebuild + re-test** — should still be clean.
8. **Extend Player schema** (§2) in `packages/types/src/index.ts`.
9. **Initialize new Player fields** in `CharacterCreation.ts`
   `createGameFromCreation`. Best defaults:
   - `proficiencyBonus: 2`
   - `hitDice: { current: 1, max: 1, die: 'd8' }` (form-driven later)
   - `savingThrowProficiencies: []` (posture-driven later)
   - `attunementSlots: { used: 0, max: 3 }`
   - `spellSlots: undefined` (set in Phase 10 if posture grants casting)
10. **Verify persistence round-trip** — look at
    `packages/persistence/src/MemoryRepository.test.ts`,
    `HttpRepository.test.ts`, `LocalStorageRepository.test.ts`;
    they should still pass. If a save format snapshot is in the
    persistence tests, update the snapshot.
11. **Extend Item schema** (§2) in `packages/types/src/index.ts`.
12. **Choose content migration strategy** (§2 a vs b).
13. **If (a) chosen** — migrate `content/world-data/items.json`:
    every entry gains `rarity: 'common'`, `magical: false`,
    `attunement: { required: false }`. The Wave 1 InventoryPanel's
    `getItemRarity` fallback heuristic now sees real data — strip
    the fallback from Phase 8a's wiring task.
14. **Run the full verify chain**:
    - `npm run typecheck`
    - `npm run build:packages`
    - `npm test`
    - `npm run build`
    - bundle-leak grep returns 0
15. **Update `docs/BASELINE_METRICS.md`** with the post-Phase-7
    test count + bundle size delta. Honest about the budget impact.
16. **Update `progress.md`** with the Phase 7 entry — what landed,
    what's still ahead, what surprised you.

## 8. Out of scope for Phase 7 (defer)

- Wiring `CharacterSheetPanel` / `InventoryPanel` into
  `GameplayScreen` — Phase 8a.
- Fixing the command parser misroutes — Phase 8b.
- Building `scripts/validate-content.mjs` — Phase 8c.
- Introducing `RollBand` enum — Phase 8d.
- Combat reducer rewrite to use dice expressions + action economy
  — Phase 9.
- Forging UI ("The Anvil") — Phase 9.
- Spell slots wiring (Player schema includes the field but no
  consumer uses it yet) — Phase 10.

## 9. Risks / surprises to verify before acting

- **`StateEngine.ts:1094` validator loop** — earlier research
  flagged this as a Phase 7 hazard. On re-read it's a stat-value
  validator (0–20 range check) that iterates `player.stats`, not
  `player` itself. Adding top-level Player fields like
  `proficiencyBonus` does NOT enter this loop. Listed here so the
  Phase 7 author doesn't waste time fixing what isn't broken.
- **`packages/persistence`** has 3 spec files
  (`MemoryRepository.test.ts`, `HttpRepository.test.ts`,
  `LocalStorageRepository.test.ts`). If any of them embed a
  Player-shaped fixture, they'll need updating when Phase 7 adds
  fields. Read those first.
- **Wave 1's mirror authors made byte-equivalence claims.** Diff
  `packages/engine/src/items-5e-types.ts` against
  `packages/types/src/items-5e.ts` before deleting. Same for the
  conditions-5e inline block vs `packages/types/src/conditions-5e.ts`.
  If they've drifted, reconcile to the canonical types/ version.
- **`@first-perception/types` package name vs `@first-perception`
  scope.** Several Wave 1 PR bodies and the items-5e-types.ts
  doc-comment mention `@first-perception/types` and
  `@first-perception/types` interchangeably. The actual package
  name in `packages/types/package.json` is `@first-perception/types`.
  Use that exact string in imports.
