# Phase 24d / 6a.5 — Catalog Closure Report

**Generated:** 2026-05-22T16:40:16.399Z
**Discipline:** Discipline 9 transitive-closure (Risk 3 hardening)
**Stop thresholds:** items=30 / materials=50 / spells=25 / loot_tables=8

## Closure counts vs stop thresholds (closure-filtered catalogs)

| catalog | closure_size | threshold | status |
|---|---|---|---|
| items | 15 | 30 | OK |
| materials | 1 | 50 | OK |
| spells | 5 | 25 | OK |
| loot_tables | 0 | 8 | OK |
| recipes | 1 | _(no explicit cap)_ | — |

**Fixed-point reached in 2 iterations.**

## Bulk-seed catalogs (NOT closure-filtered; slice-fixed content)

These catalogs are not part of the FK-closure walk — they are bulk-included
in 6a.5 commit 2 because they describe slice-fixed content not gated by
item FKs:

| catalog | rows | note |
|---|---|---|
| conditions.json | 4 | Greywake-specific conditions (matches user spec) |
| conditions-5e.json | 15 | Standard 5e conditions (canonical reference set) |
| litanies.json | 20 | Drowned Church liturgical content (matches user spec) |
| marginalia.json | 25 | Codex marginalia (matches user spec) |
| imposed_spells.json | 5 | NPC-imposed slice spells |
| forging-recipes.json | 5 | Slice-specific forging variants |
| recipes.json | 12 | All recipes (matches user spec) |

**abilities + traits**: v0.8 schema has NO standalone `ability` or `trait`
table. These live as embedded JSON inside race/class rows already seeded in
`20260522143701_seed_v08_content_foundation.sql` (race.tiefling derived
features + class.warlock pact features). Bulk-include = no-op for 6a.5.

## Item variant distribution (oneOf discriminator: `type`)

- **armor**: 1
- **book**: 1
- **consumable**: 3
- **currency_token**: 1
- **tool**: 2
- **trinket**: 1
- **weapon**: 3
- **wondrous**: 3

This drives Item T handler design: only the variants above need bespoke handlers in 6a.5. Variants NOT exercised by closure → DEFER to v0.9 per first-read discipline.

## Broken FK refs (half-closures requiring ratification)

- **recipe** `recipe_bell_marked_charm` (referenced from item `item_bell_marked_charm` via recipe_id)
- **material** `item_vial_practiced_name_water` (referenced from recipe `bell_marked_charm` via material_id)

## Full closure set

### Items (15)
  - item_bell_court_inkwell_stamp
  - item_bell_marked_charm
  - item_compose_chalk
  - item_drowned_amber_pendant
  - item_field_journal_blank
  - item_listening_childs_pebble
  - item_marrow_wax_seal_of_ilyra
  - item_meteoric_iron_dagger
  - item_salt_rime_shard
  - item_tide_league_scrip_bundle_25
  - item_vial_of_practiced_name_water
  - item_witness_bell
  - itm_dagger
  - itm_leather_armor
  - itm_light_crossbow

### Materials (1)
  - mat_bell_tin

### Spells (5)
  - armor_of_agathys
  - eldritch_blast
  - hex
  - mage_hand
  - spell_harden_contradiction

### Loot tables (0)


### Recipes (1)
  - bell_marked_charm

## Decision gates for Desktop

1. **Threshold compliance** — all 4 stop thresholds OK? If any OVER → expand cap OR drop closure entries.
2. **Broken FK list** — for each broken ref: (a) author the missing row into source JSON before 6a.5 commit 2, OR (b) drop the referencing row from closure, OR (c) defer to v0.9.
3. **Item variant set** — does the variant distribution match expected oneOf-handler scope? Approve list or amend.
4. **Listening Child CC hygiene** (non-blocking, separate decision per user) — confirm 2 CC entries carry death-equivalent semantic; small follow-up commit if not.

## Item T handler design (preview — not yet built)

Per Risk 3 hardening: bespoke-per-variant under oneOf dispatch.

```ts
// Pseudocode — to be authored in 6a.5 commit 2
const itemVariantHandlers = {
  armor: translateArmor,
  book: translateBook,
  consumable: translateConsumable,
  currency_token: translateCurrency_token,
  tool: translateTool,
  trinket: translateTrinket,
  weapon: translateWeapon,
  wondrous: translateWondrous
};
function translateItem(item) {
  const handler = itemVariantHandlers[item.type];
  if (!handler) throw new Error(`No translator for item.type=${item.type} (defer to v0.9)`);
  return handler(item);
}
```

NO base class. NO generic Translator<T>. NO inheritance.
Each variant gets its own roundtrip test fixture.
