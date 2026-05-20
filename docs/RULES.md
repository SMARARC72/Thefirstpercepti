# RULES — The First Perception × 5e

> Canonical decision log for the tabletop-depth refactor (Wave 1 + 2).
> This file answers, for every 5e mechanic: did we take it, modify it,
> or refuse it. If a later phase wants to revisit a row, edit the row
> in place rather than scattering the rationale.

## 1. One-line summary

We are layering 5e mechanics on top of our 9-stat cosmic-horror system.
The 9 stats stay. The narrative register stays. We borrow 5e's *math*
(d20 + modifier vs DC, advantage/disadvantage, dice expressions, item
rarity, attunement, condition catalog) because it is the most-tested
free SRD on earth, and because authors and players already share that
vocabulary.

## 2. What we adopted from 5e

| 5e mechanic | Where it lands |
| --- | --- |
| **Dice expressions** (`1d20+5`, `2d6+3`, `4d6kh3`, `1d20kh1` = advantage, `1d20kl1` = disadvantage) | Wave 1, Unit 1 — `packages/engine/src/dice-expression.ts`. Seeded RNG only; no `Math.random`. |
| **Advantage / disadvantage** | Encoded as `kh1` / `kl1` on `1d20`. Stacks per the SRD rule (any number of sources still resolves to one roll either direction; opposing sources cancel). |
| **Action economy** | Action + bonus action + reaction per turn. The combat reducer rewrite in Phase 9 enforces it. Out-of-combat scenes do not gate on it. |
| **Item rarity ladder** | common → uncommon → rare → very rare → legendary → artifact. Authored in `content/world-data/rarity-tiers.json`. Visual border colour assigned per tier (see `AUTHORING_5E_ITEMS.md`). |
| **Attunement** | 3 slots, baseline. Items declare `attunement: { required: boolean, requires?: string }`. Filling the third slot blocks a fourth until one is dropped. |
| **The 14 SRD conditions** | blinded, charmed, deafened, exhaustion (1–6), frightened, grappled, incapacitated, invisible, paralyzed, petrified, poisoned, prone, restrained, stunned. Authored in `content/world-data/conditions-5e.json` (Wave 1, Unit 3). The pre-existing cosmic-horror conditions in `conditions.json` coexist — they are *additional*, not replaced. |
| **Proficiency bonus** | Computed from turn-count milestones (no XP). Default schedule: +2 from turn 0, +3 at turn 80, +4 at turn 200, +5 at turn 400, +6 at turn 800. Phase 7 may revisit the curve. |
| **Hit dice** | Each form has a hit die size (e.g. human = d8, warped = d10, formless = d6). Player gets `level` hit dice; short-rest spend rule mirrors 5e but the "short rest" event is reskinned as *a held breath*. Wave 1 character sheet shows a placeholder; Phase 7 wires real values from form. |
| **Saving throws** | Three saves per character. Form chooses two save proficiencies; posture grants the third. Save = `1d20 + stat modifier + (proficient ? proficiency bonus : 0)` against a DC. |
| **Spell slots** | Conditional. Only postures or forms that *narratively* grant casting (e.g. *witness* watching a binding, *maker* shaping invocations) get slots. Phase 10 designs the slot table. A character with no caster posture has zero slots and the sheet hides the row. |
| **DC bands** | 5 = trivial, 10 = easy, 15 = moderate, 20 = hard, 25 = very hard, 30 = nearly impossible. Used uniformly: skill checks, forging, save DCs. See `AUTHORING_FORGING_RECIPES.md` for the forging-specific naming. |
| **Modifier formula** | `Math.floor((stat - 10) / 2)`. Applies to every one of our 9 stats. The fact that our stats are 1–10 by default (not 1–20) makes this asymmetric — see §5. |

## 3. What we kept from our system

The 9 stats. They define the character before any 5e math touches them.

| Stat | What it is |
| --- | --- |
| **body** | Physical durability and force. Carries weight, swings blades, refuses to fall. |
| **grace** | Speed, dexterity, balance. Threads needles, dodges things, walks ledges. |
| **sense** | Perception of the visible and the half-visible. Hears bells nobody rang. |
| **mind** | Reasoning, deduction, recall. Reads a ledger and notices the missing entry. |
| **will** | Composure against fear, pain, and persuasion. Refuses the fountain's offer. |
| **presence** | Bearing and voice. Makes a stranger look up. |
| **authority** | Standing in the world's ledgers. Outranks, owns, signs documents that stick. |
| **ruin** | Compatibility with the world's wrong places. Salt in the blood. Higher = more effective in rituals, less safe to be around. |
| **creation** | Capacity to bring new things into the world. Forging, naming, binding. |

We also keep:

- **Stillness / ruin meters** — long-arc resource meters that the meter
  track surfaces as wax-seal and tide-line icons. 5e has no analogue;
  they sit alongside HP/focus, not inside them.
- **The grimoire visual register** — parchment, sigil-gold, Cormorant
  Garamond body, Inter UI chrome. The 5e math is invisible until the
  player asks for it (tooltip / sheet / fate log).
