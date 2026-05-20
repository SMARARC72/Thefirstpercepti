# Engineering Plan — Phase 12 → v1 Slice Ship

> **Authored:** 2026-05-20 in local design folder. Full version: `The_First_Perception_Living_Codex.html` Sec Plan.I-VI.
> **Mirror this file:** `docs/ENGINEERING_PLAN.md` in repo.

## What this is

14 sequenced phases from current repo state (Phase 11b) to v1 slice ship (Phase 25). ~19 sprints / ~9 months solo at sustainable cadence. Compressible to ~6 months with parallelization.

## Phase ladder

### Phase 12 — Wave A: ARD cleanup + memory sync (0.5 sprints) ✅ DONE 2026-05-20

Executed in local design folder. ARD-003 SUPERSEDED (no Godot), ARD-002 RECONCILED (4-5 agents), ARD-008 SUPERSEDED (repo progress.md is cadence). Memory pass. This `docs/ENGINEERING_PLAN.md` + `docs/RECONCILIATION_AUDIT.md` mirror is part of DOC-006.

### Phase 13 — Wave B: Schema reconciliation (1 sprint)

**Goal:** Generate TypeScript types from `schema_pack_v0.5.json`; align with `packages/types/src/index.ts`; resolve diffs.

**Tickets:**
- ENG-101: Add `json-schema-to-typescript` to devDependencies; script in `scripts/generate-types.mjs`
- ENG-102: Copy `schema_pack_v0.5.json` into repo at `content/schemas/`; generate `packages/types/src/generated.ts`
- ENG-103: Diff `generated.ts` against existing `index.ts`; resolve field-by-field
- ENG-104: Replace `index.ts` entries with `generated` where compatible; mark divergences with comments
- ENG-105: Update 9 test files for any breaking type changes; verify 96 specs still pass
- ENG-106: CI step — run schema-to-ts on every push; fail build if `generated.ts` is stale

### Phase 14 — Wave C: Design system port (1 sprint)

**Goal:** Migrate `design_system/` (palette + motifs + voice constraints) into repo.

**Tickets:**
- UI-101: Port `design_system/colors_and_type.css` palette to `packages/ui-system` CSS vars
- UI-102: Port 8 motif SVGs as inline-SVG components in `packages/ui-system`
- UI-103: Replace fonts (Cormorant Garamond + Inter UI → EB Garamond + IM Fell English SC + Caveat + JetBrains Mono)
- UI-104: Audit `apps/web` for icon-font / emoji usage; remove anything not in allowed glyph list (◆ ❦ ↻ → ·)
- DOC-101: Update `apps/web` README to reference `design_system/` as canonical brand source

### Phase 15 — Wave D-1: Greywake content slice port (1.5 sprints)

**Goal:** Replace generic content with Greywake canon.

**Tickets:**
- CONTENT-101: Replace `content/world-data/factions.json` with 3 Greywake factions (Drowned Church, Civic Bell Court, Merchant Tide League)
- CONTENT-102: Replace `content/world-data/npcs.json` with 5 named slice NPCs (Marrow-Saint Ilyra, Bell-Magistrate Orro, Venn Hook, The Listening Child, The Butcher Who Repeats)
- CONTENT-103: Replace `content/world-data/items.json` with ~30 slice items
- CONTENT-104: Author `content/world-data/locations.json` with Greywake Market District + 5 sub-locations
- CONTENT-105: Update all tests referencing old IDs
- CONTENT-106: Update `?demo=1` flow to load Khojen baseline (L2 Warlock Tiefling, Day 14)

### Phase 16 — Wave E: Validator chain port (1 sprint)

**Goal:** 6-stage validator chain as middleware in `TurnOrchestrator`.

**Tickets:**
- ENG-201: Add `ValidatorPipeline` class in `packages/engine`; 6 stages per ARD-004
- ENG-202: Wire `TurnOrchestrator` to call `ValidatorPipeline.process()` before `applyPatches`
- ENG-203: Implement stages 1-3 (input / rules / canon_consistency)
- ENG-204: Implement stage 4 (canon_progression) — reads `schema_pack_v0.5` writer_authority paths
- ENG-205: Implement stage 5 (contradiction_check) — reads `contradiction_ledger`
- ENG-206: Implement stage 6 (content_boundary) — tiny self-hosted classifier or rule-based
- ENG-207: Unit tests for each stage

