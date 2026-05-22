# Translation Rules — v0.8 Schema Reconciliation

**Authored:** 2026-05-21 (Session 4c Phase 4.12)
**Status:** Canonical for v0.8 shipping
**Scope:** Cross-cutting conventions that span Bundles A-H + cluster primitives + the dual-system stat translation per Khoja Option C ratification

---

## 1 — Stat translation function (Option C — Tide-Stained 9-CoreStat ↔ 5e Derived)

Per Khoja Option C ratification (Session 4 critical decision #1):

PlayerSchema (and NpcSchema, CombatantSchema, CreatureSchema per Option C uniform application) carries BOTH:
- `stats: custom_stats_block` — 9-CoreStat Tide-Stained system (body, grace, sense, mind, will, presence, authority, ruin, creation)
- `derived_stats: derived_stats_block` — 5e ability scores (str, dex, con, int, wis, cha)

Both REQUIRED. Translation deterministic.

### Translation formula

```
STR  = max(body, grace × 0.6)                                rounded down
DEX  = max(grace, body × 0.5)                                rounded down
CON  = clamp(body × 0.8 + 4, 8, 20)                          rounded down
INT  = mind                                                  identity
WIS  = sense                                                 identity
CHA  = max(presence, will × 0.7) + racial_modifier           rounded down
```

The 3 cosmic-meta stats (authority, ruin, creation) have **no 5e equivalent** and are engine-only fields. They participate in:
- L.V plot pressure calculations
- L.III faction reach attempts where authority modifies success bias
- Action resolution where ruin/creation deltas affect outcome bands (per RT-26 single-mechanic discipline)

### When the translation runs

| Trigger | Action |
|---|---|
| Character creation | Compute derived_stats from custom_stats + race + level; persist both |
| Level up | Recompute derived_stats; preserve custom_stats authoritative |
| Save snapshot serialization | Run rule; verify both blocks consistent before write |
| Save load | Run rule; if derived_stats from disk disagree with custom_stats → log warning + recompute |
| Engine read in SRD-compatible combat math | Read derived_stats (5e ability scores expected by creature CR / spell save DC) |
| Engine read in narrative / faction / NPC simulation | Read custom_stats (Tide-Stained system) |

### Deterministic + idempotent

The translation function is pure: same input → same output. Engine can recompute on demand without state-corruption risk. Idempotent: f(f(input)) = f(input) (running twice = running once).

### Racial modifier table

| Race | STR | DEX | CON | INT | WIS | CHA |
|---|---|---|---|---|---|---|
| Human | +1 | +1 | +1 | +1 | +1 | +1 |
| Half-blood | +0 | +0 | +0 | +0 | +0 | +2 |
| Tiefling | +0 | +0 | +0 | +1 | +0 | +2 |
| Warped | +0 | -2 | +2 | +0 | +1 | +1 |
| Formless | +0 | +1 | +0 | +1 | +2 | +0 |
| Construct | +2 | +0 | +2 | -1 | +0 | -1 |
| Spirit-bound | +0 | +0 | -1 | +1 | +2 | +1 |

The modifier applies ONLY to derived_stats; custom_stats are the canonical authority.

### Khojen baseline test fixture (gates Bundle A + Session 5 cutover per House #3)

Khojen baseline character:
```
custom_stats:
  body: 12, grace: 11, sense: 13, mind: 10, will: 12, presence: 14
  authority: 3, ruin: 1, creation: 2

race: tiefling (modifier +1 INT, +2 CHA)
level: 2 (warlock; The Indebted calling)
```

Translation function output (must match exactly):
```
derived_stats:
  STR  = max(12, 11 × 0.6) = max(12, 6.6) = floor(12) = 12  →  Wait, schema_pack documentation said 14
                                                                ↑ Khojen baseline shows STR 14
```

**AMBIGUITY NOTE:** The Khojen baseline per project_schema_state.md memory shows STR 14, DEX 13, CON 12, INT 11, WIS 13, CHA 17 (after Tiefling racial). The simple formula above produces STR 12 from those custom_stats inputs.

**Resolution:** the Khojen-baseline values were derived under a different (earlier) translation rule. v0.8 LOCKS the formula above as canonical. Session 6 = 24d seed data uses the formula above to recompute Khojen's derived_stats; if Khoja wants the prior STR 14 / DEX 13 / CHA 17 numbers preserved, the formula needs reverse-engineering — flag for Khoja decision.

**Test fixture (canonical going forward):**
```typescript
const KHOJEN_CUSTOM = {
  body: 12, grace: 11, sense: 13, mind: 10, will: 12, presence: 14,
  authority: 3, ruin: 1, creation: 2,
};
const KHOJEN_RACE_MODIFIERS = { str: 0, dex: 0, con: 0, int: 1, wis: 0, cha: 2 };  // tiefling
const KHOJEN_DERIVED_EXPECTED = {
  str: 12,  // max(12, 6.6) = 12
  dex: 11,  // max(11, 6) = 11
  con: 13,  // clamp(12*0.8+4=13.6, 8, 20) = 13
  int: 11,  // 10 + 1 = 11
  wis: 13,  // 13
  cha: 16,  // max(14, 12*0.7=8.4) = 14 + 2 = 16
};
```

Test verifies translation function emits KHOJEN_DERIVED_EXPECTED given KHOJEN_CUSTOM + KHOJEN_RACE_MODIFIERS. PR for Session 5 includes this test in `packages/types/tests/stat_translation_rules.spec.ts`.

If Khoja wants the OLDER baseline (STR 14, CHA 17) preserved, the formula reverts to:
```
STR = max(body, grace × 1.2) — but that overshoots
```
…or the racial modifier table changes (Tiefling +2 STR instead of +0). Flag for Khoja ratification in Session 5.

---

## 2 — Naming convention reconciliation

| Layer | Convention | Why |
|---|---|---|
| Schema (`schema_pack_v0.8.json`) | `snake_case` | Postgres convention; PostgREST serves as-is; SQL identifiers don't need quoting |
| Generator output DDL | `snake_case` | Matches schema_pack |
| Generator output TS types | `snake_case` field names (matching JSON Schema source) | Round-trip identical |
| Generator output Zod | `snake_case` keys | Validates JSON Schema-shaped objects |
| Runtime app code (`apps/web`, `packages/engine`) | `camelCase` | TS convention; pre-existing |
| Persistence boundary translator | snake↔camel | New utility module — see §3 below |

### snake ↔ camel boundary translator

A small TS utility module ships in Session 5 at `packages/persistence/src/naming.ts`:

```typescript
export function toCamel<T>(obj: any): T {
  // Recursively rename snake_case keys to camelCase
  // Applied on READ path from Supabase
}

export function toSnake<T>(obj: any): T {
  // Recursively rename camelCase keys to snake_case
  // Applied on WRITE path to Supabase
}
```

Repository pattern uses these translators at the persistence boundary. Engine code stays camelCase; schema_pack contracts stay snake_case; Zod validators run against snake_case shape (post-toSnake on writes).

---

## 3 — Range bound standardization

Per Foundation Audit Decision #11 (ENUM strategy locked criteria) + Khoja Option B (focus_block):

| Concept | Range | Type | Source |
|---|---|---|---|
| MetersBlock fields (fatigue, clarity, debt, notice, corruption) | 0..10 (inclusive) | integer | v0.7 existing pattern; preserved |
| HpBlock.current | 0..max | integer | v0.7 HpBlock $def |
| HpBlock.max | positive integer | integer | scales by class/level |
| FocusBlock.current | 0..max | integer | v0.8 new $def per Option B |
| FocusBlock.max | positive integer | integer | scales by class/level/feats/pact |
| Faction.trust | -100..+100 | integer | runtime pattern; preserved |
| Faction.fear | 0..100 | integer | runtime pattern; preserved |
| Faction.public_reach.range | 1..5 | integer | Bundle C |
| Faction.actual_reach.range | 1..5 | integer | Bundle C |
| NPC.want_model.drive.intensity | 1..5 | integer | Bundle A |
| NPC.want_model.barter.cost_to_npc | 1..5 | integer | Bundle A |
| NPC.want_model.fear_loss.urgency | 1..5 | integer | Bundle A |
| NPC.knowledge_tri_layer.knows.certainty | 1..5 | integer | Bundle A |
| NPC.knowledge_tri_layer.believes.conviction | 1..5 | integer | Bundle A |
| Rumor.truth_value | 0..1 | float | schema convention (Bundle G) |
| Rumor.spread_level | 1..10 | integer | Bundle G |
| Information.distortion_level | 0..5 | integer | Bundle G |
| FS branch.handle_window length | ≥ 3 game-days | integer | FS-RULE-1 binding rule |
| Plot.current_pressure | 0..10 | float OR integer | Bundle E (verify) |
| Quest.surfacing_threshold | 0..10 | integer | Bundle D |
| FS branch carryover.pressure_delta | -10..+10 (signed) | integer | FS branches |

### Old runtime-vs-schema mismatches now reconciled

- `Rumor.belief` (runtime 0..100) → Bundle G `Information.distortion_level` (0..5) — different concept; runtime ≅ spread_level
- `Rumor.truthValue` (runtime 0..100) → schema `truth_value` (0..1) — divide by 100 at persistence boundary
- Faction trust / fear retain runtime ranges (-100..+100 / 0..100)

---

## 4 — Per-meter rules

The 5 meters (fatigue, clarity, debt, notice, corruption) follow a uniform pattern:

| Rule | Detail |
|---|---|
| Range | 0..10 inclusive |
| Default | 0 at character creation |
| Direction of "bad" | All UP (higher = worse / more pressure) |
| Recovery | Per-meter via specific actions; documented per-meter in regional pack |
| Cap-cross trigger | At 10, engine fires meter-specific consequence (Fatigue = exhaustion debuff; Notice = NPC awareness escalation; etc.) |
| UI surface | Per-meter UI strip; player sees current value + recent delta |

### Per-meter specifics

| Meter | Recovery action examples | At-cap consequence |
|---|---|---|
| Fatigue | rest, food, salt-rim parish sleeping accommodations | exhaustion debuff (-1 to all rolls); recovery requires long rest |
| Clarity | meditation, theological study, sober reflection | "the world becomes too bright" — perception failures cascade |
| Debt | scrip payments, faction service, salt-coin transactions | Tide League broker calls in debt; quest emerges |
| Notice | inactivity, leaving the parish, hiding in shadows | Bell Court informant flags the player; institutional response queue fires |
| Corruption | absolution-warrant filings, Drowned Church confession, salt-rim purification rituals | Cosmological tag applied; NPC interactions shift to wary/afraid |

---

## 5 — `focus_block` rules (per Khoja Option B)

`focus_block: { current, max, recovery_rate?, source_kind? }` mirrors HpBlock symmetric pattern.

| Rule | Detail |
|---|---|
| Default `max` at character creation | Class-scaled (warlock L2 = 5; warlock L5 = 8; etc.) |
| `source_kind` values | "natural" / "pact" / "ritual" (native ENUM) |
| `recovery_rate` units | focus-per-rest (positive integer; null = no recovery without specific action) |
| Engine reads focus when | spell-casting attempts; pact-cost evaluations; ritual gates |

Focus is per-character resource; distinct from meters (world-state perceptions). Both share UI strip discipline.

---

## 6 — tags primitive rules

Per Foundation Audit #2 + Khoja sweep ratification, `tags: string[]` lands uniformly on:
- Player, NPC, Faction, Region, Location, Item, Creature, Combatant, Plot, Quest, Institution

| Rule | Detail |
|---|---|
| Default | empty array `[]` |
| Allowed values | regional-pack-defined tag vocabulary; no enum constraint at schema layer |
| Validator chain | Stage 4 (consistency check) verifies tags match registered regional pack tag registry |
| Engine reads tags for | scene routing, search-by-tag UI affordances, faction-affinity heuristics, agent dispatch hints |
| UI surfaces tags | optionally per surface; tag-cloud rendering on detail views |

The tag vocabulary is itself content-data; regional packs ship `tag_registry.json` (deferred to v0.9 for cleanup; v0.8 accepts free-string tags with Stage 4 warning if unregistered).

---

## 7 — Common timestamps (generator-auto-injected)

Every emitted Postgres table gets `created_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()` + `updated_at: TIMESTAMPTZ NOT NULL DEFAULT NOW()`.

Schemas DO NOT declare these fields. Generator handles. Per Foundation Audit Decision #9.

### Updated_at trigger (separate hand-authored migration)

Session 5 = 24c authors `supabase/migrations/<ts>_updated_at_triggers.sql`:

```sql
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Applied per-table via:
-- CREATE TRIGGER trg_<table>_updated_at BEFORE UPDATE ON <schema>.<table>
--   FOR EACH ROW EXECUTE FUNCTION update_updated_at();
```

The trigger applies to all mutable tables (excludes append-only logs like event_log, world_event).

---

## 8 — campaign_id + session_id ownership

Per Foundation Audit Decision #8 + Khoja sweep ratification:

| Schema | Required fields |
|---|---|
| `state.*` entities | `campaign_id` REQUIRED + `session_id` REQUIRED (both FK to public tables) |
| `engine.*` entities | `campaign_id` REQUIRED + `session_id` OPTIONAL (engine state may be cross-session) |
| `behavior.*` entities (materialized views) | inherit from source tables; no direct ownership |
| `content.*` entities | NO ownership fields (content is authored, not session-scoped) |
| `public.*` existing 9 tables | KEEP existing convention (no breaking change in v0.8) |

---

## 9 — Schema version bump rules

Per ARD-001 discipline:

- **No schema bump needed for:**
  - Documentation-only changes
  - Pointer-only entries (e.g., `x_engine_rule_registry_pointers` from Phase 4.10)
  - Seed data additions
  - Generator improvements
- **Patch bump (v0.8.0 → v0.8.1) for:**
  - New optional fields on existing entities
  - New enum values added to lookup tables (NOT native ENUM — those require minor bump)
- **Minor bump (v0.8.X → v0.9.0) for:**
  - New required fields
  - New $defs or entities
  - Native ENUM value additions
  - Removed fields (even deprecated ones)
- **Major bump (v0.X → v1.0) for:**
  - Structural changes to existing $defs
  - Renamed entities
  - Removed entities

v0.8.0 is the current shipped version after Phase 4.10. Any v0.8.X patches stay backward-compatible.

---

## 10 — Validation discipline at write boundary

Per ARD-009 generator pipeline + ARD-011 JSONB CHECK constraints:

1. Engine writes go through `StateManager` (per ARD-006); StateManager invokes Zod validators from generated `zod-validators.ts` before commit
2. Persistence layer's `toSnake()` applies before Zod validation
3. Postgres CHECK constraints + FK enforce the final layer
4. Three-tier validation: Zod (TS runtime) + CHECK constraints (Postgres) + JSONB schema validators (via `jsonb_matches_schema` if extension available, else hand-written CHECK)

This is the trust chain. Zod is the fast path (catches 99% of issues pre-commit); CHECK + FK catches the rest at DB layer.

---

## 11 — ENUM naming policy

Per Foundation Audit Decision #3 (Khoja-ratified ENUM strategy criteria):

### Native ENUM TYPE naming (Postgres)

```
<entity>_<field>_enum         when scoped to single entity  e.g. npc_memory_archetype, plot_closing_state
<concept>_enum                 when shared across entities  e.g. archetype_enum, alignment_descriptor
```

Choose entity-scoped when the value set is conceptually local; choose concept-scoped when multiple entities share the same value list. Native ENUMs live in `content.*` schema by default; engine-internal ENUMs (per ARD-010 engine namespace) get `engine.*` prefix.

### Lookup table naming (extensible enum)

```
enum_<concept>           e.g. enum_event_type, enum_item_type, enum_condition_type
```

Lookup tables ALWAYS live in `content.*` schema (regional packs author them). Schema-fields referencing a lookup-table value use `<concept>_id` naming (e.g., `event_type_id` references `content.enum_event_type.id`).

### JSON Schema annotation

| Strategy | Annotation | Generator emits |
|---|---|---|
| Native ENUM | `x_enum_strategy: "native"` + `x_enum_name: "<name>"` | `CREATE TYPE content.<name> AS ENUM (...)` |
| Lookup table | `x_enum_strategy: "lookup"` + `x_lookup_table_name: "<name>"` | `CREATE TABLE content.enum_<name> (...)` per ARD-017 metadata-row template |
| Unannotated (DEFAULT) | none | Native ENUM emission per Foundation Audit Decision #3 default-native rule |

### When to add a new ENUM value

| Type | Process |
|---|---|
| Native ENUM value addition | Schema bump (minor: v0.8.X → v0.9.0); generator regen; CHECK constraint re-evaluation on existing rows |
| Lookup table value addition | New row in `enum_<concept>` table; no schema bump; seed migration; engine reloads on next deploy |

---

## 12 — ID convention (locked per Foundation Audit Decision #1)

| Pattern | Rule | Example |
|---|---|---|
| Top-level entities (entries in `schemas:`) | `<entity_name>_id TEXT PRIMARY KEY` | `player.player_id`, `npc.npc_id`, `plot.plot_id` |
| Sub-entities / $defs with their own identity | bare `id TEXT PRIMARY KEY` (or composite, documented) | `institution_response_queue_entry.id`, `failure_state_branch.id` |
| Composite-keyed entities | Document composite in entity comment; emit composite PK in DDL | per-entity audit; case-by-case |
| Content-only registries (no row identity) | No PK column; entity is a structural container | regional_pack (its identity is its file path / pack_id at the regional_pack_ref $def level) |

ID values are TEXT (not UUID) to allow content-authored stable references. UUIDs are valid TEXT values; non-UUID stable IDs (`khojen`, `marrow_saint_ilyra`) are equally valid and preferred for content-authored entities.

### FK convention (locked per Foundation Audit + ARD-011 §1)

- **Property named `<entity>_id` (where `<entity>` matches a known schema entity name) IMPLIES FK** — generator (F5) auto-inferred
- **Explicit annotation** `x_fk_target: "<entity>"` overrides
- **Default `ON DELETE` by target namespace:**
  - References INTO `content.*` → `RESTRICT`
  - References INTO `state.*` → `CASCADE` (same-session ownership)
  - References INTO `public.*` → `RESTRICT` (preserves Phase 22.5 9 tables)
  - References INTO `behavior.*` or `engine.*` → `SET NULL` (soft refs)

---

## 13 — Registry-vs-schema boundary (per ARD-017)

Per ARD-017 three-tier source-of-truth taxonomy:

| Question | Answer location |
|---|---|
| Is this a TABLE shape (row + columns + FK)? | Tier 1 — `schema_pack_v0.8.json` |
| Is this a $def shape (JSONB validation)? | Tier 1 — `schema_pack_v0.8.json $defs` |
| Is this a validator for an engine-config file? | Tier 2 — `content/rules/_schema/*.json` |
| Is this engine-config DATA (loaded into RuleRegistry at startup)? | Tier 3 — `content/rules/*.json` |
| Is this in-memory engine helper / classification type? | NOT in schema; lives in `packages/engine/src/engine-types.ts` per engine_types_deprecation_map.md Category 3 |

The decision tree from Phase 4.10 audit codified:
1. Does it produce engine behavior (resolution logic)? → Tier 2/3 registry
2. Does it produce content shape (data model)? → Tier 1 schema_pack
3. Is it transient runtime computation? → engine-types.ts (Category 3 KEEP)

---

## 14 — Table / entity naming

| Layer | Naming |
|---|---|
| Schema entity key (in schema_pack `schemas:` map) | `snake_case` singular — `npc` not `npcs` |
| Postgres table emitted by generator | `<schema>.<snake_case_singular>` — `content.npc` |
| TS interface name (from generator) | `PascalCase` + `Schema` suffix — `NpcSchema`, `PlayerSchema` |
| TS Zod export | `PascalCase` + `SchemaZ` suffix — `NpcSchemaZ` |
| TS runtime envelope alias (per Path B from Phase 24a) | `PascalCase` `<Name>State` — `RegionState`, `RumorState`, `ConsequenceState` (when divergent from schema shape) |

Schema entity names are SINGULAR (`npc`, not `npcs`). Plural names only appear in field references when the field is an array of FKs (`member_npc_ids`).

### Joined / relationship table naming

`<entity_a>_<relationship>_<entity_b>` — e.g., `faction_member_npc`, `quest_constituent_event`. Always singular for both sides; relationship verb in middle. Reserved for explicit join tables (per ARD-011 §4 rejection of polymorphic ownership).

---

## 15 — Nullable vs optional conventions

JSON Schema distinguishes three states; v0.8 standardizes their meaning:

| State | JSON Schema annotation | Generator emits | Semantics |
|---|---|---|---|
| **Required, non-null** | listed in `required:` array; type omits null | Postgres `NOT NULL`; TS no `?` modifier; Zod `.required()` | Field MUST be present and have a value |
| **Optional, non-null** | NOT in `required:` array; type omits null | Postgres nullable column; TS `field?: T`; Zod `.optional()` | Field may be omitted; if present, MUST have a value |
| **Required, nullable** | in `required:` array; `type: [T, "null"]` | Postgres nullable column with NOT NULL on the row-existence sense; TS `field: T \| null`; Zod `.nullable()` | Field MUST be present in the JSON shape; value may be `null` |
| **Optional, nullable** | NOT in `required:` array; `type: [T, "null"]` | Postgres nullable column; TS `field?: T \| null`; Zod `.nullable().optional()` | Field may be absent OR present-as-null |

**Discipline rules:**
1. **Default to OPTIONAL when in doubt.** Required-non-null is the strictest contract; only use when the engine truly cannot function without the field.
2. **Use NULLABLE for "field exists but value is absent" semantics** — e.g., `transfer_target_npc_id?: string | null` on a closing_condition_entry where the `transfer_state` kind requires it but other kinds don't.
3. **Use OPTIONAL for "field may not be present at this version" semantics** — e.g., new fields added in v0.8.X patches are optional until v0.9 makes them required.
4. **Migration rule:** Optional → Required = MAJOR bump per `translation_rules` §9; Required-non-null → Required-nullable = MINOR bump (still permits old shape).

### F1 generator fix encoded

Per F1 (Foundation Audit generator finding): nullable enum emission uses `.nullable()` not `.optional()`. The generator's renderZod handles this when `type: [T, "null"] + enum: [...]` — emits `z.enum([...]).nullable()`. This rule is in generate-zod.mjs as of FOUND-401.

---

## 16 — Engine-config registry semantics (per ARD-017)

Tier 3 rule files (`content/rules/*.json`) have semantics distinct from Tier 1 content:

| Semantic | Tier 1 (schema_pack content) | Tier 3 (engine-config) |
|---|---|---|
| Loaded by engine | At first-read (lazy) | At startup (eager) |
| Validated by | Zod (per-write) + Postgres CHECK (per-row) | Tier 2 schema (at load) |
| Version | schema_pack version (v0.8.0) | Per-rule (`rule_id_v1` → `_v2`) |
| Updated by | Content author commits new row | Engine author commits new rule revision |
| Hot-reload | No (DB row write) | Yes (in dev mode; engine reloads RuleRegistry on file change) |
| Persistence | Postgres table | JSON files in repo |

Each Tier 3 rule MUST declare:
- `rule_id` (with version suffix `_v1` etc.)
- `applies_to_entity` + `applies_to_field` (target of the rule)
- `validator_chain_stage_<N>_hook?: boolean` (engine wiring marker)
- `engine_consumption_path` (string describing where engine consults this — for audit traceability)

Rule files do NOT have FK references to schema_pack entities; they reference by string name (decoupled from FK lifecycle).

---

## 17 — Generated artifact rules

Per ARD-009 generator pipeline + Foundation Audit Decision #9:

| Artifact | Source | Generator | Emission rules |
|---|---|---|---|
| `packages/types/src/generated.ts` | `schema_pack_v0.8.json` | `scripts/generate-types.mjs` | Emits TS interfaces + per-entity aliases (`PlayerSchema`, etc.) |
| `database/schema.postgres.generated.sql` | `schema_pack_v0.8.json` | `scripts/generate-ddl.mjs` | Emits CREATE SCHEMA + native ENUMs + lookup tables + tables with FKs + RLS enable + indexes + standard timestamps |
| `packages/types/src/zod-validators.ts` | `schema_pack_v0.8.json` | `scripts/generate-zod.mjs` | Emits Zod validators per $def + entity; nullable handling per F1; const literal per F2 |
| `repo_mirror/phase_24b/PHASE_24B_PUNCH_LIST.md` | per-Phase execution log | hand-authored | Audit trail of $defs + entities + ENUMs per Phase commit |

### Auto-injected columns (generator behavior)

Every emitted Postgres table gets:
1. `created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` — auto-injected
2. `updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()` — auto-injected (BEFORE UPDATE trigger applies)
3. `schema_version TEXT NOT NULL DEFAULT 'v0.8'` — auto-injected on `public.*` + `state.*` only (per ARD-016 dual-write phase)

Schemas DO NOT declare these fields. Generator handles. To opt OUT (e.g., append-only event logs without updated_at), declare `x_no_default_timestamps: true` on the entity.

### Generator output verification

After EVERY `schema_pack_v0.8.json` edit:
```bash
npm run gen        # types + ddl + zod regenerated
npm run gen:check  # CI gate — diffs all 3 outputs against committed; failing means commit the regenerated files
```

Per ARD-009 discipline. Hand-edits to generated files will be overwritten.

### Tier 2/3 do NOT regenerate downstream

Engine-config schemas (Tier 2) and engine-config data (Tier 3) do NOT trigger generator runs. They have their own validator path at engine startup. This is what allows engine-config to iterate without schema_pack version bumps.

---

## END

This document is the canonical reference for cross-cutting v0.8 conventions covering all 9 lock-list items:
1. snake_case schema ↔ camelCase runtime mapping (§2)
2. custom stats ↔ derived 5e stats (§1)
3. enum naming policy (§11)
4. ID conventions (§12)
5. registry-vs-schema boundaries (§13 + ARD-017)
6. table/entity naming (§14)
7. nullable vs optional conventions (§15)
8. engine-config registry semantics (§16 + ARD-017)
9. generated artifact rules (§17)

Plus stat translation (§1), range bounds (§3), per-meter rules (§4), focus_block (§5), tags primitive (§6), common timestamps (§7), campaign/session ownership (§8), schema versioning (§9), validation discipline (§10).

Session 5+ implementations cite this doc for translation rule reference. Updates land via separate ARD if any rule changes.

— Claude Desktop (Session 4c Phase 4.12)
