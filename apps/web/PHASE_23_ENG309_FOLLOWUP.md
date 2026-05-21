# Phase 23 ENG-309 — Full ARIA + Screen Reader Pass

> **Status:** SCOPED 2026-05-20 during Phase 22 (deferred scope). Lands with
> ENG-308 (Stage 6 false-positive refinement) in Phase 23 / Slice integration.
> Estimated: 1 sprint.

## What Phase 22 deliberately did NOT do

Phase 22 (Wave L) shipped MVP a11y: keyboard navigation + color contrast + reduced-motion. The following were deliberately scoped out per Khoja's call:

- **ARIA labels + roles** on every interactive element
- **Screen reader announcements** when narration changes (aria-live regions)
- **Semantic HTML audit** (button vs div, heading hierarchy, landmark roles)
- **R-151 companion interjection screen reader scoping** (per Sec L liveness watch item)
- **jest-axe wire-up + CI gate** (automated WCAG audit)
- **AAA-tier work** where achievable

## Why deferred

Phase 22 MVP scope is the irreducible foundation: keyboard + contrast + reduced-motion. Without those, ARIA labels are decoration on a broken substrate. With them, ARIA layered on later is straightforward additive work — much of it can be co-authored during Phase 23 slice integration without re-architecting components.

## ENG-309 scope detail

### Surfaces to ARIA-label (Phase 20 + Phase 21)

| Surface | ARIA work |
|---|---|
| Specimen Jar portrait | `aria-label` on portrait element describing character state ("Khojen, L2 Warlock, Day 14, Authority 3, attuned to Bell-Marked Charm"); layer-specific labels if interactive |
| World Pulse ticker | `role="log"` + `aria-live="polite"` + `aria-atomic="false"`; each ticker item `aria-label` with event description |
| Notice Ladder | Each stage `aria-label` with stage number + faction context; Convergence modal `role="dialog"` + `aria-labelledby` + `aria-describedby` |
| Character Sheet tabs | Already DOM-correct from Phase 22; add `aria-controls` linking each tab to its panel; each panel `aria-labelledby` back to its tab |
| Form-of-Ending postcard | `role="dialog"` + `aria-modal="true"`; postcard text container `aria-live="polite"` so SR announces the ending narration; export button `aria-label="Export postcard as image"` |
| Lean Mode badge | Already has `aria-label="Lean mode active"`; upgrade `title` tooltip to `aria-describedby` pointing to a hidden `<span>` with the tooltip text |
| Roll resolution UI | `aria-live="assertive"` for the visible D20 result; `aria-label` describing roll context |
| Inventory item cards | `aria-label` summarizing item (name, rarity, attunement, charges); `aria-pressed` for selection state |

### Narration update announcements

Game state transitions that should announce to SR users:
- Scene change ("you have arrived at the Drowned Cathedral antechamber")
- Notice tick (no announce on quiet ticks; announce at threshold crossings 7/8/9/10)
- Faction stance change ("the Bell Court now regards you with hostility")
- Authority/Ruin/Creation increment (subtle: brief announcement; don't spam)
- Companion interjection (per R-151 scoping below)
- Form-of-Ending arrival (full announce)

Pattern: a single `<div id="game-announcements" aria-live="polite" aria-atomic="true">` updated by the state manager when these transitions fire. Avoid `aria-live="assertive"` except for roll resolution and lethal events.

### R-151 companion interjection scoping (from Sec L liveness)

Per `project_sec_l_liveness.md`, R-151 flagged: when a party companion speaks (interjects in narration), screen reader users need clear attribution. Easy to confuse two speakers in audio.

Scoping decisions for ENG-309:
- Each companion utterance wrapped in `<span class="dialog-line" data-speaker="Brother Hask">"..."</span>`
- aria-live region prefixes the speaker before the line: "Brother Hask says: '...'"
- For Narrator vs companion: Narrator gets no speaker prefix (default voice); companions get explicit attribution
- Multiple-companion turns: announce each speaker change explicitly

### Semantic HTML audit

Walk through Phase 20 + Phase 21 components and verify:
- Every clickable element is a `<button>` or `<a>` — no clickable `<div>`s
- Heading hierarchy is correct (h1 → h2 → h3, no skips)
- Landmark roles in place: `<main>`, `<nav>`, `<aside>`, `<header>`, `<footer>` where appropriate
- Form inputs all have associated `<label>` elements
- Required form fields use `aria-required="true"`
- Error states use `aria-invalid="true"` + `aria-errormessage`

### jest-axe wire-up

```bash
npm install --save-dev jest-axe @types/jest-axe
```

Add a test pattern:

```typescript
import { axe } from "jest-axe";
import { render } from "@testing-library/dom";

it("Character Sheet has no axe-detectable violations", async () => {
  const { container } = render(characterSheetHTML);
  const results = await axe(container);
  expect(results).toHaveNoViolations();
});
```

CI gate: `npm run test:a11y` runs the axe suite; fails the build on any violation.

## Estimated effort breakdown

- ARIA labels across 6 surfaces: ~1 day
- aria-live announcement integration with state manager: ~1 day
- R-151 companion attribution scoping: ~0.5 day
- Semantic HTML audit + fixes: ~1 day
- jest-axe wire-up + CI gate: ~0.5 day
- Manual SR testing (NVDA on Windows, VoiceOver on Mac): ~1 day
- Documentation update + per-surface checklist refresh: ~0.5 day

Total: ~5.5 days (1 sprint of focused work).

## Acceptance criteria

1. Every interactive element on Phase 20 + Phase 21 surfaces is reachable, labeled, and operable via screen reader.
2. Narration changes (scene, notice, faction, companion, ending) announce correctly.
3. jest-axe finds zero violations in the standard CI suite.
4. Manual SR pass: complete one playthrough from character creation to Notice 10 convergence using ONLY a screen reader (no visual UI use).
5. R-151 closed: companion interjections never confuse the SR user about who is speaking.

## Cross-references

- [[project-reconciliation-state]] — Phase 23 status
- [[project-push-resolutions]] — ENG-308 Stage 6 false-positive refinement (lands in same phase)
- `repo_mirror/phase_22/README.md` — Phase 22 MVP scope this picks up from
- `apps/web/A11Y-CHECKLIST.md` — Per-surface activation checklist (Phase 22)