### Phase 17 — Wave F: Manifesto + voice port (1.5 sprints)

**Goal:** Voice eval framework + R-51 cost_layer enforcement + Form-of-Ending prompt.

**Tickets:**
- ENG-301: R-51 cost_layer enforcement in `ValidatorPipeline` stage 4
- ENG-302: Voice eval framework in `packages/narrative`
- ENG-303: Author 100-item gold set for voice eval
- ENG-304: CI: voice eval score on every commit; warn < 0.85, fail < 0.7
- ENG-305: Port `narrator_form_of_ending.md` (359 lines) to `GMNarrator` system prompt for ending generation
- ENG-306: Apply 7 voice constraints to `GMNarrator` default system prompt
- ENG-307: Adversarial test suite (~50 jailbreak prompts); stage 6 must reject all

### Phase 18 — Wave D-2: Greywake Ink scenes (1.5 sprints)

**Goal:** 5+ new `.ink` scenes for Greywake slice.

**Tickets:**
- CONTENT-201: `content/narrative/scenes/dry_fountain.ink`
- CONTENT-202: `content/narrative/scenes/notice_07.ink` through `notice_10.ink` (4 Notice Ladder transitions)
- CONTENT-203: `content/narrative/scenes/bell_magistrate.ink` (Bell-Magistrate Orro confrontation)
- CONTENT-204: `content/narrative/scenes/marrow_saint.ink` (Marrow-Saint Ilyra dialogue)
- CONTENT-205: `content/narrative/scenes/x12_apotheosis.ink` (X.12 ending)
- CONTENT-206: Update `content/narrative/main.ink` to INCLUDE new scenes

### Phase 19-25 — abbreviated

Full per-ticket detail in Living Codex Sec Plan.IV when each phase kicks off.

- **Phase 19 (2 sprints)** — Wave G-1: Slice catalog port (materials, spells, items, recipes, litanies, marginalia, conditions, imposed spells from local `regional_packs/greywake/` + slice subsets of pan-world catalogs)
- **Phase 20 (2.5 sprints)** — Wave J: Wireframes → apps/web surfaces (Specimen Jar portrait, World Pulse ticker, Notice Ladder UI, Character Sheet v3, Character Creation flow, X.12 Form-of-Ending postcard export)
- **Phase 21 (1.5 sprints)** — Wave K: Opex throttle + bundled local-LLM fallback
- **Phase 22 (1 sprint)** — Wave L: Accessibility commitments (R-116-D, R-117-D, R-62)
- **Phase 23 (2 sprints)** — Slice integration + bug-bash; all 25 polish criteria green
- **Phase 24 (1.5 sprints)** — Demo prep + Steam Next Fest content
- **Phase 25 (0.5 sprints)** — v1 slice ship

## Critical path

```
Phase 12 ARD cleanup
  → Phase 13 Schema reconciliation
    → Phase 15 Greywake content slice port
      → Phase 18 Ink scenes
        → Phase 23 Slice integration
          → Phase 24 Demo prep
            → Phase 25 v1 ship
```

## Parallel tracks (run alongside critical path)

| Track | Phases | Starts after |
|---|---|---|
| UI / Wireframes | 14, 20 | Phase 12 |
| Engine discipline | 16, 17 | Phase 13 |
| Infrastructure | 21, 22 | Phase 13 |
| Bulk catalog port | 19 | Phase 13 + 15 |

## Hard external gates

- **MYTHOLOGY_AUDIT outside-review** — blocks Phase 19 substrate items
- **Steam Next Fest application** — 3+ month lead time
- **Local-LLM fallback model selection** — needs voice-eval-suite-based testing

## Fragility points

- Single-engineer risk (illness, distraction)
- Two-Claude-track coordination — Phases 12-17 SINGLE-TRACK ONLY
- Voice regression on model upgrades (mitigation: Phase 17 voice eval suite)
- Substrate IP audit closure
