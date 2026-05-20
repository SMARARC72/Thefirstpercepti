# Phase 13 — Type Reconciliation Matrix

> Generated 2026-05-20 by ENG-103 (Engineering Plan Sec Plan.IV).
> See `docs/RECONCILIATION_AUDIT.md` for the broader reconciliation context.

## TL;DR

The schema layer (`content/schemas/schema_pack_v0.5.json` → `packages/types/src/generated.ts`)
and the runtime layer (`packages/types/src/index.ts`) live side by side. **They have disjoint
export names** — the schema layer uses a `Schema` suffix (PlayerSchema, ItemSchema, etc.),
the runtime layer uses bare names (Player, Item, etc.). No collision means no merge conflict.

ENG-104 augments index.ts with `export * from './generated.js';` so callers can import either
layer from the same module. Over time, runtime types should converge onto schema types at
persistence boundaries.

## Counts

| Layer | Source | Exports |
|---|---|---|
| Runtime | `index.ts` (hand-authored) | 72 |
| Schema (canonical spec) | `generated.ts` (auto-generated from schema_pack_v0.5) | 64 |
| Overlap (same name) | — | **0** |

## Conceptual overlap map (same domain entity, different layer)

These pairs model the same domain concept at different abstraction levels. Runtime types
are what the engine reducers / state adapter / persistence layer actually manipulate.
Schema types are what content authors and validators consume.

| Runtime (index.ts) | Schema (generated.ts) | Reconciliation note |
|---|---|---|
| `Player` | `PlayerSchema` | Runtime adds session/UI state; schema is canonical persistence shape. **Converge at GameRepository save boundary.** |
| `Item` | `ItemSchema` | Runtime is simpler (no witness_payload, no effects_on_attune_structured). Schema is richer. **Migrate runtime Item to ItemSchema in Phase 15** as part of Greywake content port. |
| `Condition` | `ConditionSchema` | Runtime models active condition instances; Schema models condition *definitions*. Use both: `ConditionSchema` for the catalog, `Condition` (runtime) for what's currently active on the player. |
| `Faction` | `FactionSchema` | Runtime tracks faction state (trust/fear/plan); Schema adds doctrines/taboos/scheduled_actions/obligations. **Augment runtime Faction with schema fields in Phase 15.** |
| `NPC` | `NpcSchema` | Schema adds tracker_state (R-98-B), recruitable_via_bond/canon_event (R-139/140-P), witness_history (R-121-E), behavior_tree_state (deferred Cat C). **Augment in Phase 15 (slice subset).** |
| `Rumor` | `RumorSchema` | Likely identical. Validate at Phase 15 port time. |
| `Consequence` | `ConsequenceSchema` | Likely identical. Validate at port time. |
| `LocationNode` (runtime) | `LocationSchema` (Cat C deferred) | Schema Location is exploration-system Cat C; runtime LocationNode is what's used now. **Keep runtime; defer schema port.** |
| `Region` | `RegionSchema` | Runtime is simpler. **Augment in Phase 15.** |

## Runtime-only types (no schema equivalent — stay in index.ts as-is)

These model app/UI/engine concerns that the canonical schema doesn't need to know about:

- `ActionEconomy`, `ActionResult`, `AppState`, `AudioCue`, `AudioLayer`, `CreationState`,
- `DeathRecord`, `DeathVector`, `DiceFormula`, `Effect`, `Exit`, `FactionPlan`,
  `FactionStance`, `FactionState`, `FateRecord`, `GameSettings`, `GameState`, `GameTab`,
- `HitDicePool`, `HitDie`, `Inheritance`, `JournalEntry`, `Legacy`, `LockRequirement`,
- `MapPoint`, `MapPointKind`, `NpcDisposition`, `NpcState`, `POI`, `PatchOp`,
- `ResultBand`, `RollBand`, `RollResult`, `SaveSlot`, `SaveSnapshot`, `Screen`,
- `Secret`, `Severity`, `SkillCheck`, `SpellSlotLevel`, `StatePatch`, `Stats`,
  `SuggestedAction`, `TaleEntry`, `TaleTone`, `Trigger`, `TriggerKind`, `UUID`,
  `WeatherPattern`, `WorldMutation`, `WorldSnapshot`, `WorldState`

These stay in `index.ts` — they're runtime engine vocabulary, not canonical world spec.

## Schema-only types (no runtime equivalent — new vocabulary)

These are NEW vocabulary introduced by the schema layer that runtime hasn't needed yet
but will need as later phases land:

