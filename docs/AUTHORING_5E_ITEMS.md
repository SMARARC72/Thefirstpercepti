# AUTHORING — 5e items

> How to add an item to `content/world-data/items.json`. This guide
> describes both the **current** Item shape (today, pre-Phase-7) and
> the **post-Phase-7** shape — author for the post-Phase-7 shape now
> so your additions don't need rewriting.

## 1. The shape of an item (today)

The canonical type lives in `packages/types/src/index.ts:120` and is:

```ts
export interface Item {
  id: UUID;
  name: string;
  type: ItemType;          // weapon | armor | consumable | tool | key | document | misc
  description: string;
  durability?: number;
  maxDurability?: number;
  charges?: number;
  maxCharges?: number;
  effects?: ItemEffect[];
  equipSlot?: "hand" | "body" | "head" | "accessory";
}

export interface ItemEffect {
  type: "stat_boost" | "heal" | "damage" | "condition" | "unlock" | "reveal";
  target: string;          // e.g. "body" | "hidden_exits" | "salt_touched"
  value: number;
  duration?: number;       // turns; omit for permanent
}
```

Field-by-field:

| Field | What it means |
| --- | --- |
| `id` | Stable string ID. Convention: `item-<kebab-name>`. Must be unique across the whole `items.json` file. |
| `name` | Player-facing name. Title Case. Evocative, not literal — see §3. |
| `type` | One of the seven `ItemType` values. Determines how the item reducer treats it. `consumable` items spend charges; `key` items satisfy `LockRequirement.keyItemId`. |
| `description` | One or two sentences in cosmic-horror register. Always specific. Always *off-kilter*. |
| `durability` / `maxDurability` | Optional. If present, the item reducer decrements `durability` on use (`itemReducer.ts:83`). Reaching 0 should imply destruction (foundation phase tightens this). |
| `charges` / `maxCharges` | Optional. Consumables spend a charge on use. |
| `effects` | Array of `ItemEffect`. Currently driven by the item reducer's narrow lookup table; expanded effect coverage is foundation work. |
| `equipSlot` | If set, the item can be equipped to that slot via `use ${name}` + an `equip` verb. Slots are exclusive — equipping a new item to a filled slot unequips the previous occupant (`itemReducer.ts:58`). |

Worked example from `items.json`:

```json
{
  "id": "item-brass-lens",
  "name": "Cracked Brass Lens",
  "type": "tool",
  "description": "Shows you things you are not ready to see. Cracks spider outward from the center like frozen lightning.",
  "effects": [
    { "type": "reveal", "target": "hidden_exits", "value": 1 }
  ],
  "equipSlot": "accessory"
}
```

Notes on the example: `id` is kebab-cased and stable. `name` does
*not* say "Lens of Revealing." `description` puts a physical detail
beside the magical effect — the crack is the texture, the *seeing
things you are not ready to see* is the cost. `effects[0].target` is
a magic string the investigation reducer reads when revealing hidden
exits.

## 2. Adding 5e fields (post-Phase-7)

After Phase 7 merges Unit 2's `items-5e.ts` into the canonical `Item`
type, items gain four fields:

```ts
export interface Item {
  // ...all existing fields above remain unchanged...
  rarity: RarityTierId;              // "common" | "uncommon" | "rare" | "very_rare" | "legendary" | "artifact"
  magical: boolean;                  // true if the item is supernatural; affects detect-magic style checks
  attunement: AttunementRequirement; // { required: boolean; requires?: string }
  requires?: {
    form?: CharacterForm;            // e.g. "warped" — only warped characters can wield it
    posture?: KnowledgePosture;      // e.g. "maker"
    domain?: Domain;                 // e.g. "lore"
  };
}
```

Field-by-field for the new fields:

| Field | What it means |
| --- | --- |
| `rarity` | One of six. Drives the inventory tile border colour, the rarity badge on the item tooltip, and the chance to appear in any procedurally seeded loot. Authored values from `content/world-data/rarity-tiers.json`. |
| `magical` | `true` if the item is supernatural in origin. Mundane wares (a rope, a lantern) are `false` regardless of how *strange* their description sounds. The cosmic-horror register makes everything *feel* magical; this field is the engine's escape hatch for telling them apart. |
| `attunement` | `{ required: false }` for things you just pick up and wear. `{ required: true }` if the item does nothing until attuned. `requires` (optional, inside the attunement object) can constrain *who* may attune — e.g. `{ required: true, requires: "spell-caster" }`. |
| `requires` | Item-level prerequisites for *using* the item at all, even before attunement. `form: "warped"` means a non-warped character cannot wield it. Combine sparingly — gatekeeping items frustrates more than it flavours. |

The post-Phase-7 worked example, for the same Cracked Brass Lens:

```json
{
  "id": "item-brass-lens",
  "name": "Cracked Brass Lens",
  "type": "tool",
  "rarity": "uncommon",
  "magical": true,
  "attunement": { "required": true },
  "description": "Shows you things you are not ready to see. Cracks spider outward from the center like frozen lightning.",
  "effects": [
    { "type": "reveal", "target": "hidden_exits", "value": 1 }
  ],
  "equipSlot": "accessory"
}
```

