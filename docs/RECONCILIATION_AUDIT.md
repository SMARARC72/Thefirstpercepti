# Reconciliation Audit — Repo × Local Design Layer

> **Authored:** 2026-05-20 in the local design folder. Mirror copy in repo via `repo_mirror/`.
> **Full version:** `The_First_Perception_Living_Codex.html` Sec Aud.I-V (local design folder).

## TL;DR

This repo (`github.com/SMARARC72/Thefirstpercepti`) is the **canonical codebase** for The First Perception. A parallel design layer (Living Codex hub + schema_pack_v0.5.json + ~580 content records + 43 wireframes + engineering atlas + 30+ spec markdowns) has been developed in a separate Claude Desktop session by the same person (Khoja, arahimi95@icloud.com).

**Determination: SALVAGE the repo. PORT the design into it. DO NOT start from scratch.**

The two tracks evolved in parallel for ~4 days and converged on every load-bearing design decision (9-stat system, 5e overlay, Ink narrative, cosmic-horror tone, fountain motif). They diverged on:
- **Stack** (repo: Vite+TS; design assumed Godot) → repo wins, design Godot ARD is SUPERSEDED
- **Agent topology** (repo: 4 agents; design: 9 agents) → repo wins for implementation; 9 stays as conceptual layering; +1 Content Boundary Validator in Phase 16 → 5 total
- **Content** (repo: small generic set; design: 580+ Greywake-specific records) → design wins for canon
- **Schema** (repo: TS types in packages/types; design: schema_pack_v0.5.json with 80 v0.5 additives) → design wins as spec, code-gen TS types from it
- **Manifesto guardrails** (repo: not present; design: 7 binding rules) → design wins, port to validator chain + Narrator prompt

## 19-component matrix (summary)

| Verdict | Count | Examples |
|---|---|---|
| EXACT MATCH | 3 | Narrative engine choice (Ink), 9-stat system, 5e overlay basics |
| CLEAN PORT (design → repo) | 3 | Catalogs (~580 records), manifesto guardrails, design system tokens+motifs |
| ACTIVE RECONCILE | 5 | Agent topology, schema representation, content names, validator chain, sprint/phase tracking |
| DEFER PORT | 2 | Party system, mythological substrate (substrate IP-gated) |
| REPO BETTER | 3 | Persistence (Postgres + GameRepository pattern), LLM runtime (Claude+Kimi proxy), deployment (Vercel) |
| EXPLICIT DECISION REQUIRED | 2 | Client stack (RESOLVED: Vite+TS wins; ARD-003 SUPERSEDED), content canon (RESOLVED: design Greywake wins) |
| STAYS LOCAL | 1 | Living Codex hub itself (design north star, not engineering artifact) |

Full per-component matrix in Living Codex Sec Aud.II.

## Migration plan (14 phases)

| Phase | Wave | Goal |
|---|---|---|
| 12 | A | ARD cleanup + memory sync (DONE 2026-05-20) |
| 13 | B | Schema reconciliation — generate TS types from schema_pack_v0.5.json |
| 14 | C | Design system port — palette + motifs + voice constraints |
| 15 | D-1 | Greywake content slice port (factions/NPCs/items/locations) |
| 16 | E | Validator chain port (6 stages as middleware in TurnOrchestrator) |
| 17 | F | Manifesto + voice port (eval suite + R-51 cost_layer enforcement) |
| 18 | D-2 | Greywake Ink scenes (dry fountain, Notice 7-10, Magistrate, Marrow-Saint, X.12 apotheosis) |
| 19 | G-1 | Slice catalog port (recipes/litanies/marginalia/conditions/imposed spells) |
| 20 | J | Wireframes → apps/web surfaces (slice subset) |
| 21 | K | Opex throttle + local-LLM fallback |
| 22 | L | Accessibility commitments (R-116-D, R-117-D, R-62) |
| 23 | — | Slice integration + bug-bash |
| 24 | — | Demo prep + Steam Next Fest content |
| 25 | M8 | v1 slice ship |

Total: ~19 sprints ≈ 9 months solo. Detailed plan in `docs/ENGINEERING_PLAN.md`.

## Hard external gates

- **MYTHOLOGY_AUDIT_v0.4 §11/§11b outside-review** — Jewish + Polynesian substrate items need outside review before substrate ports land in repo content/. Blocks Phase 19 substrate work. Khoja must engage outside reviewers.
- **Steam Next Fest application** — 3+ month lead time. Apply during Phase 22 for desired fest date.

## Claude-track coordination rule

To prevent the two parallel tracks from re-diverging:

- **Phases 12-17 (the reconciliation core): SINGLE TRACK ONLY.** All work in either Claude Desktop OR Claude Code, not both. Recommended: Claude Desktop (has the design context).
- **Phases 18+:** hybrid OK, but every session must start by re-reading this file + the Living Codex's Sec Aud.V (Determination + Migration Plan). Weekly drift check: compare repo's progress.md against codex's most recent additions.

## Source files (local design layer)

- `The_First_Perception_Living_Codex.html` — 7085 lines / 656 KB, 69 chapters, 10 collapsible sidenav groups. North star.
- `schema_pack_v0.5.json` — 37 entity schemas, 26 $defs, 80 v0.5 candidates applied. Canonical spec.
- `design_system/` — palette + 8 motifs + brand bible (244 lines) + 11 JSX UI kit components + voice constraints (7 binding rules)
- `wireframes/` — 46 low-fi screens + 43 hi-fi promoted surfaces, all major design surfaces covered
- `engineering_atlas/` — 8 React+Babel architecture diagrams (one version behind on schema specifics; conceptually still useful)
- `regional_packs/greywake/` — slice content (3 cult institutions, 12 litanies, 12 marginalia, 5 Imposed spells, 6 recipes, 4 conditions)
- `content/` — pan-world catalogs (135 materials, 153 spells, 198 items, 25 loot tables, 5 substrate JSONs)
- ~30 mechanics + workflow markdown specs (Notice Ladder, Practicing Water Supply, Workflows X.12-X.16, M2 Paper Prototype, Narrator Form-of-Ending, etc.)
