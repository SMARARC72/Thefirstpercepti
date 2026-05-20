# v1 Polish Criteria — What Counts as Ship-Ready

> **Authored:** 2026-05-20 in local design folder. Full version: Living Codex Sec Plan.I.
> **Mirror this file:** `docs/POLISH_CRITERIA.md` in repo.

## Slice scope (what v1 ships)

Greywake Market District vertical slice. Single character flow (no party in v1). 1 calling (Warlock) + 1 race (Tiefling). ~10 spells. 1 ending path playable to completion (X.12 Apotheosis recommended). 3 factions. 5 named NPCs. 4 Greywake conditions. 5 Imposed spells. 6-7 recipes. Bell-Marked Charm crafting chain functional. Notice Ladder 7-10 plays through Convergence. Form-of-Ending postcard exports as PNG.

## Engineering polish bar (10 binding criteria)

| # | Criterion | Validator |
|---|---|---|
| P.1 | All 96 existing repo tests pass | `npm run verify` green |
| P.2 | Greywake content only; generic content removed | Manual + content-validator |
| P.3 | 6-stage validator chain enforces R-51 cost_layer on every spell cast | Unit test |
| P.4 | Content Boundary Validator blocks 100% of defined jailbreak corpus | Adversarial test suite (~50 prompts) |
| P.5 | Voice eval suite scores Narrator output ≥ 0.85 on every commit | CI voice eval |
| P.6 | Bundled local-LLM fallback degrades gracefully on Claude+Kimi failure | Manual smoke (revoke keys) |
| P.7 | Postgres cross-run memory survives sim-day boundary | Integration test |
| P.8 | Per-account opex throttle caps cost at $X/hour | Per-account budget in /api/llm |
| P.9 | Form-of-Ending postcard exports as PNG with voice constraints applied | Manual screenshot review |
| P.10 | Accessibility settings shipped (reduced motion / screen reader / color-blind palette / adaptive prose density) | Toggleable + persistent |

## Content polish bar (8 binding criteria)

| # | Criterion |
|---|---|
| C.1 | All 6 Greywake recipes craft-resolve through validator chain (Bell-Marked Charm 6-step chain works end-to-end) |
| C.2 | All 5 Imposed spells cast with correct R-51 cost_layer |
| C.3 | 3 cult institutions enforce taboos with social_response consequences |
| C.4 | 12 litanies trigger correctly per substrate exposure |
| C.5 | 12 marginalia samples fire on correct trigger conditions |
| C.6 | 4 Greywake conditions resolve via correct removal methods |
| C.7 | 3 substrate JSON files (non-outside-review-flagged) integrate into Narrator prompt context |
| C.8 | X.12 ending plays through to canonical Form-of-Ending with deity-birth canon event firing |

## UI/UX polish bar (7 binding criteria)

| # | Criterion | Source |
|---|---|---|
| U.1 | Specimen Jar portrait recomposes on stat/meter/condition change | R-111-D + wireframes/promoted/PORTRAIT_RECOMPOSE.html |
| U.2 | World Pulse ticker drifts 1 item / 8s with hover-pause | R-113-D + wireframes/promoted/PULSE_01.html |
| U.3 | Notice Ladder 7-10 UI matches wireframes | wireframes/promoted/NOTICE_07-10.html |
| U.4 | Character Sheet v3 ships 3 tabs (Spells/Features/Background) minimum | wireframes/promoted/CHAR3_02/03/06.html |
| U.5 | Character Creation 6-step flow ships steps 2/3/5/6 minimum | wireframes/promoted/CC_Race/Class/Equipment/Confirm.html |
| U.6 | Design system palette enforced (12-color closed, no emoji except ◆ and ❦) | design_system/colors_and_type.css + voice constraints |
| U.7 | 1366×768 responsive density holds (R-62 closure) | Manual viewport test |

## Explicitly NOT in v1 polish bar

- Party system / Companion endings
- Mad-sci body modifications
- Exploration system
- Multi-region content
- Cinematic Primitives Library (Horizon Move 2)
- Kickstarter campaign (Horizon Move 5)
- Modular substrate kit (Horizon Move 6)
- AI illustrator field-journal sketches
- Suno music gen / ElevenLabs voice fine-tunes
- Console builds / Mobile

## Definition of Done (the gate before Phase 25 ship)

When all 25 polish criteria above are green AND:

- ≥ 150 specs passing
- Coverage ≥ 70% on `packages/engine` + `packages/narrative`
- Turn latency p50 ≤ 2s, p95 ≤ 5s
- WCAG 2.1 AA on slice surfaces
- AI-usage disclosure page live
- `MYTHOLOGY_AUDIT_v0.4` §11/§11b items closed for slice-shipping substrate
- `?demo=1` plays 30-minute Greywake loop start-to-X.12-ending unassisted
- Production deploy live on canonical domain