> Author for the post-Phase-7 shape now. Items.json today is allowed
> to ship without `rarity` / `magical` / `attunement` (they are not
> in the TypeScript type yet), but the Phase 7 migration will add
> them as required fields and infer defaults for entries that omit
> them: `rarity: "common"`, `magical: false`, `attunement: { required: false }`.
> If you want the migration to *not* pick those defaults for your
> item, write the explicit fields now.

## 3. Voice & tone

The First Perception is a cosmic-horror text RPG. Items are
**sigil-bound, lineage-tracked, recorded in guild ledgers**. They are
not loot drops. They are not magic markers. They have provenance, and
the provenance is *wrong*.

Rules of register, with examples:

| Do | Don't |
| --- | --- |
| **Brass Lens, Cracked** | Lens of True Sight +2 |
| **Three Dry Matches** (with a blue flame that casts no shadow) | Bundle of Magic Matches |
| **Scratched Court Seal** (opens nothing physical) | Master Key |
| **Sealed Fountain Water** (drinking is not recommended) | Healing Potion |
| **Book of Backwards Names** (arranged by date of un-birth) | Tome of Necromancy |

Naming pattern: a concrete noun, a half-adjective that hints at
something off, *no fantasy compound nouns*. **Sword** is fine.
**Sword of Holy Smiting** is not. **Long blade, salt-pitted, hilt
wrapped in a dead man's hair** is what we want.

Description pattern: one physical detail, one wrong detail. The wrong
detail can be observable ("burns with a blue flame; the flame casts
no shadow") or referential ("the seal opens nothing physical"). It
does **not** explain. The player learns the implication by *using*
the item.

Sigils, guilds, ledgers, lineages — items are tracked. If your item
came from somewhere, name the somewhere ("Drowned Court", "Greywake
Market", "the Archive Steps"). Sourcing items in the world's existing
factions and locations builds the world for free.

## 4. Common authoring mistakes

- **Duplicate `id`** — `items.json` is a flat array; two entries with
  the same `id` will silently shadow each other depending on iteration
  order. The Phase 7 schema validator will refuse the build; until
  then, the symptom is "my item doesn't show up."
- **Missing `description`** — the field is required by the type
  signature, but a blank description compiles. Don't ship a blank
  description; the inventory tooltip falls back to the name and the
  player loses everything that made the item interesting.
- **Mis-spelled `rarity`** — post-Phase-7. Must be one of the six
  exact strings: `common`, `uncommon`, `rare`, `very_rare`,
  `legendary`, `artifact`. Underscore in `very_rare`, not space, not
  hyphen.
- **`type` outside the union** — `ItemType` is exactly seven
  strings. New categories require a code change to the type, not just
  JSON.
- **`equipSlot` on a non-equippable type** — e.g. `equipSlot: "hand"`
  on a `document`. The item reducer will allow it but the player will
  read it as a bug.
- **Effects pointing at nonexistent targets** — e.g.
  `{ "type": "condition", "target": "moonstruck", "value": 1 }` when
  there is no `moonstruck` condition in `conditions.json` or
  `conditions-5e.json`. The condition reducer silently no-ops. Spell
  the condition `typeId` exactly.
- **Title Case violations** — `Cracked brass lens` reads as a
  programmer's stub, not an item. Always Title Case the `name`.
- **Fantasy clichés** — see §3. If your item name contains *of* and
  a noun (*Cloak of Elvenkind*, *Bag of Holding*), it is wrong. Find
  the cosmic-horror register first.

## 5. Worked example — a full new item, from scratch

The world needs a small, attunable, *uncommon* tool that fits the
Greywake Market District. Here is the design pass:

1. **The world hook.** The Drowned Court records debts in salt. A
   debt-marked character (`cond-debt-marked`) carries a name on a
   list. A *salt cipher* would let the character read names off the
   list — not erase them. Useful, partial.
2. **The item.** A short reed, salt-crusted, that fits between the
   teeth. While held in the mouth, names spoken nearby leave a faint
   afterglow on the reed in the order they were spoken.
3. **The mechanical effect.** `effect.type: "reveal"`,
   `target: "spoken_names"`, `value: 1`. The investigation reducer's
   post-Phase-7 listener for `spoken_names` adds a journal entry of
   names heard this turn.
4. **The 5e shape.** `rarity: "uncommon"`. `magical: true`. Attunement
   `{ required: true }` — the reed has to know your teeth.

Result:

```json
{
  "id": "item-salt-reed",
  "name": "Salt-Crusted Reed",
  "type": "tool",
  "rarity": "uncommon",
  "magical": true,
  "attunement": { "required": true },
  "description": "A short reed, white with dried Drowned Court salt. Held in the mouth, it remembers the order of names spoken within reach.",
  "effects": [
    { "type": "reveal", "target": "spoken_names", "value": 1 }
  ],
  "equipSlot": "accessory"
}
```

Commentary:

- The `name` is two words and a half-adjective. No "of."
- The `description` puts the physical detail (white, crusted) beside
  the wrong detail (it *remembers names*). It does not say *how*.
- The `attunement` is `required: true` because the item is supernatural
  and has a small mechanical effect; if a non-attuned character could
  use it, attunement loses its meaning.
- The `effect.target` is a stable string. The Phase 7 + 8d audit
  will catalogue all such strings so the reducer side cannot drift.
- The world hook (Drowned Court, debt-marked) reuses existing entities
  from `content/world-data/conditions.json` and the existing faction
  set. It does not invent new lore unless it has to.
