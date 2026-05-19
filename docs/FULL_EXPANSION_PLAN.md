# The First Perception — Full Expansion Plan
## Studio-Grade Text RPG · Hosted on Kimi · Ink Narrative Engine

**Version:** 2.0  
**Date:** 2026-05-19  
**Status:** Planning Phase — Ready for Batched Execution  
**Permissions:** YOLO (full autonomous execution)  

---

## 1. Executive Vision

Transform the current functional prototype into a **studio-grade, fully playable text-based living-world RPG** that feels like a commercial indie release. The experience should evoke the atmospheric density of *Sunless Sea*, the narrative depth of *80 Days*, and the systemic living-world simulation of *Dwarf Fortress* — all delivered through a browser on Kimi.

### Core Pillars

| Pillar | Description |
|--------|-------------|
| **Atmosphere** | Every pixel, sound, and word reinforces cosmic dread and fragile hope. |
| **Agency** | Player choices cascade through factions, NPCs, and world state meaningfully. |
| **Replayability** | Legacy system, seeded worlds, and branching scenarios ensure no two runs feel identical. |
| **Accessibility** | Fully playable with keyboard, screen reader, touch, or mouse. Reduced-motion mode included. |
| **Performance** | <2s first paint on 3G. 60fps animations. <50MB total bundle. |

---

## 2. Technology Architecture Decisions

### 2.1 Platform: Web-First (Not Godot — Here's Why)

After evaluating Godot 4.x Web export against our requirements:

| Factor | Godot Web Export | Enhanced Web Stack |
|--------|------------------|-------------------|
| Bundle Size | 15-30MB WASM + JS | <5MB total |
| Text Rendering | Subpixel issues on mobile | Native, perfect |
| Load Time | 5-10s on 3G | <2s on 3G |
| Ink Integration | Requires C# port or FFI | Native inkjs |
| Mobile Performance | Battery-heavy | Efficient Canvas/CSS |
| Kimi Hosting | Complex WASM headers | Standard static deploy |
| Build Pipeline | Complex export + glue | Vite native |

**Decision:** Stay web-first. Use **HTML5 Canvas + WebGL** for atmospheric effects (particles, fog, distortion), **CSS Houdini** for advanced styling, and **Web Audio API** for generative soundscapes. Godot remains a future option for a 3D spin-off but is overkill for a text RPG.

### 2.2 Narrative Engine: Ink by Inkle

**Ink** is the industry-standard narrative scripting language used in *80 Days*, *Sorcery!*, *Heaven's Vault*, and *Pentiment*.

**Integration Architecture:**
```
content/narrative/
├── main.ink              # Main story knot
├── scenes/
│   ├── arrival.ink
│   ├── fountain.ink
│   ├── combat.ink
│   └── dialogue.ink
├── systems/
│   ├── faction_reactions.ink
│   ├── consequence_triggers.ink
│   └── legacy.ink
└── _compiled/
    └── narrative.json    # Compiled by inklecate → consumed by inkjs
```

**Runtime:** `inkjs` (npm) loads the compiled JSON and exposes a JavaScript API. Our game engine pushes state variables into Ink (player stats, world state) and pulls narrative text + choices back out.

### 2.3 Tech Stack (Final)

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Bundler | Vite 6.x | Fast HMR, optimized builds |
| Language | TypeScript 5.x | Type safety across all packages |
| Renderer | HTML5 Canvas 2D + WebGL (Three.js lite) | Map, particles, atmospheric effects |
| UI Framework | Vanilla TS + Web Components | Zero framework overhead, full control |
| State | Custom reactive store (proxy-based) | Game state, UI state, sync |
| Narrative | inkjs + Inklecate | Branching narrative runtime |
| Audio | Web Audio API + Tone.js | Generative ambient + SFX |
| Animations | GSAP + CSS animations | Timeline control, reduced-motion support |
| Styling | CSS Custom Properties + PostCSS | Design tokens, dark/light themes |
| Persistence | localStorage + IndexedDB | Save slots, settings, content cache |
| Testing | Vitest (unit) + Playwright (E2E) | Full coverage |
| Deployment | Kimi Static Hosting | `kimi deploy` or manual upload |

### 2.4 Monorepo Restructure

