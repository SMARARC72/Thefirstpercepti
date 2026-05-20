# @first-perception/ui-system

The Tide-Stained Codex design system for The First Perception. Single source of design tokens, motifs, and accessibility helpers.

## Canonical source

Tokens, motifs, and the brand bible originate in the **design layer** (the local `My video Game/design_system/` folder), specifically:

- `design_system/colors_and_type.css` — 12-color closed palette + 4-font system + spacing/radii/strokes/shadows/motion
- `design_system/assets/motifs/*.svg` — 8 canonical iconographic motifs
- `design_system/README.md` — 244-line brand bible

This package mirrors those tokens into the repo so workspaces can consume them. The design layer is the spec; this package is the implementation.

See `project_reconciliation_state.md` in the user's memory + `docs/RECONCILIATION_AUDIT.md` for the broader two-track context.

## What's in here

### `src/styles.css` — design tokens + base reset

Three layers, top to bottom:

1. **Tide-Stained tokens** (canonical) — Vellum / Brass / Tide-Ink palette, EB Garamond + IM Fell English SC + Caveat + JetBrains Mono fonts, paper shadows, no bounce motion.
2. **Legacy compatibility layer** (deprecated) — aliases old Void/Teal/Gold + Phase 6 Grimoire tokens (`--void-*`, `--teal-*`, `--gold-*`, `--ember-*`, `--sigil-*`, etc.) onto Tide-Stained equivalents so existing components keep rendering during migration. Marked `(DEPRECATED)` in comments.
3. **Base reset + utilities** — brand-agnostic (scrollbar, focus-visible, film grain, animations, semantic type classes, chips).

### `src/motifs.ts` — 8 iconographic SVGs

```typescript
import { motifMarkup, renderMotif, MOTIFS, MOTIF_NAMES } from "@first-perception/ui-system";

// Direct injection:
element.innerHTML = motifMarkup("brass_frame");

// DOM element with aria:
container.appendChild(renderMotif("wax_seal", "Canon event committed"));

// Decorative (aria-hidden):
container.appendChild(renderMotif("inkblot", ""));
```

Motif names: `tide_line` · `brass_frame` · `wax_seal` · `inkblot` · `tide_rise_meter` · `specimen_jar` · `wonderland_warp` · `litany_card`.

### `src/index.ts` — utilities

- `prefersReducedMotion()` / `setReducedMotion(enabled)`
- `setHighContrast(enabled)`
- `setFontSize(size)`
- `AnimationController` / `TypewriterOptions` / `ComponentBase` interfaces

## Discipline (binding for all UI work)

These are non-negotiable per the design bible:

- **12-color palette is CLOSED.** Phosphor (`#6FE0C8`) is creator/debug only. No new color tokens added without a canonical decision.
- **No icon font, no Lucide, no Heroicons, no Material Icons.** Diagrams over pictograms. The 8 motifs + verb-chips + status glyphs are the entire iconographic vocabulary.
- **No emoji anywhere.** Only typographic ornaments permitted: `◆` (Authority-cost) and `❦` (litany prefix). Plus `↻` (Wonderland-warp), `→` (button arrow), `·` (interpunct). Enforced by `scripts/audit-glyphs.mjs` (CI gate).
- **No bounce, no spring, no elastic motion.** The world has gravity. Motion is rationed to six specific behaviors.
- **No photographs, no painted backgrounds, no full-bleed renders.** Diagrams and prose only. SVG-only if any imagery appears; in palette; single composition.
- **No drop shadows as depth signal.** Two shadow layers exist: paper-shadow (page lift) and wax-seal shadow (canon commits). Nothing else floats.

## Phase 14 / Wave C — migration status

This package was overhauled in Phase 14 of the Engineering Plan (see `docs/ENGINEERING_PLAN.md`).

| Ticket | Status |
|---|---|
| UI-101 — Port Tide-Stained palette + typography | ✅ |
| UI-102 — Port 8 motif SVGs as inline TypeScript components | ✅ |
| UI-103 — Replace fonts (Cinzel + Inter → EB Garamond + IM Fell English SC + Caveat + JetBrains Mono) | ✅ |
| UI-104 — Audit + enforce emoji discipline (CI guard) | ✅ |
| DOC-101 — This README | ✅ |

## Migration plan for components still on legacy tokens

Legacy CSS tokens still in use across `apps/web/src/styles.css`:

- `--surface-base/elevated/floating/input/overlay` — bound to Tide-Stained backgrounds via aliases
- `--text-primary/secondary/tertiary/disabled/inverse` — bound to Tide-Stained foregrounds
- `--border-subtle/default/strong/gold/crimson` — bound to Tide-Stained borders
- `--font-grimoire` — aliased to `--font-body` (EB Garamond)
- `--text-base/sm/lg` etc. — preserved at original sizes; aligns roughly with Tide-Stained scale
- `--shadow-glow-teal/gold/crimson` — bound to verdigris/lantern/drowned-red washes
- `--ember-*`, `--sigil-*`, `--bone-*`, `--ink-*`, `--whisper-fg` — Phase 6 Grimoire tokens aliased

Component migration happens in Phase 20 (Wireframes → apps/web surfaces) when each surface is rebuilt against the wireframes/promoted/ designs. Until then, legacy tokens resolve through the alias layer.
