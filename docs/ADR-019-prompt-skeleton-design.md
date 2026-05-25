# ADR-019 — prompt_skeleton design (Phase 24d / 6a.8.1)

**Status:** ACCEPTED · LIVE per 6a.8.1 C1 (commit forthcoming)
**Date:** 2026-05-25
**Phase:** 24d Session 6a.8.1
**Supersedes:** none
**Related:** ADR-018 (combatant design — analogous embedded-JSONB pattern); L.VI §9817-10018 (canonical fingerprint spec)

## Context

Phase 24d 6a.8.1 seeds 4 NAMED Cluster A prompt_skeletons (Orro + Ilyra + Venn Hook + Caleth) per ratified Phase A/B/C voice-authenticity gate. During Phase A→B handoff, two architectural decisions surfaced that warrant ADR capture:

1. The Orro L.VI §9884-9956 canonical template's English-prose "RESPONSE CONSTRAINTS" pattern includes a conditional disclosure mechanism (barter-gate) that has no first-class field in the v0.8 schema's `constraint_block`.
2. `archetype_id` enum is mixed-shape (canonical NPC names + general archetypes). Caleth's Vested institutional-watch fingerprint has no direct enum-name match.

A third item — slide-trigger encoding deferral — was confirmed as out of scope for v0.8 prompt_skeleton rows and explicitly punted to engine consumer in 6b/7 per Phase B guardrail #4.