```
the-first-perception/
├── apps/
│   └── web/                    # Main game SPA (Vite)
├── packages/
│   ├── engine/                 # Core game logic (from backend/)
│   ├── narrative/              # Ink compilation + inkjs wrapper
│   ├── ui-system/              # Design tokens, components, animations
│   ├── audio/                  # Web Audio generative system
│   └── types/                  # Shared TypeScript definitions
├── content/
│   ├── narrative/              # .ink source files
│   ├── world-data/             # JSON world definitions
│   ├── scenarios/              # Starting scenario configs
│   └── audio-presets/          # Generative audio parameters
├── database/
│   └── schema.sql              # SQLite (analytics/export future)
├── scripts/
│   ├── build-content.mjs       # Compile Ink, validate world data
│   ├── build-assets.mjs        # Optimize images, audio sprites
│   └── deploy.mjs              # Kimi deployment script
├── docs/
│   ├── FULL_EXPANSION_PLAN.md  # This file
│   ├── DESIGN_SYSTEM.md        # Visual design specification
│   └── CONTENT_GUIDELINES.md   # Writing style guide
└── package.json                # Workspace root
```

---

## 3. Studio-Grade Design System

### 3.1 Visual Identity

**Aesthetic:** "Cosmic Horror meets Artisan Typography"

- **Primary Palette:** Deep void blacks, bioluminescent teals, aged golds
- **Typography:** 
  - Display: Cinzel (serif, ancient authority)
  - Body: Inter (clean, readable)
  - Mono: JetBrains Mono (dice rolls, technical readouts)
- **Texture:** Subtle film grain overlay, paper-like surface on cards
- **Motion:** Slow, deliberate. Everything breathes. No snap transitions.

### 3.2 Design Tokens (CSS Custom Properties)

```css
:root {
  /* Color Primitives */
  --void-900: #05060a;
  --void-800: #090a10;
  --void-700: #0e1018;
  --void-600: #141820;
  
  --biolumen-500: #66e0c2;
  --biolumen-400: #8ce8d0;
  --biolumen-300: #b2f0de;
  
  --aged-gold-500: #f5d982;
  --aged-gold-400: #f7e09c;
  
  --crimson-500: #ff6b6b;
  --twilight-500: #9fb7ff;
  --moss-500: #7dd87d;
  
  /* Semantic */
  --surface-base: var(--void-800);
  --surface-elevated: var(--void-700);
  --surface-floating: var(--void-600);
  --text-primary: #f3efe2;
  --text-secondary: #a9adad;
  --text-tertiary: #6b6f7a;
  
  /* Spacing Scale (8px base) */
  --space-1: 0.25rem;   /* 4px */
  --space-2: 0.5rem;    /* 8px */
  --space-3: 0.75rem;   /* 12px */
  --space-4: 1rem;      /* 16px */
  --space-6: 1.5rem;    /* 24px */
  --space-8: 2rem;      /* 32px */
  --space-12: 3rem;     /* 48px */
  
  /* Animation */
  --ease-dramatic: cubic-bezier(0.87, 0, 0.13, 1);
  --ease-smooth: cubic-bezier(0.4, 0, 0.2, 1);
  --duration-instant: 100ms;
  --duration-fast: 200ms;
  --duration-normal: 400ms;
  --duration-slow: 800ms;
  --duration-dramatic: 1200ms;
  
  /* Shadows */
  --shadow-sm: 0 2px 8px rgba(0,0,0,0.3);
  --shadow-md: 0 8px 32px rgba(0,0,0,0.4);
  --shadow-lg: 0 24px 80px rgba(0,0,0,0.5);
  --shadow-glow-teal: 0 0 40px rgba(102,224,194,0.15);
  --shadow-glow-gold: 0 0 40px rgba(245,217,130,0.15);
}
```

### 3.3 Screen Architecture

#### Title Screen (Cinematic)
- Full-viewport Canvas background with generative particle system (ash, motes, distant lights)
- Centered typographic lockup with slow parallax
- Menu items appear with staggered fade-up on load
- Ambient generative audio layer (drones, distant bells)

#### Character Creation (Ritual)
- Step transitions use page-turn / dissolve effects
- Each step has unique atmospheric background
- Live preview of character summary updates as choices are made
- Final "Embark" sequence is a cinematic transition

#### Gameplay (Immersive Dashboard)