- **The tale-entry narrative layer** — every reducer emits a
  `TaleEntry` that lives in *The Unfolding*. The Ink runtime authors
  these; mechanics happen *under* the narrative, not in place of it.
  Phase 8d is the audit that keeps these honest.

## 4. What we explicitly did NOT take from 5e

| 5e thing | Why we refused |
| --- | --- |
| **Alignment grid** (LG…CE) | Cosmic horror does not partition into nine cells. Stance to factions is the closest analogue and it lives on `Faction.stance` per side, not on the player. |
| **Vancian per-day spell slots** | We may use a different recharge model — *invocations spent against the world's memory* — once Phase 10 designs it. The slot count and DC math are 5e; the *refresh trigger* may not be. Flagged in §6. |
| **Racial bonuses** | We have lineages (form + posture). Forms (`human`, `half_blood`, `warped`, `formless`, `construct`, `spirit_bound`) grant *one* mechanical edge each; postures grant *one* save proficiency and one narrative privilege. No `+2 STR` style flat boosts. |
| **The class system** | Postures and forms together do the work of "class." A *seeker / human* and a *seeker / warped* play differently because the form changes the hit die, the AC base, and which conditions land hardest. |
| **XP and leveling** | We use turn-count milestones for proficiency bonus and hit-dice count. Whether milestones are explicit ("you have crossed the second threshold") or invisible (auto-applied at turn N) is a **Phase 11 decision**. |
| **Multiclassing** | One form, one posture, for the run. A new form/posture pairing requires a new character. |
| **Encumbrance grid** | Weight is tracked on the inventory panel as a flavour number; nothing mechanical depends on the threshold. We may add real encumbrance later if a posture warrants it. |
| **Death saves** | We have death rite (Phase 6b) and legacy (existing). Hitting 0 HP triggers the rite, not a three-strike save sequence. |

## 5. Mappings & conversions

Our 9 stats run 1–10 by default. 5e ability scores run 1–20 (and rarely
to 30). The modifier formula `floor((stat - 10) / 2)` is intentionally
the same — it means our stats yield modifiers in roughly the −5…0 range
out of the gate, and a character has to *earn their way* into positive
modifiers. That is the cosmic-horror promise: the world starts above
you. As a stat climbs past 10, modifiers go positive normally.

When 5e SRD content references an ability score, use this map:

| 5e ability | Our stat |
| --- | --- |
| STR | **body** |
| DEX | **grace** |
| CON | **will** (not body — body is the *frame*, will is the *staying*) |
| INT | **mind** |
| WIS | **sense** |
| CHA | **presence** |

Three of our stats — **authority**, **ruin**, **creation** — have no
5e analogue. SRD content cannot reference them; our own content does.

Skill checks: pick the stat by what is actually being tested.

- Climb a wall → body
- Read a ledger → mind
- Spot a hidden door → sense
- Resist a charm → will
- Lie to a guard → presence (or mind, on the *bargain* / *lie*
  branch — see `dialogueReducer.ts` for the existing precedent at line 37)
- Notice a hostile faction is listing your name → authority
- Walk into a salt-marked room without flinching → ruin
- Forge a new seal → creation

## 6. Open questions

These are real, unresolved decisions. Future Claude sessions resolving
them should edit this file and remove the row.

- **Do attunements consume an action?** 5e says one hour of bonding;
  some tables collapse that into "spend a short rest." Phase 7 decides
  whether attunement happens in a held breath, over a sleep, or via an
  explicit action verb (`bind` / `attune`).
- **Spell-slot recharge model.** Per-day in 5e. Per-rest in some
  hacks. We're considering *per-truth-spoken* or
  *per-binding-witnessed* — both diegetic. Phase 10 decides.
- **Proficiency bonus curve.** The turn-count thresholds in §2 are a
  guess. Phase 7 plays-tests them.
- **Hit-dice count vs. character level.** 5e gives 1 hit die per
  level. We are not using levels. Likely: hit-dice count = `1 +
  floor(turnCount / 80)`, capped at 6. Phase 7 decides.
- **Encumbrance.** Off by default. Phase 9 may turn it on for the *maker*
  posture (creation + forging carries a literal weight).
- **Whether ruin can be used as a save stat.** If a salt-marked
  character is *more* compatible with the world's wrong places, a
  ruin-based save against certain magical conditions is thematically
  correct. But it would let high-ruin characters laugh at conditions
  that are supposed to ruin them. Phase 7 decides.
- **Forge critical-success table.** Currently three bands (success /
  partial / failure). 5e has crits on natural 20. The forging design
  in `AUTHORING_FORGING_RECIPES.md` leaves room for a crit band but
  does not yet enumerate its narrative space. Phase 9 decides.
- **Whether "exhaustion" stacks should map 1:1 to our existing
  cosmic-horror `cond-exhausted`** (which has a different effect
  table) or if both should coexist as two named conditions. Wave 1,
  Unit 3 ships them coexisting. Phase 7 reviews.
