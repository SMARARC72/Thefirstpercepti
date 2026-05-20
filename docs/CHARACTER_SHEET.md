# CHARACTER_SHEET — schema + tooltip glossary

> Specification for the new `CharacterSheetPanel`
> (`apps/web/src/components/CharacterSheetPanel.ts`, Wave 1 Unit 4).
> The panel reads from `game.player` only. It does not write. Wiring
> into `GameplayScreen.ts` lands in Phase 8a.

## 1. What's on the sheet

Five sections, top to bottom on desktop; collapsible cards on mobile.

| § | Section | What it shows |
| --- | --- | --- |
| 1 | **Identity** | Name, form (with `formLabel`), posture (with `postureLabel`), primary domain. |
| 2 | **Ability scores** | All 9 stats as tiles (see §2). |
| 3 | **Combat callouts** | Armor Class (computed), Passive Perception (computed), Hit Dice tracker (placeholder until Phase 7), HP & max HP (with the wax-seal meter from the existing StatusPanel). |
| 4 | **Saving throws** | One row per save proficiency. Each row: stat name, modifier total, "proficient" badge if applicable. Three rows total (two from form, one from posture). |
| 5 | **Status footer** | Conditions strip (Phase 8a-or-later) and a "see The Trove" link that scrolls to the InventoryPanel. |

The 9-stat block is the **sidebar callout** in the grimoire register —
sigil-gold headings, paper-grain background, Cormorant body, the
modifier rendered larger than the score because the modifier is what
the math actually uses.

## 2. Stat tile anatomy

Each ability score renders as a tile with three parts:

```
+--------------------+
| BODY               |  <- name, uppercase, sigil-gold
|                    |
|       +2           |  <- modifier, big, centered (the player's lever)
|       (15)         |  <- raw score, parenthetical, smaller
+--------------------+
```

The modifier is computed in TypeScript:

```ts
function modifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}
```

Range table (for sanity):

| Score | Modifier |
| --- | --- |
| 1 | −5 |
| 2–3 | −4 |
| 4–5 | −3 |
| 6–7 | −2 |
| 8–9 | −1 |
| 10–11 | +0 |
| 12–13 | +1 |
| 14–15 | +2 |
| 16–17 | +3 |
| 18–19 | +4 |
| 20–21 | +5 |

Our default stats live in roughly 1–10. New characters will see lots
of negative modifiers. That is intentional (see `RULES.md` §5). The
panel renders negatives in ember (the danger accent), zero in bone,
positives in sigil-gold.

## 3. Tooltip glossary

Every term on the sheet has a hover tooltip. Definitions:

- **Armor Class (AC)** — the number an incoming attack roll must
  meet or beat to hit you. Computed as `10 + grace modifier +
  form bonus + worn armour bonus`. Higher AC = harder to hit. Default
  form bonus is 0; *warped* and *spirit_bound* grant +1 and +2
  respectively (Phase 7 confirms).
- **Passive Perception** — what you notice without trying.
  `10 + sense modifier + (proficient ? proficiency bonus : 0)`. Used
  by the engine to auto-reveal POIs and hidden exits in the
  investigation reducer.
- **Proficiency Bonus** — a number that scales with your time in the
  world. Added to attack rolls, saves, and skill checks you are
  *proficient* in. Starts at +2; climbs at the turn-count milestones
  documented in `RULES.md` §2.
- **Hit Dice** — a pool of dice you spend to heal during a *held
  breath* (our short rest). The die size is set by your form:
  human = d8, warped = d10, formless = d6. The count climbs with your
  turn count. Phase 7 wires the real values; until then the tracker
  shows a placeholder.
- **Saving Throw** — a roll you make *against* a bad thing.
  `1d20 + stat modifier + (proficient ? proficiency bonus : 0)` vs a
  DC set by the source. *Resist a charm* is a will save. *Stay on
  your feet through a tremor* is a body save. *Hear the lie* is a
  sense save.
- **Attunement** — the bond between you and a magical item. You have
  3 attunement slots, total. A magical item that requires attunement
  does *nothing* until you spend a slot on it. When the third slot is
  filled, the fourth attempt fails until you drop one. (How attunement
  is *triggered* — action, held breath, sleep — is a Phase 7 open
  question.)
- **Advantage** — roll `2d20` and keep the higher. Granted when the
  fiction puts the world on your side (you have surprise, you have
  the high ground, you have a binding that knows the name of the
  thing you're fighting).
- **Disadvantage** — roll `2d20` and keep the lower. Granted when the
  fiction is against you (you are blinded, frightened, restrained, in
  full dark, salt in your eyes). Multiple sources do *not* stack; one
  source on each side cancels.

## 4. How to read it as a player

Look at the modifiers, not the scores. Negative modifiers are the
world telling you what kind of character you are: a *seeker / human*
with body 4 will be slower than a wall the entire first act, and that
is correct. The proficiency bonus row is the slowest-moving number on
the sheet — it climbs with your *time-in-world*, not your damage
dealt, and it lifts your three saves and your proficient skill checks
together. The AC and Passive Perception rows are the two numbers the
engine consults silently every turn; everything else is rolled against
a DC you can see in the fate log.

If a row's value is `—`, that field is wired in a later phase. The
sheet does not lie about what is real today.

## 5. Future fields (Phase 8a / 9 / 10)

- **Real hit dice from form** — Phase 7 wires `form → die size` and
  `turnCount → die count`. The tracker reads them.
- **Spell slots** — Phase 10. Only renders if the player's posture
  grants casting. Otherwise hidden, not zeroed.
- **Conditions strip** — Phase 8a. Pulls from `game.player.conditions`
  and shows compact icons with hover tooltips for description and
  turns remaining. The 14 SRD conditions (Wave 1 Unit 3) and our
  cosmic-horror conditions coexist in the same strip.
- **Equipped-items strip** — Phase 8a. Pulls items where
  `equipSlot !== undefined`. Each shows its rarity-border colour and
  attunement glyph (post-Phase-7 item shape).
- **Save DC tooltip drilldowns** — Phase 9. Each save row, on long
  hover, shows the last three save rolls and their outcomes (sourced
  from `game.fate`).
- **Carrying weight** — Phase 9 if encumbrance is turned on for any
  posture (see `RULES.md` §6). Until then, hidden.