**Mobile Layout (< 768px):**
```
┌─────────────────────────────┐
│ [Status Strip - sticky]     │
├─────────────────────────────┤
│                             │
│   [Primary Viewport]        │
│   - Tale (default)          │
│   - World Map               │
│   - Fate Records            │
│                             │
├─────────────────────────────┤
│ [Quick Actions]             │
├─────────────────────────────┤
│ [Command Input - sticky]    │
├─────────────────────────────┤
│ [Bottom Nav - tabs]         │
└─────────────────────────────┘
```

**Desktop Layout (≥ 1200px):**
```
┌──────────┬─────────────────┬──────────┐
│          │                 │          │
│  LEFT    │    CENTER       │  RIGHT   │
│  RAIL    │    STAGE        │  RAIL    │
│          │                 │          │
│ • World  │  • Narrative    │ • Status │
│ • Map    │    (tale)       │ • Journal│
│ • Factions│ • Command      │ • Codex  │
│ • NPCs   │    input        │ • Fate   │
│          │                 │          │
│ (collapsible)              │ (collapsible)
└──────────┴─────────────────┴──────────┘
```

### 3.4 Animation System

**Principles:**
1. **Everything enters with purpose** — no elements just "appear"
2. **The world breathes** — ambient motion on all decorative elements
3. **Text has weight** — typewriter/scramble effects for narrative, instant for UI
4. **Consequences are felt** — screen shake, color desaturation, pulse on damage
5. **Reduced motion is fully equivalent** — all info conveyed without animation

**Effects Library:**
- `TypewriterText` — Character-by-character reveal with cursor
- `ScrambleText` — Glitch decode effect for cosmic/horror moments
- `ParticleField` — Canvas-based ambient particles (ash, fog, motes)
- `PulseGlow` — CSS keyframe for important state changes
- `ScreenShake` — Canvas transform for combat/consequence moments
- `Vignette` — Dynamic edge-darkening based on danger level
- `FilmGrain` — Subtle noise overlay (CSS)

---

## 4. Game Engine Expansion

### 4.1 Action Reducers (Full Implementation)

Every player action flows through a typed reducer pipeline:

```typescript
interface ActionResult {
  patches: StatePatch[];        // What changed
  rolls: RollResult[];          // Dice outcomes
  narrative: NarrativeEvent[];  // Text to display
  consequences: Consequence[];  // Delayed effects
  soundCue?: SoundCue;          // Audio trigger
  animation?: AnimationCue;     // Visual effect
}
```

**Reducer Inventory:**

| Reducer | Actions | Key Mechanics |
|---------|---------|---------------|
| `moveReducer` | go, approach, flee, sneak | Location graph, exit visibility, travel risk, stealth checks |
| `combatReducer` | attack, defend, riposte, surrender | Initiative, damage calculation, wound system, morale |
| `restReducer` | rest, sleep, recover | Condition healing, danger vulnerability, dream events |
| `itemReducer` | use, equip, consume, inspect, drop, trade | Durability, charges, item-triggered scenes |
| `dialogueReducer` | speak, ask, bargain, threaten, lie | Topic discovery, relationship thresholds, secret extraction |
| `investigationReducer` | look, examine, read, listen, search | Clue discovery, DC scaling with time spent |
| `conditionReducer` | (passive) | Tick durations, stack management, trigger evaluation |
| `deathReducer` | (passive) | Death vector tracking, epitaph generation, legacy seeding |

### 4.2 Consequence System (Overhaul)

**Current Issues:** Clones mutate instead of stored state, `Math.random()` used, triggers unreliable.

**New Architecture:**
```typescript
interface Consequence {
  id: string;
  type: 'damage' | 'condition' | 'faction_shift' | 'world_event' | 'death_check';
  trigger: Trigger;
  effects: Effect[];
  source: { turn: number; action: string };
}

type Trigger = 
  | { kind: 'immediate' }
  | { kind: 'turns_remaining'; count: number }
  | { kind: 'condition'; conditionId: string }
  | { kind: 'location'; locationId: string }
  | { kind: 'action'; actionType: string }
  | { kind: 'random'; chance: number; seedOffset: number }; // Seeded!
```

**Scheduler:** Runs every turn after action reducers. Deterministic (seeded RNG). Priority queue for ordering.

### 4.3 Location Graph System

