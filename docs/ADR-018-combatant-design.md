# ADR-018 — Combatant Primitive Design (v0.8)

**Status:** Accepted (2026-05-23)
**Phase:** Session 24d / 6a.7.1
**Supersedes:** none
**Superseded by:** none (live)
**Related:** ARD-009 (schema_pack canonical), ARD-010 (namespace partitioning), ARD-011 (normalization policy; polymorphic ownership REJECTED), ARD-017 (engine-config registry pattern)

---

## Context

Phase 24d 6a.7 promotes Cluster C combatant primitives to LIVE v0.8 content layer. Three candidates inventoried in Codex Cluster C + schema_pack:

- **CMB-SC-01 (core combatant)** — `content.combatant` table; LIVE since Phase 24c init
- **CMB-SC-02 (social_attack)** — `$defs.social_attack`; embedded JSONB on combatant.social_attacks
- **CMB-SC-03 (cosmological_redirection)** — `$defs.cosmological_redirection`; `$def` exists but NO target table; combatant carried a dead `cosmological_redirection_id` text col referencing the missing table

Phase 6a.7.0 pre-flight surfaced three concerns: (1) ARD-011 polymorphic-FK violation on SC-03 `target_entity_kind` enum + `target_entity_id` pattern; (2) missing target tables (wraith / haunting / cult / spirit / named_being); (3) NO Greywake-bound combatant exercises either SC-02 or SC-03 mechanics — both are Numerand-region content per Codex; Codex RT-CB-10 explicitly: *"M8 slice does not encounter Sum-Wraiths; the mechanic is documentation-only for the slice."*

This ADR records the v0.8 design decisions taken in response, with full coverage on the embedded-JSONB pattern (reusable guidance for future primitives) and the v0.9 deferral criteria for SC-03.

---

## Section A — social_attack embedded-JSONB design choice (LIVE in v0.8)

### Decision

`social_attack` lives as a JSON Schema `$def` embedded as a JSONB array on `content.combatant.social_attacks`. **NOT** promoted to a separate first-class table in v0.8.

### Rationale

**Composition, not aggregation.** A social_attack is OWNED BY a combatant — it is a definitional move-set member, not a free-standing entity with its own lifecycle. Aesthete-Magistrate has *its* social_attacks; Sergeant of Sanctions has *its* social_attacks; the moves do not exist apart from the combatant that wields them. Modeling as a separate table with FK back to combatant would invert the composition direction without adding queryable value (no engine query asks "show me all social attacks of kind X across combatants" in v0.8 — moves are looked up via the combatant).

**TEMPLATE-purity preserved.** All social_attack fields are TEMPLATE per Discipline-10 classification:
- `attack_id`, `name`, `attack_kind`, `target_resistance.stat`, `target_resistance.dc`, `range_in_scene_turns`, `effect_on_failure`, `effect_on_success`, `ledger_record`

There is **no per-instance state divergence** at the move level. A combatant's social_attacks do not mutate per campaign — the move-set is canon. Per-encounter state (was the move used this turn? did the player resist?) lives at the encounter/state level, NOT on the attack definition itself. Therefore no TEMPLATE/STATE split is needed; the moves stay embedded.

**Numerand-bounded scope.** Per `$def` description: *"Used by Aesthete-Magistrate, Sergeant of Sanctions, Closed-Books Servitor Operator (CMB.II.IV inventory)"*. Three Numerand combatants. v0.8 slice does NOT seed any combatant using this mechanic (Greywake combatants per CMB.I use traditional D&D physical/spell stat blocks). The schema is LIVE so v0.9 Numerand expansion has no schema barrier; the array is empty on all v0.8-seeded combatants.

**ARD-011 JSONB-rule carve-out.** ARD-011 §"JSONB-in-relational bounded" requires JSONB use to be justified case-by-case (defaults to normalization). The justification here:

1. **Composition cardinality is bounded by combatant authoring** (each combatant authors its own move-set; sizes are 1-8 per Codex).
2. **No cross-combatant query pattern** in v0.8 engine consumes social_attacks at aggregate level.
3. **Schema validation via `$ref: #/$defs/social_attack`** preserves per-row Zod validation (no loss of type safety vs separate table).
4. **No FK relationships originate from social_attack to other tables** (target_resistance.stat is enum-only; no entity refs).
5. **Edit cadence is authoring-time only** (no engine-runtime mutation of move definitions; per Discipline-10 STATE).

### Criteria for future embedded-JSONB design decisions

Use this pattern when ALL of the following hold:

| Criterion | Required | Rationale |
|---|---|---|
| Composition (owned-by) relationship | YES | Aggregation/free-standing → table |
| Bounded cardinality per parent | YES | Unbounded growth → table |
| No cross-parent query pattern | YES | Aggregate queries → table |
| No outgoing FK to other tables | YES | FK enforcement requires column-level → table |
| Authoring-time-only edit cadence | YES | Runtime mutation → STATE-split required |
| `$ref` available for Zod validation | YES | Without it, loses type safety |

If ANY criterion fails: promote to separate table with proper normalization per ARD-011.