| Type | Comes from | Lands when |
|---|---|---|
| `CampaignSchema` | v0.4+ | Phase 14 (when persistence wraps campaign metadata) |
| `EventSchema` | v0.4+ | Phase 16 (validator chain emits events) |
| `BeliefSchema` | v0.4+ | Phase 18+ (Ink scenes seed beliefs) |
| `StateDiffSchema` | v0.4+ | Phase 16 (validator chain output shape) |
| `ContradictionLedgerEntrySchema` | v0.4+ | Phase 16 (stage 5 contradiction_check) |
| `ClassSchema`, `RaceSchema`, `SubraceSchema` | v0.3 | Phase 15 (slice content port) |
| `DeitySchema`, `PantheonSchema` | v0.3 | Phase 15 |
| `SpellSchema`, `RecipeSchema` | v0.4+ | Phase 19 (catalog bulk port) |
| `LootTableSchema`, `MaterialSchema`, `CreatureMaterialSchema`, `MaterialSubstitutionSchema` | v0.4 | Phase 19 |
| `RegionalPackSchema`, `RegionalCurrencyStateSchema`, `MythologicalSubstrateEntrySchema` | v0.4+ | Phase 19 + Phase 23 |
| `CultInstitutionSchema` | v0.4 | Phase 15 |
| `CompanionSchema`, `QuirkSchema`, `RecruitmentQuestSchema` | v0.5 (R-132-P..R-148-P) | Wave H (post-slice, Sprint 28+) |
| `OrchestratorSessionSchema`, `AgentEnvelopeSchema` | v0.5 (Cat B) | Phase 16 (validator chain port) |
| `LocationSchema`, `TravelRouteSchema`, `ConflictEnvelopeSchema` | v0.5 Cat C (deferred bundle) | Future bundle design pass |
| `PortraitLayerDefinitionSchema` | v0.5 (Cat D) | Phase 20 (wireframes → UI surfaces) |

## $defs (shared building blocks)

The 26 `$defs` in the schema pack become standalone types in generated.ts. They are
shared building blocks consumed by multiple entity schemas: `WorldTime`, `MetersBlock`,
`HpBlock`, `SpellSlotTable`, `AttunementSlot`, `InventoryEntry`, `FaithMeterEntry`,
`PathLedgerEntry`, `CanonProgressionEntry`, `BodyModificationsBlock`, `ValidatorStageResult`,
`SpellCostLayer`, `CurrencyAmount`, `KnownSpellEntry`, `ConditionActiveInstance`,
`HitDiceEntry`, `CustomStatsBlock`, `DerivedStatsBlock`, `DurationObject`, `Modifier`,
`AbilityScore`, `AlignmentDescriptor`, `RegionalPackRef`, `BoundedInt_0_10`,
`BoundedIntNeg10Pos10`, `BodyModificationsBlock1` (note: this is a duplicate-name artifact
from json-schema-to-typescript handling the nested-vs-top-level body_modifications_block in
the schema; harmless).

These should be reused wherever the runtime layer touches their concepts — e.g., when
the persistence layer reads/writes a Player record, it should use `PlayerSchema['meters_block']`
shape rather than redefining its own meters type.

## ENG-104 augmentation strategy

Per ENG-104 ticket, augment `index.ts` additively:

1. Add `export * from "./generated.js";` at the bottom of index.ts (after a clear section
   divider comment explaining the runtime-vs-schema layering).
2. Do NOT replace any existing runtime type. Runtime layer stays authoritative for what
   the engine actually uses.
3. Add a single docblock at the top of index.ts pointing readers at this reconciliation doc.

That's it. No conflict resolution needed because there are no name collisions.

## Future convergence work (Phases 15-19)

In subsequent phases, the runtime types should converge onto schema types at every
persistence boundary:

- **Phase 15 (Greywake content slice port):** Migrate runtime `Player.race` from `string` to
  reference `RaceSchema['race_id']`. Augment runtime `Faction` with schema fields like `doctrines`,
  `taboos`, `scheduled_actions`.
- **Phase 16 (Validator chain):** Use `StateDiffSchema`, `ContradictionLedgerEntrySchema`,
  `AgentEnvelopeSchema`, `OrchestratorSessionSchema` for new validator middleware.
- **Phase 19 (Catalog bulk port):** Replace runtime `Item` with `ItemSchema` at the
  persistence boundary; runtime can keep a slim derived type for hot loops if needed.
- **Phase 20 (UI surfaces):** Consume `PortraitLayerDefinitionSchema` for the Portrait System.

The eventual goal: runtime types are derived (`type Player = Pick<PlayerSchema, "..."> & { ...session_state }`)
from schema types, not parallel definitions. Phase 13 just lays the foundation.

## Verification

Run `npm run gen:types:check` to verify the generated.ts is in sync with the schema.
Run `npm test` to verify the 96 existing specs still pass against the augmented index.ts.

If a future schema change is intended to break runtime types, that's a deliberate breaking
change — call it out in the commit message and update both layers in the same PR.