```typescript
interface LocationNode {
  id: string;
  name: string;
  description: string;
  regionId: string;
  exits: Exit[];
  pointsOfInterest: POI[];
  dangerBase: number;
  discovered: boolean;
  investigated: boolean;
}

interface Exit {
  toLocationId: string;
  visible: boolean;
  locked?: { keyItemId?: string; skillCheck?: SkillCheck };
  hiddenDescription?: string;
  travelRisk: number; // 0-100
}
```

### 4.4 Legacy System

When a character dies, the world persists:

```typescript
interface Legacy {
  deadCharacter: {
    name: string;
    epitaph: string;
    deathVector: string;
    turnsSurvived: number;
  };
  worldChanges: {
    factions: FactionState[];      // Evolved
    rumors: Rumor[];               // Propagated
    locations: LocationMutation[]; // Altered
  };
  inheritance: {
    item?: string;
    curse?: string;
    reputation?: Reputation;
    alteredFactions?: string[];
  };
}
```

Next character starts in the **same world** with inherited state.

---

## 5. Ink Narrative Integration

### 5.1 Architecture

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  Game Engine    │────▶│  Ink Bridge  │────▶│  inkjs Runtime  │
│  (TypeScript)   │◀────│  (TS Wrapper)│◀────│  (narrative.js) │
└─────────────────┘     └──────────────┘     └─────────────────┘
```

**Engine → Ink:** Push game state variables before each narrative query  
**Ink → Engine:** Pull text, choices, tags, and external function calls

### 5.2 State Binding

```ink
// In Ink, game state is accessed via external functions
EXTERNAL get_player_stat(statName)
EXTERNAL get_world_danger()
EXTERNAL get_faction_trust(factionId)
EXTERNAL has_condition(conditionId)
EXTERNAL get_turn_count()

// Example conditional narrative
{ get_player_stat("sense") >= 3:
    The street reveals a second layer: footprints that walk backward.
- else:
    The street is empty. You feel like you missed something.
}
```

### 5.3 Content Structure

**Knot Hierarchy:**
- `arrival` — First scene, branches by character creation choices
- `fountain` — The Sunken Fountain location hub
- `archive` — The Luminous Archive location hub
- `market` — Greywake Market location hub
- `combat` — Combat encounter templates
- `dialogue_{npc_id}` — Per-NPC dialogue trees
- `dream` — Rest/sleep encounter events
- `consequence_{id}` — Triggered consequence narratives
- `death_{vector}` — Death scene by vector
- `legacy` — Legacy transition narrative

### 5.4 Choice Architecture

Ink choices are pre-processed by the engine:

1. Engine queries Ink for available choices at current knot
2. Engine filters based on game state (skill checks, inventory, conditions)
3. Engine enriches with mechanical hints ("[Requires: Sense 3+]", "[Risk: High]")
4. Engine presents as suggested actions + freeform command input
5. Player choice is mapped back to Ink choice index OR freeform is parsed

---

## 6. Audio System (Generative)

### 6.1 Philosophy
No pre-rendered music loops. Everything is generative and responsive to game state.

### 6.2 Layers

| Layer | Trigger | Method |
|-------|---------|--------|
| **Ambient Drone** | Always playing | Tone.js FM synthesis, slow LFO |
| **Location Tone** | On location change | Scale shift based on location danger |
| **Weather Texture** | Based on weather | Noise + filtered oscillators |
| **Pulse Alert** | World pulse events | Short bell/chime sequences |
| **Combat Sting** | Combat initiated | Percussive synthesis, distortion |
| **Narrative Accent** | Key story beats | Chord stabs, string-like pads |
| **UI Feedback** | Button presses, rolls | Short blips (subtle) |

### 6.3 Danger-Driven Harmony

```typescript
function getLocationScale(danger: number): string[] {
  if (danger < 20) return ['C3', 'E3', 'G3', 'B3']; // Major 7 - safety
  if (danger < 50) return ['C3', 'Eb3', 'G3', 'Bb3']; // Minor 7 - tension
  if (danger < 80) return ['C3', 'Eb3', 'Gb3', 'A3']; // Diminished - dread
  return ['C2', 'C3', 'F#3', 'C4']; // Tritone cluster - horror
}
```

---

## 7. Content Pipeline

### 7.1 Build Process

```bash
# 1. Compile Ink narratives
npm run content:compile
# → Runs inklecate on all .ink files → outputs JSON to content/_compiled/

