# A11Y Checklist — Phase 20+21 Surfaces

> **Phase 22 / Wave L deliverable.** This is the per-surface activation
> checklist for Claude Code. Phase 22 ships the foundations
> (`packages/ui-system/a11y/`); this doc walks through applying them to
> each Phase 20 surface + the Phase 21 Lean Mode badge.
>
> **MVP scope:** keyboard + contrast + reduced-motion. ARIA labels,
> screen reader announcements, semantic HTML audit deferred to Phase 23.

## Setup (one-time)

In your `apps/web` entry CSS:

```css
@import "@first-perception/ui-system/a11y/reduced-motion.css";
@import "@first-perception/ui-system/a11y/focus-visible.css";
```

In your `apps/web` entry TypeScript:

```typescript
import gsap from "gsap";
import { installSkipLink, registerGsap } from "@first-perception/ui-system/a11y";

registerGsap(gsap);
installSkipLink({ targetId: "main", label: "Skip to main content" });
```

Confirm the `<main id="main" tabindex="-1">` element exists.

## Per-surface application

### UI-401 — Specimen Jar portrait

- [ ] No interactive elements unless detail-on-click is added. If added: `<button>` with `aria-label` describing what opens.
- [ ] If SVG layers are clickable (Race/Class/Alignment etc.), each `<g>` clickable layer wraps in `<button>` for keyboard activation.
- [ ] Confirm portrait recomposes don't trigger CSS `transform: scale()` (animation-disabled per reduced-motion CSS).

### UI-402 — World Pulse ticker

- [ ] Ticker container: `role="log"` + `aria-live="polite"` (queue updates announced for SR users — Phase 23 work, mark TODO).
- [ ] Ticker item drift animation: respect reduced-motion. Use `motion.respect()`:
  ```typescript
  motion.respect({
    reduced: () => { /* snap items into place, no scroll */ },
    motion:   () => { gsap.to(item, { x: targetX, duration: 0.3, ease: "power1.inOut" }); },
  });
  ```
- [ ] Hover-to-pause works via keyboard too: Tab to focus → arrow keys nudge selected item → Enter shows detail.
- [ ] Items removable on Escape if a detail panel is open.

### UI-403 — Notice Ladder UI (Notice 7-10)

- [ ] Each notice stage is a focusable element (`tabindex="0"`).
- [ ] Convergence-to-x12 transition (Notice 10 + Authority ≥ 9) presents as a modal:
  - Use `trapFocus(modalElement)` from `@first-perception/ui-system/a11y`
  - Use `onEscape()` to allow back-out (if back-out is in-game-allowed — Notice 10 may be a one-way door; if so, Escape just dismisses any non-canonical overlay)
  - Restore focus to caller on close
- [ ] Critical: never block keyboard users from progressing the slice. Every state-change must be reachable by keyboard.

### UI-404 — Character Sheet v3 (5 tabs)

- [ ] Tab strip uses the `applyRovingTabindex` helper:
  ```typescript
  import { applyRovingTabindex } from "@first-perception/ui-system/a11y";
  const release = applyRovingTabindex(document.querySelector("[role='tablist']")!);
  // Listen for tab-activated to load tab content:
  tabStrip.addEventListener("tab-activated", (e) => loadTab(e.detail.index));
  ```
- [ ] DOM contract:
  ```html
  <div role="tablist" data-roving-tabindex>
    <button role="tab" aria-selected="true"  aria-controls="panel-stats">Stats</button>
    <button role="tab" aria-selected="false" aria-controls="panel-inv">Inventory</button>
    <button role="tab" aria-selected="false" aria-controls="panel-spells">Spells</button>
    <button role="tab" aria-selected="false" aria-controls="panel-cond">Conditions</button>
    <button role="tab" aria-selected="false" aria-controls="panel-path">Path Ledger</button>
  </div>
  <div role="tabpanel" id="panel-stats">...</div>
  ```
- [ ] Each tabpanel: `tabindex="0"` so keyboard users can scroll the panel content.
- [ ] Inventory item cards: each item is a `<button>` (Enter/Space activates), not a `<div>`.

### UI-405 — Form-of-Ending postcard