These three items together define a "prompt_skeleton authoring pattern" that downstream skeletons (Numerand/Aer'kal/Vesh-Kandar NPCs) will follow.

---

## §A — Barter-gate encoding: `voice_segments[trigger_kind=secret_pressured]`

### Problem

`content.prompt_skeleton.constraint_block` is strictly-typed in schema_pack_v0.8.json:9049-9058 with `additionalProperties: false`. Only 3 fields permitted:

```json
"constraint_block": {
  "type": "object",
  "required": ["forbidden_phrases", "required_register", "max_response_tokens"],
  "additionalProperties": false
}
```

The Orro L.VI §9884 canonical template embeds barter-gate as English prose inside RESPONSE CONSTRAINTS:

> "If audience class scores outside-both-contesting-factions AND barter (3) is available AND player's reputation with Bell Court ≥ 3, you MAY include a single hedged signal of the private doubt. This is barter, not free disclosure."

The L.I `barter` array per-NPC (§8806 Ilyra, §8822 Orro, §8838 Venn Hook, §10678 Caleth) declares 2-3 conditional disclosure pathways per character. These need structured encoding to be engine-consumable.

### Decision

**Barter-gates encode as `voice_segments[]` entries with `trigger_kind = "secret_pressured"`** (existing schema enum value at schema_pack_v0.8.json:9040). Each barter-gate becomes:

```json
{
  "segment_id": "<npc>-barter-<cost-tag>",
  "trigger_kind": "secret_pressured",
  "text_template": "<L.I barter-array text rendered as authored dialogue>"
}
```

Engine consumer (deferred to 6b/7) reads `voice_segments` with `trigger_kind=secret_pressured` and fires the text_template when audience-pressure crosses gate threshold (defined per-NPC in `base_prompt` RESPONSE CONSTRAINTS text body).

### Audience-class gate authoring discipline

Gate-condition prose lives in the `base_prompt` RESPONSE CONSTRAINTS section, NOT in the voice_segment itself. Example (Ilyra):

```
RESPONSE CONSTRAINTS:
  — If audience_class scores vessel-class AND barter (4) available, you MAY
    unbind one wrist as gesture-of-blessing per secret_pressured segment.
    Never both wrists.
```

This places the conditional logic in the LLM's reasoning context (where it can apply the rule) and the conditional text in the trigger-keyed segment (where the engine can index it). The two-part encoding is the canonical pattern.

### Worked examples (LIVE in 6a.8.1 C1)

| Skeleton | Barter-gate segment | L.I source | Cost | Audience gate |
|---|---|---|---|---|
| `skel-orro-devoted` | `orro-barter-audit-forgiveness` | §8822 (1) | 4/5 | player closes one open contradiction |
| `skel-orro-devoted` | `orro-barter-private-doubt` | §8822 (3) | 5/5 | outside-both-contesting-factions + rep ≥ 3 |
| `skel-ilyra-marrow-saint` | `ilyra-barter-wax-pilgrim-names` | §8806 (1) | 5/5 | vessel-class + Bell-Court-shield |
| `skel-ilyra-marrow-saint` | `ilyra-barter-unbind-wrist` | §8806 (3) | 4/5 | vessel-class only |
| `skel-venn-hook-fugitive` | `venn-barter-confession-on-offer` | §8838 (2) | 5/5 | pressure-cracks-cover (audit topic OR 8min idle) |
| `skel-venn-hook-fugitive` | `venn-barter-exit-passage` | §8838 (3) | 4/5 | clean civic-record stand-in class |
| `skel-caleth-vested` | `caleth-barter-orro-doubt` | §10678 (3) | 5/5 | off-duty + no-faction-loyalty + end-of-shift |
| `skel-caleth-vested` | `caleth-barter-sealed-log` | §10678 (2) | 4/5 | writ-permit OR outside-both-contesting-factions |

### Reusable design criteria (when a future skeleton needs barter-gate encoding)

A future NPC's `L.I barter[]` entry encodes as a `voice_segments[secret_pressured]` row when ALL of the following hold:

1. The barter is **audience-conditional** (not universally available)
2. The barter has a **cost ≥ 3/5** (lower-cost barters can encode as topic_raised segments)
3. The barter exposes **non-public stack content** (the disclosure is the barter; the trigger is the audience-pressure crossing)
4. The audience gate is **expressible as L.I-tier predicates** (faction-loyalty / reputation / on-duty / pressure-score / canon-event-witnessed flags)

If criteria 1-3 hold but 4 does not (audience gate requires runtime-novel predicates), surface as v0.9 backlog candidate for predicate-DSL extension before encoding.

### Reuse forecast

All future Numerand/Aer'kal/Vesh-Kandar NAMED NPCs with `L.I barter[]` arrays will follow this encoding pattern. Estimated reuse: ~12-18 future skeletons across pan-world regions (each with 2-3 barter-gates).

---

## §B — Slide-trigger deferral (skeletons carry NO slide encoding in v0.8)

### Problem

L.VI §9975-9985 documents three slide patterns:
- Ambition denied: Climbing → Bereaved (passover_state trigger)
- Cover blown: Devoted → Cynical (writ-fail public-exposure trigger)
- Exit secured: Fugitive → off-stage (success_state trigger)

These slides ARE content the engine produces per RT-34 ratification at L.VI §10000. The question for v0.8 prompt_skeleton: do skeletons encode slide-trigger declarations, OR does the engine consumer (6b/7) handle slide wiring entirely?

### Decision

**Skeletons carry NO slide-trigger encoding in v0.8.** Per Phase B guardrail #4 (Desktop-ratified): "Engine consumer (6b/7) handles reactive-behavior wiring."

Skeleton rows are **voice + conditional disclosure** only:
- ✅ Voice register (base_prompt + voice_segments)
- ✅ Conditional disclosure (voice_segments[secret_pressured] per §A)
- ❌ Reactive-behavior wiring (slide triggers, closing-state transitions, archetype mutation)

### Rationale

1. **Schema doesn't model slide-triggers as a first-class field.** The `prompt_skeleton` row has 11 columns; none represents archetype-mutation pathways. Forcing slide encoding would require schema extension AND constraint-block expansion (rejected per §A `additionalProperties: false` enforcement) AND a slide-trigger predicate language (does not exist).
2. **Slide is a closing-state-consequence-tree concern, not a voice concern.** Per L.VI §10000 RT-34, slides fire from `L.V plot closing-state-consequence trees` as "world-delta commits" — this is engine state-mutation, structurally adjacent to FSB execution, not to dialogue generation.
3. **Engine consumer can rewrite skeleton voice surfaces at slide-fire time.** When an NPC slides (e.g., Ilyra Devoted → Bereaved at passover_state), the engine consumer in 6b/7 regenerates the LLM prompt skeleton with the new archetype's surfaces. The skeleton ROW is replaced (not mutated). This honors L.VI §9985: "The LLM prompt skeleton is regenerated with the new fingerprint surfaces."

### v0.9 deferral pattern (analogous to ADR-018 §B)

`slide_trigger_encoding` is **deferred to v0.9** per v0.9 backlog #31 (added in 6a.8 close per Desktop directive). Re-promotion requirements:

1. Engine consumer (6b/7) implementation surfaces concrete need for skeleton-side slide-trigger declarations
2. A predicate language exists OR predicate DSL (v0.8 #18 LIVE) extends to cover closing-state proximity predicates
3. Schema extension proposal includes how slides interact with `cluster_a_override` (Listening Child + Butcher are slide-immune per L.VI waiver)
4. Cluster A's "skeleton is voice-only" boundary is explicitly re-ratified OR explicitly broken with worked example

Until v0.9: skeletons carry voice + conditional disclosure ONLY. Slide wiring is engine consumer's responsibility.

---

## §C — `archetype_id` enum-fit discipline + Discipline 11 capture

### Problem

`personality_archetype` enum (schema_pack_v0.8.json:9015-9020) is mixed-shape:

```
marrow_saint, bell_magistrate, venn_hook, butcher_who_repeats, listening_child,
closed_books_servitor_operator, aesthete_magistrate, sergeant_of_sanctions,
sum_wraith_whisperer, default_militant, scholar_witness, contradiction_bearer
```

- 5 values are **canonical NPC names** (marrow_saint, bell_magistrate, venn_hook, butcher_who_repeats, listening_child) — for Greywake's 5 named NPCs
- 7 values are **general archetypes** (default_militant, scholar_witness, contradiction_bearer, etc.) — for combatants, supporting NPCs, and pan-world NPC roles

L.VI §9836 declares 8 PERSONALITY ARCHETYPES (Vested / Bored / Watchful / Bereaved / Climbing / Devoted / Cynical / Fugitive). The schema enum has NONE of these by name. The mapping is implicit:

| L.VI archetype | Best schema enum fit | Rationale |
|---|---|---|
| Devoted | `marrow_saint`, `bell_magistrate` | Canonical Greywake instances (Ilyra + Orro) |
| Fugitive | `venn_hook` | Canonical (locked archetype per L.VI §9966) |
| Vested | `sergeant_of_sanctions`, `closed_books_servitor_operator`? | Best fit; no direct name match |
| Cynical | (Voryn — not yet a skeleton row; would also need fit decision) | TBD |
| Bored / Watchful / Bereaved / Climbing | reserve enum slots | Unused in Greywake roster |

Caleth's case: she IS a Sea-watch sergeant with civic enforcement role. The enum value `sergeant_of_sanctions` matches sergeant-rank + civic enforcement framing. Alternative candidates:
- `bell_magistrate`: shares Bell-Court faction parent with Orro, but conflates her Vested voice with his Devoted voice — bad fit
- `default_militant`: already used by Glass-Tooth Gang combatant — generic-fallback dilution
- `scholar_witness`: wrong fit (scholarly + observer; Caleth is institutional+watch)

### Decision

**`sergeant_of_sanctions` selected for Caleth.** Rationale documented in PR commit + 6a.8.1 migration header + Phase B §3.

For future skeleton authoring: when L.VI archetype has no direct enum-name match, apply the following discipline order:

1. **L.VI archetype primacy:** the L.VI archetype declared in Codex (Vested/Bored/Watchful/etc.) is authoring-layer truth
2. **Enum match:** find the closest enum value via semantic role (institutional-rank + faction + posture)
3. **Anti-pattern (forbidden):** do NOT pick an enum value that conflates with a different L.VI archetype's signature voice (e.g., do NOT assign `bell_magistrate` to a Vested NPC; that's Orro's Devoted slot)
4. **Anti-pattern (forbidden):** do NOT default to `default_militant` for non-combatant Vested NPCs (semantic dilution)
5. **Surface to Khoja:** if no clean fit exists OR the choice is non-obvious, flag at Phase C voice-authenticity gate for ratification

### Discipline 11 capture

**"Authoring-layer truth supersedes archetype-level intuition."**

The L.VI Codex content is the authoring-layer truth (Khoja-ratified narrative design). The schema enum is implementation-layer convention (engine consumer infrastructure). When the two diverge, the L.VI archetype wins; the enum value is selected per the discipline order above and the rationale is documented at row-creation time.

Caleth's `sergeant_of_sanctions` is NOT a claim that her L.VI archetype IS sergeant-of-sanctions. It is the engine's closest indexable handle for her authoring-layer Vested archetype. The voice fingerprint dimensions in her skeleton (`base_prompt` + `voice_segments` + `constraint_block`) carry the actual Vested register; the enum is a category tag for engine lookup.

This is Discipline 11. Future archetype_id selections invoke it.

### Worked examples (LIVE in 6a.8.1 C1)

| NPC | L.VI archetype | Enum chosen | Discipline 11 captured? |
|---|---|---|---|
| Orro | Devoted (procedural-civic) | `bell_magistrate` | Canonical name match — no Discipline 11 needed |
| Ilyra | Devoted (liturgical-mystical) | `marrow_saint` | Canonical name match — no Discipline 11 needed |
| Venn Hook | Fugitive (locked) | `venn_hook` | Canonical name match — no Discipline 11 needed |
| **Caleth** | **Vested (institutional-watch)** | **`sergeant_of_sanctions`** | **YES — first Discipline 11 worked example** |

---

## Consequences

### Positive

- Schema constraint enforcement (`additionalProperties: false` on `constraint_block`) preserved
- Barter-gate encoding pattern documented + reusable across pan-world NPC seeding (~12-18 future skeletons forecast)
- Slide-trigger concerns cleanly deferred to engine consumer; no skeleton-side scope creep
- Discipline 11 captured + Codex authoring-truth-primacy established for future archetype_id selections
- All 4 Cluster A NAMED skeletons LIVE without schema modifications

### Negative

- Barter-gate audience predicates live in `base_prompt` text body (NOT structured predicates per v0.8 #18 DSL); engine consumer must parse English-prose conditions OR negotiate a separate predicate DSL extension at 6b/7 build
- `archetype_id` enum doesn't directly model L.VI's 8 personality archetypes; future skeletons risk archetype-confusion if Discipline 11 isn't honored

### Risks

- Future Listening Child / Butcher skeleton work (if v0.9 lifts waiver per Desktop directive) requires `cluster_a_override = true` pattern that has NO worked example yet; this ADR does NOT cover that case — would warrant ADR-020
- `sergeant_of_sanctions` enum value semantic drift: future NPC who genuinely IS a sanctions-enforcement sergeant (not Sea-watch) may collide with Caleth's slot; mitigation = NPC-specific override via non-null `npc_id` foreign key

---

## Related work

- **ADR-018 (combatant design):** analogous §B v0.9 deferral pattern for cosmological_redirection; analogous §C anchor-pattern discipline
- **v0.9 backlog #31:** slide-trigger encoding pattern (this ADR §B-deferred)
- **Phase B drafts:** `repo_mirror/phase_24d/6a82_phase_b_skeleton_drafts.md`
- **Phase A prerequisites:** `repo_mirror/phase_24d/6a81_phase_a_skeleton_prerequisites.md`
- **Migration:** `supabase/migrations/20260525034713_6a81_c1_seed_4_prompt_skeletons.sql`

— Claude Code (Phase 24d Session 6a.8.1 — ADR-019 prompt_skeleton design)