# 2. Validate world data
npm run content:validate
# → Checks JSON schemas, verifies all referenced IDs exist

# 3. Build audio sprites
npm run content:audio
# → Generates Web Audio parameter presets

# 4. Bundle everything
npm run build
# → Vite bundles app + compiled content + assets
```

### 7.2 Scenario System

Three complete starting scenarios, each with:
- Unique opening location and crisis
- Custom NPC set
- Scenario-specific faction tensions
- Unique narrative beats in Ink

| Scenario | Opening Crisis | Theme |
|----------|---------------|-------|
| **The Drowning Verdict** | A debt court judges by stolen memories | Justice, identity, debt |
| **The Bell That Rings Backwards** | Archive bells ring for the living | Time, knowledge, warning |
| **The Salt-Touched Pilgrimage** | Silent children walk toward the breach | Innocence, sacrifice, faith |

---

## 8. Feature Expansion Phases

### Phase 1: Foundation & Architecture (Week 1)
- [ ] Restructure monorepo per new layout
- [ ] Set up packages: engine, narrative, ui-system, audio, types
- [ ] Implement design token system in CSS
- [ ] Create base Web Components (Button, Card, Panel, Meter)
- [ ] Set up Ink compilation pipeline (inklecate + inkjs)
- [ ] Implement reactive state store
- [ ] Set up generative audio skeleton with Tone.js

### Phase 2: Engine Core (Week 2)
- [ ] Implement all action reducers with typed patches
- [ ] Rewrite consequence scheduler (deterministic, seeded)
- [ ] Build location graph system with exits/locks
- [ ] Implement combat system (initiative, damage, wounds)
- [ ] Build condition/meter system with stacking
- [ ] Add death handling + legacy pipeline
- [ ] Full deterministic replay harness

### Phase 3: Narrative Integration (Week 3)
- [ ] Build Ink bridge (engine ↔ inkjs)
- [ ] Write main.ink with core knots
- [ ] Implement scene system (arrival, fountain, archive, market)
- [ ] Write dialogue trees for all NPCs
- [ ] Build choice filtering/enrichment system
- [ ] Add consequence narrative triggers
- [ ] Write death scenes for all vectors

### Phase 4: UI/UX Overhaul (Week 4)
- [ ] Title screen with particle Canvas background
- [ ] Character creation with cinematic transitions
- [ ] Mobile-first gameplay layout (tabs/bottom sheets)
- [ ] Desktop three-rail layout
- [ ] Tale panel with TypewriterText effect
- [ ] Fate panel with roll visualization
- [ ] World map with interactive Canvas
- [ ] Codex system for discovered lore
- [ ] Settings modal (accessibility, audio, motion)

### Phase 5: Atmosphere & Polish (Week 5)
- [ ] Particle systems (ash, fog, bioluminescence)
- [ ] Dynamic vignette based on danger
- [ ] Film grain overlay
- [ ] Screen shake for combat/consequences
- [ ] Full audio layer integration
- [ ] Reduced-motion equivalent for all effects
- [ ] Loading states with atmospheric hints
- [ ] Save slot system with preview cards

### Phase 6: Content & Scenarios (Week 6)
- [ ] Scenario 1: The Drowning Verdict (complete)
- [ ] Scenario 2: The Bell That Rings Backwards (complete)
- [ ] Scenario 3: The Salt-Touched Pilgrimage (complete)
- [ ] Faction arc system (plans, timers, responses)
- [ ] NPC relationship depth (secrets, lies, loyalty)
- [ ] Item library (30+ items with unique effects)
- [ ] Condition library (20+ conditions)
- [ ] World event system (random/seeded)

### Phase 7: Testing & Deployment (Week 7)
- [ ] Unit tests: all reducers, dice, consequences, death
- [ ] Integration: full scenario playthroughs
- [ ] Playwright: mobile (390×844), tablet (768×1024), desktop (1440×900)
- [ ] Accessibility audit (axe-core)
- [ ] Performance audit (Lighthouse 95+)
- [ ] Bundle optimization (< 5MB initial, < 50MB total)
- [ ] Kimi deployment script + documentation
- [ ] Final bug bash (20+ person-hours of play)

---

## 9. Subagent Batching Strategy

Given YOLO permissions and the full tool suite, we parallelize across **6 specialized lanes**:

### Lane 1: Engine Architect
**Agent Type:** coder  
**Skills:** test-foundation, supabase-postgres-best-practices  
**Scope:** All backend engine work — reducers, state patches, consequence scheduler, deterministic replay, unit tests  
**Key Files:** `packages/engine/src/**/*.ts`  
**Deliverable:** Passing Vitest suite for all reducers and game mechanics

### Lane 2: Narrative Engineer
**Agent Type:** coder  
**Skills:** documentation-audit  
**Scope:** Ink narrative system, bridge implementation, content structure, scenario writing  
**Key Files:** `packages/narrative/**/*.ts`, `content/narrative/**/*.ink`  
**Deliverable:** 3 complete scenarios in Ink + working TS bridge

### Lane 3: UI/UX Implementer
**Agent Type:** coder  
**Skills:** frontend-patterns, frontend-reviewer  
**Scope:** All screen layouts, Web Components, animations, responsive design, accessibility  
**Key Files:** `packages/ui-system/**/*.ts`, `apps/web/src/**/*.ts`, `apps/web/src/**/*.css`  
**Deliverable:** Pixel-perfect responsive UI with all screens functional

### Lane 4: Audio/Visual Effects
**Agent Type:** coder  
**Skills:** frontend-patterns  
**Scope:** Canvas particle systems, WebGL effects, Web Audio generative system, animation library  
**Key Files:** `packages/audio/**/*.ts`, `apps/web/src/effects/**/*.ts`  
**Deliverable:** All atmospheric effects + audio layers working

### Lane 5: Content Designer
**Agent Type:** coder (with creative writing focus)  
**Skills:** documentation-audit  
**Scope:** World data JSON, scenario configs, item/condition libraries, NPC dialogue  
**Key Files:** `content/**/*.json`, `content/**/*.ink`  
**Deliverable:** Complete content database for all 3 scenarios

### Lane 6: QA & Integration
**Agent Type:** coder  
**Skills:** test-foundation, frontend-reviewer  
**Scope:** Playwright E2E tests, integration tests, performance audits, accessibility audit, final bug fixes  
**Key Files:** `apps/web/tests/**/*.spec.ts`, `packages/*/tests/**/*.spec.ts`  
**Deliverable:** Full test coverage, Lighthouse 95+, passing all E2E

### Orchestration Flow

```
Week 1: Lanes 1, 2, 3 start in parallel (foundation)
Week 2: Lanes 1, 2 continue; Lane 4 starts; daily sync on interfaces
Week 3: Lanes 2, 3, 4 peak; Lane 5 starts content production
Week 4: Lanes 3, 4 peak; Lane 1 integration testing
Week 5: Lanes 3, 4, 5 converge; first integration builds
Week 6: Lane 5 completes; all lanes focus on content integration
Week 7: Lane 6 takes over; all other lanes support bug fixes
```

---

## 10. Testing Matrix

### Unit Tests (Vitest)

| Module | Tests | Target |
|--------|-------|--------|
| DiceEngine | Distribution, bands, seed replay | 100% |
| Action Reducers | All 8 reducers, edge cases | 100% |
| StateEngine | Patches, diffs, undo, snapshots | 100% |
| Consequence Scheduler | Trigger types, countdown, priority | 100% |
| Death System | All vectors, legacy generation | 100% |
| Ink Bridge | Variable binding, choice flow | 100% |
| Audio Engine | Generative consistency, mute | 80% |

### Integration Tests (Vitest)

- Character creation → Gameplay transition
- Full turn cycle: input → roll → outcome → state update
- Save/load determinism (RNG state preserved)
- Consequence fires exactly on scheduled turn
- Death → Legacy → New character flow
- 10-turn golden scenario (seeded replay)

### E2E Tests (Playwright)

| Test | Viewports | Assertions |
|------|-----------|------------|
| Title → Creation → Gameplay | 390, 768, 1440 | No console errors, correct titles |
| Complete all 6 creation steps | 390, 768, 1440 | Valid game state, onboarding visible |
| Submit commands, verify tale | 390, 768, 1440 | Tale entries increase, fate recorded |
| Save/Load/Continue flow | 390, 1440 | localStorage state, button states |
| All tabs functional | 390, 768, 1440 | Content visible, no overflow |
| Canvas map renders | 390, 1440 | Non-empty pixel buffer |
| Accessibility tree | 1440 | No unnamed buttons, logical focus |
| Reduced motion | 1440 | Animations disabled, content accessible |
| Mobile overflow check | 390 | No horizontal scroll |
| 30-minute play session | 1440 | No memory leaks, stable FPS |

---

## 11. Deployment on Kimi

### 11.1 Build Output

```bash
npm run build
# Produces:
# apps/web/dist/
#   ├── index.html
#   ├── assets/
#   │   ├── index-[hash].js        # Main bundle
#   │   ├── vendor-[hash].js       # inkjs, Tone.js, GSAP
#   │   ├── narrative-[hash].json  # Compiled Ink
#   │   ├── world-data-[hash].json # World definitions
#   │   ├── audio-presets-[hash].json
#   │   └── index-[hash].css
#   └── fonts/                     # Self-hosted (Cinzel, Inter, JetBrains)
```

### 11.2 Kimi Hosting

**Option A: Kimi Static Page Deploy**
```bash
# Build first
npm run build