- [ ] Postcard appears in a modal-like overlay. Apply `trapFocus()` + `onEscape()`.
- [ ] Initial focus to the first focusable inside the postcard (typically the close/export button).
- [ ] Export button: `<button>` with `aria-label="Export postcard as image"`.
- [ ] On close: restore focus to whatever opened the postcard (Notice 10 → x12 trigger).

### Phase 21 — Lean Mode badge (already patched in this phase)

- [ ] **Already updated** in this phase: color changed from off-palette `brass-mid` (3.99:1 fail) to canonical `saltline` (6.18:1 AA pass). See `apps/web/src/components/LeanModeBadge.ts`.
- [ ] No animation (already disciplined).
- [ ] Tooltip via `title` attribute (browsers expose to SR users via aria-describedby fallback). Phase 23 will upgrade to actual aria-describedby pattern.

## Contrast findings (per audit; full report at `scripts/contrast_audit_report.json`)

**Critical pairs for Phase 20 surfaces — pass/fail status:**

| Use | Pair | Contrast | Band |
|---|---|---|---|
| Default body text | tide-ink on vellum | 12.42 | AAA ✓ |
| Card body text | tide-ink on salt-bleach | 14.38 | AAA ✓ |
| Scene container body text | vellum on drowned-ink | 14.15 | AAA ✓ |
| Secondary labels | saltline on vellum | 5.34 | AA ✓ |
| Tertiary numbering | brass-dim on vellum | 3.45 | **AA-large only** (≥18pt or ≥14pt bold) |
| Instrument readouts on scene | brass on drowned-ink | 6.97 | AA ✓ |
| Visible roll on scene | lantern on drowned-ink | 10.23 | AAA ✓ |
| Success state | verdigris on vellum | 3.66 | **AA-large only** |
| Lethal/danger | drowned-red on vellum | 6.30 | AA ✓ |
| Lean-mode badge | saltline on salt-bleach (FIXED) | 6.18 | AA ✓ |

**Usage rules from audit:**
- **brass-dim on vellum** (tertiary numbering) — keep, but only at 18pt+ font-size OR 14pt+ bold. If a smaller-size usage exists, upgrade to `saltline`.
- **verdigris on vellum** (success) — keep for UI components (borders, badges, icons ≥3:1 OK). For success TEXT, use `tide-ink` body + a verdigris icon/border accent.
- **bone on vellum** (1.38:1) — explicitly low-contrast. Use ONLY for dividers and disabled state, never for active text.

## Keyboard reachability acceptance criteria

A keyboard user should be able to:

1. Tab from page load → reach the skip link → activate it → land in `<main>`.
2. Tab through Character Sheet tabs (one Tab to enter the strip, arrow keys to move between tabs).
3. Tab into the World Pulse ticker; arrow keys to move between items; Enter to open detail; Escape to close.
4. Trigger Notice 10 convergence via keyboard alone (no mouse-only path to apotheosis).
5. Complete a Form-of-Ending postcard export with keyboard alone.
6. Escape exits any modal-like overlay (except Notice 10 → x12 which is the one-way canonical sequence; document this explicitly).

## Test plan

Run `npm --prefix packages/ui-system test` — confirms the keyboard helpers work in jsdom.

Manual smoke test on apps/web:
1. Unplug mouse. Reach every Phase 20 surface using only the keyboard.
2. In OS settings, enable "Reduce motion" (Mac: Settings → Accessibility → Display → Reduce motion; Windows: Settings → Accessibility → Visual effects → Animation effects off). Reload apps/web. Confirm:
   - Ticker doesn't scroll; items snap into place.
   - No transforms / scales / rotations fire.
   - Short fades (≤150ms opacity-only) still work.
3. Check focus indicator visible on every interactive element when navigating by Tab.

## Phase 23 follow-up (deferred ARIA + screen reader work)

When Phase 23 opens, ENG-308 + this scope land together:

- ARIA labels on every interactive element
- `aria-live` regions for narration updates (text changes announced)
- Semantic HTML audit (button vs div, heading hierarchy, landmark roles)
- R-151 companion screen reader scoping (per Sec L watch item — companion interjections in narration)
- jest-axe wire-up + CI gate

Ticket: **ENG-309 — Full ARIA + screen reader pass** (~1 sprint, lands with ENG-308 in Phase 23).
