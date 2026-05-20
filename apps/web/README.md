# apps/web — The First Perception (browser app)

Vite + vanilla TypeScript app. The browser-facing entry point for The First Perception. Consumes the workspace packages (`@first-perception/types`, `engine`, `narrative`, `persistence`, `llm-client`, `audio`, `ui-system`).

## Brand source

Tokens, motifs, fonts, and voice discipline live in [`@first-perception/ui-system`](../../packages/ui-system/README.md), which mirrors the **design layer** (the local `My video Game/design_system/` folder + brand bible). This app must not introduce new design tokens, icon fonts, or non-Tide-Stained glyphs.

The CI `audit:glyphs` step (in `.github/workflows/ci.yml`) fails the build if any non-allowed pictographic glyph appears in this folder. Allowed: `◆ ❦ ↻ → ·` plus general typographic chrome.

## Run locally

```bash
npm install
npm run dev              # Vite dev server (no /api/* — pair with `vercel dev` for full stack)
```

For full local stack (saves, world events, LLM proxy):

```bash
npm install -g vercel
vercel dev               # Vite + serverless functions on one port (default 3000)
```

Add `?demo=1` to skip character creation and load a playable starter.

## Build

```bash
npm run build            # production bundle, fails on bundle-budget violations
```

Bundle target: see `scripts/check-bundle-budget.mjs` thresholds.

## Test

```bash
npm test                 # Vitest unit + integration specs (40 in apps/web alone)
npm run smoke            # Playwright e2e — golden-path turn-loop smoke
```

## Design discipline (binding)

When authoring or modifying UI in this folder:

1. **Consume tokens from `@first-perception/ui-system`.** Do not introduce new CSS variables for colors, fonts, spacing, radii, or motion timings.
2. **No icon font, no emoji.** Use motifs from `packages/ui-system/src/motifs.ts`. Allowed text glyphs only: `◆ ❦ ↻ → ·`.
3. **No bounce/spring/elastic motion.** Use `--ease-paper` and the `--dur-*` durations.
4. **Voice constraints** (per `design_system/README.md` brand bible): no tragedy-as-relief, no celebration, no therapy-coded introspection, no modern slang, no meme humor, field-journal density.
5. **Wireframes are canonical for layout.** When implementing a new screen, the source-of-truth is `wireframes/promoted/<SURFACE>.html` in the design layer. Do not invent layouts.

## Reconciliation context

This repo and the local design folder are two parallel tracks of The First Perception (see [docs/RECONCILIATION_AUDIT.md](../../docs/RECONCILIATION_AUDIT.md) — if mirrored). The repo holds engineering + runtime; the design layer holds canonical brand + content. The Engineering Plan (`docs/ENGINEERING_PLAN.md`) sequences the port from one to the other.