# Deploy via Kimi CLI or web interface
# Upload apps/web/dist/ contents
# Set custom domain: the-first-perception.kimi.page
```

**Option B: Automated via Script**
```bash
npm run deploy
# Uses scripts/deploy.mjs to:
# 1. Build production bundle
# 2. Optimize images/assets
# 3. Generate service worker for offline play
# 4. Upload to Kimi hosting endpoint
# 5. Verify deployment (HTTP 200, correct title)
```

### 11.3 Offline Support

- Service Worker caches all assets
- IndexedDB stores save data (not just localStorage)
- Game playable without network after first load
- Check for content updates on title screen

---

## 12. Performance Budgets

| Metric | Target | Maximum |
|--------|--------|---------|
| First Contentful Paint | < 1.5s | 2.0s |
| Time to Interactive | < 3.0s | 4.0s |
| Total Bundle (gzipped) | < 3MB | 5MB |
| Total Assets | < 30MB | 50MB |
| Memory Usage | < 100MB | 150MB |
| Frame Rate | 60fps | 30fps min |
| Lighthouse Score | 95+ | 90 |

---

## 13. Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| Ink integration complexity | High | Medium | Start with simple knot, expand gradually |
| Canvas performance on low-end mobile | High | High | CSS fallback for particles, feature detection |
| Content volume (3 scenarios) | Medium | Medium | Focus on 1 scenario first, template others |
| Audio autoplay restrictions | Medium | Medium | Audio starts on first user interaction only |
| Scope creep to Godot | Medium | Low | Document Godot as v3.0, not v2.0 |
| Mobile overflow issues | Medium | High | Mobile-first CSS, continuous Playwright testing |

---

## 14. Success Criteria

### Minimum Viable Release (MVP)
- [ ] One complete scenario playable start-to-death
- [ ] All 8 action reducers functional
- [ ] Ink narrative system integrated
- [ ] Mobile and desktop layouts polished
- [ ] Save/load with 3 slots
- [ ] Accessibility: keyboard-only playable
- [ ] Lighthouse score ≥ 90
- [ ] Hosted and playable on Kimi

### Full Release (v2.0)
- [ ] All 3 scenarios complete
- [ ] Legacy system functional
- [ ] Faction arc system active
- [ ] Full audio generative system
- [ ] Canvas atmospheric effects
- [ ] Codex system
- [ ] Settings with full accessibility
- [ ] Lighthouse score ≥ 95
- [ ] 30+ minute average play session
- [ ] Player can understand game in < 10 seconds

---

## 15. Immediate Next Actions

1. **Approve this plan** → Enter plan mode for implementation
2. **Initialize new monorepo structure** → Lane 1 + Lane 3 start
3. **Download and set up Ink tooling** → `npm install -g inklecate` or fetch binary
4. **Set up Tone.js and GSAP** → Lane 4 preparation
5. **Begin Phase 1: Foundation** → All lanes parallel start

---

*This plan was generated for batched subagent execution with YOLO permissions. Each phase is designed to be parallelizable where interfaces are clearly defined. The architecture prioritizes web-native performance, professional narrative tooling (Ink), and studio-grade visual design while remaining deployable on Kimi's static hosting infrastructure.*