**Examples in v0.8 honoring this pattern:**
- `combatant.social_attacks` (this ADR)
- `npc.want_model`, `npc.knowledge_tri_layer`, `npc.closing_conditions`, `npc.ambition_tick`, `npc.schedule_nesting` (Bundle A authored embedded per BUG-FIX-2)
- `plot_template.subplot_admission_policy` (Bundle E; BORDERLINE-1 ratified TEMPLATE; embedded $ref)
- `quest_template.discovery_channel`, `quest_template.subplot_graph_relation` (BORDERLINE-2/3)

**Counter-examples (promoted to tables despite size):**
- `plot_template` itself (per 6a.5.5; cross-campaign canonical content; FK target for state.plot)
- `quest_template` (same)
- `failure_state_branch_template` (per 6a.5.8.1; Discipline-10 split; FK target for state.failure_state_branch)

---

## Section B — cosmological_redirection v0.9 deferral rationale

### Decision

`$defs.cosmological_redirection` remains in schema_pack as documented design intent. The corresponding `content.cosmological_redirection` table is **NOT created in v0.8**. The dead text column `content.combatant.cosmological_redirection_id` (which referenced the never-created table) is **DROPPED** in Phase 6a.7.1 commit 1 (clean while empty).

Deferred to v0.9.

### Why deferred (three independent blockers)

**1. ARD-011 polymorphic ownership VIOLATION.**

`cosmological_redirection` per `$def` carries `target_entity_kind` enum (wraith / haunting / cult / spirit / named_being) + `target_entity_id` text — exactly the polymorphic-FK pattern ARD-011 §"polymorphic ownership REJECTED" forbids. Per-type FK columns + CHECK constraint OR join table required for restructure.

**2. Missing target tables.**

None of the 5 enum-named entity kinds have v0.8 tables:
- No `content.wraith` (Sum-Wraith lives in `content.creature` per Codex provenance — Numerand-original creature row)
- No `content.haunting`
- No `content.cult` (`cult_institution` is the umbrella, not specific cult entities)
- No `content.spirit`
- No `content.named_being`

ARD-011 fix Options A (per-type FK columns) and B (join table) both require these target tables. Authoring them is massive scope expansion not justified by any v0.8 consumer.

**3. Zero in-slice exercisers.**

Pre-flight audit (Phase 6a.7.0) confirmed NO Greywake-bound combatant exercises this mechanic across CMB.I (14 Greywake) + CMB.II.I (6 pan-world) catalogs. The mechanic is Sum-Wraith Whisperer signature — Numerand-region content per Codex provenance. Codex RT-CB-10 explicitly: *"M8 slice does not encounter Sum-Wraiths; the mechanic is documentation-only for the slice."*

Promoting the schema in v0.8 without a consumer violates the Path B principle ratified across Session 24d ("wire under real consumer pressure, not speculatively"). The mechanic is correctly scoped as design documentation in `$defs.cosmological_redirection` until consumers exist.

### v0.9 re-promotion requirements (ALL must be met)

| # | Requirement | Resolves |
|---|---|---|
| 1 | SC-03 schema redesign eliminating ARD-011 polymorphic-FK pattern | Blocker 1 |
| 2 | Prerequisite target tables authored (wraith / haunting / cult / spirit / named_being) OR enum restricted to existing tables (`creature` only) | Blocker 2 |
| 3 | Numerand-region content brought into slice scope (CMB.II.IV combatants seeded) | Blocker 3 (supply) |
| 4 | At least one in-slice combatant authored exercising the mechanic | Blocker 3 (demand) |

When all 4 met: v0.9 ALTER re-adds `combatant.cosmological_redirection_id` with proper FK target + creates `content.cosmological_redirection` table per ARD-011-compliant design.

### Re-promotion gate criteria (v0.9)

Before re-promotion, surface for ratification:

- Which restructure option (per-type FK columns vs join table vs restrict-to-creature single FK)?
- Discipline-10 template/state split for `target_entity_id` (canonical per-combatant target vs per-campaign emergent target)?
- Any new ADR sections needed?

---

## Consequences

**Positive:**
- v0.8 ships clean: no dead columns, no orphan tables, no ARD-011 violations
- Embedded-JSONB pattern documented with reusable criteria for future authoring decisions
- v0.9 has clear re-promotion path with measurable gate criteria
- Design intent preserved in `$defs.cosmological_redirection` (not lost to backlog drift)

**Negative:**
- SC-03 functionality unavailable in v0.8 demo (acceptable: no Greywake combatant needs it)
- Future Numerand promotion incurs schema-redesign work (acceptable: blocked by ARD-011 anyway)

**Tradeoffs accepted:**
- Embedded-JSONB pattern loses query-time normalization benefit (acceptable: no engine query needs aggregate social_attack access in v0.8)
- Re-promotion in v0.9 requires careful re-authoring of polymorphic target (acceptable: ARD-011 review forces good design)

---

## References

- Phase 6a.7.0 pre-flight audit: `repo_mirror/phase_24d/6a70_creatures_combatants_preflight_audit.md`
- ARD-011: Normalization policy (polymorphic ownership rejected)
- Codex RT-CB-10: Sum-Wraith documentation-only for M8 slice
- Schema_pack v0.8: `$defs.social_attack`, `$defs.cosmological_redirection`
- Migration 20260523170412 (Phase 6a.7.1 C1): drops dead column

---

*Authored 2026-05-23 by Claude Code during Phase 24d 6a.7.1 dispatch. Ratified by Khoja prior to commit (Path B-narrow option α + B-clean + write-ADR-now-full-coverage decision).*
