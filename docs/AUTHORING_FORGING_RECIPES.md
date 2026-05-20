# AUTHORING — forging recipes

> How to add a recipe to `content/world-data/forging-recipes.json`.
> Recipes ship in Wave 1 Unit 2; the UI surface for selecting and
> running them ("The Anvil") lands in Phase 9. Authors can add recipes
> today and they will become playable once Phase 9 wires the panel.

## 1. Recipe shape

The canonical interface is `ForgeRecipe`, defined in
`packages/types/src/items-5e.ts` (Wave 1 Unit 2). The Phase-7
migration folds it into the wider type surface; for authors, the
shape is stable:

```ts
export interface ForgeRecipe {
  id: string;                       // stable; "recipe-<kebab-name>"
  name: string;                     // player-facing, in the grimoire register
  description: string;              // what is being made, and why it is not safe
  inputs: ForgeInput[];             // materials consumed on success
  output: ItemTemplate;             // the Item created on success
  smithDC: number;                  // 10..30; see §2
  successNarrativeKey: string;      // tale-engine narrative key
  partialNarrativeKey: string;
  failureNarrativeKey: string;
  requires?: {
    posture?: KnowledgePosture;     // e.g. "maker"
    minStat?: { stat: CoreStat; value: number };
    location?: string;              // location ID where forging can happen
  };
}

export interface ForgeInput {
  itemId: string;                   // an existing item id from items.json
  quantity: number;                 // copies consumed
}

export interface ItemTemplate {
  // Same shape as Item (post-Phase-7), minus the runtime `id` —
  // each successful forge generates a fresh id.
  name: string;
  type: ItemType;
  description: string;
  rarity: RarityTierId;
  magical: boolean;
  attunement: AttunementRequirement;
  effects?: ItemEffect[];
  equipSlot?: Item["equipSlot"];
  durability?: number;
  maxDurability?: number;
  charges?: number;
  maxCharges?: number;
}
```

Field-by-field for the recipe-level fields:

| Field | What it means |
| --- | --- |
| `id` | Stable. Convention: `recipe-<kebab-name>`. Must be unique across the file. |
| `name` | Player-facing. Title Case. Cosmic-horror register (see `AUTHORING_5E_ITEMS.md` §3). |
| `description` | One or two sentences. What is being forged, in whose lineage, *and why it costs something*. |
| `inputs` | Array of `{ itemId, quantity }`. Each `itemId` must exist in `items.json`. Phase 9 deducts these from the player's inventory on a success or partial; on failure, the *partial-failure* band consumes some inputs and the *failure* band consumes all. |
| `output` | The `ItemTemplate` instantiated on success. On *partial*, the output is created but receives a debuff (Phase 9 implements the debuff schedule; for now, `partial` just adds a `cracked` tag). |
| `smithDC` | An integer 10–30. See §2. |
| `successNarrativeKey` / `partialNarrativeKey` / `failureNarrativeKey` | Stable strings that the tale-engine resolves to a narrative passage. See §4. |
| `requires.posture` | If set, only the named posture can attempt the recipe. Other postures see the recipe locked. |
| `requires.minStat` | Gate by a minimum stat value. E.g. `{ stat: "creation", value: 4 }` keeps the recipe locked until the player has creation ≥ 4. |
| `requires.location` | If set, the recipe can only be attempted at the named location. E.g. `loc-archive-anvil`. The Anvil panel will hide the recipe elsewhere. |

## 2. DC bands

The `smithDC` is the difficulty the forge roll must meet or beat.
Use these five named bands; do not invent new ones:

| `smithDC` | Band | Who can make this |
| --- | --- | --- |
| **10** | The cottage smith | A useful object that any apprentice can produce. Mundane rope, hammered nails, a copper cup. |
| **15** | The journeyman | Solid, named, slightly magical work. Salt-cipher reeds, a binding cord, a sigil-marked lantern. |
| **20** | The guild master | Real magical artifice. Carries a guild stamp. Items at the *rare* rarity tier sit here. |
| **25** | The sigil-cut artificer | Bespoke work. Items at the *very rare* rarity tier. Few characters in the world can do this. |
| **30** | The unrecorded | Forging beyond the ledger. *Legendary* and *artifact* rarity items. The forge itself remembers afterwards. |

Set `smithDC` from the rarity of the output, not the other way around.
A *common* output forged at DC 30 is wasteful. A *legendary* output
forged at DC 10 breaks the economy.

## 3. Outcome bands

The forge roll is `1d20 + creation modifier + (proficient ? proficiency bonus : 0)`
versus `smithDC`. The Phase 9 implementation classifies the outcome
by margin:

| Margin (roll total − DC) | Outcome | What happens |
| --- | --- | --- |
| ≥ +10 | **Critical success** | Output created with a positive flourish (Phase 9 may grant +1 effect, or a free attunement, or a marked sigil that grants advantage on related rolls). |
| 0 … +9 | **Success** | Output created as written. All inputs consumed. `successNarrativeKey` fires. |
| −4 … −1 | **Partial** | Output created with a flaw — at minimum a `cracked` tag; per the recipe, an explicit debuff. All inputs consumed. `partialNarrativeKey` fires. |
| ≤ −5 | **Failure** | Output not created. Some inputs consumed (default: half, rounded down). `failureNarrativeKey` fires. |

Critical failure (margin ≤ −10) is *not* its own band in Wave 1 — the
"Forge critical-success table" question is still open in `RULES.md`
§6. Until Phase 9 resolves it, treat margin ≤ −10 as a *failure*
outcome with all inputs consumed.

## 4. Narrative keys

Every recipe needs **three** narrative keys, one per outcome band:

```
forge.<recipe-id>.success
forge.<recipe-id>.partial
forge.<recipe-id>.failure
```

(Replace `<recipe-id>` with the recipe's `id` minus the `recipe-`
prefix. E.g. for `recipe-salt-reed` the keys are
`forge.salt-reed.success`, etc.)

The narrative text itself does **not** live in this JSON file. It
lives in the tale-engine layer (Ink scenes or a separate
`content/world-data/forge-narratives.json` registry — Phase 9
decides). For Wave 1, authors write the keys; the text is wired
later. The keys must be stable: if Phase 9 sees a recipe whose keys
are not in the narrative registry, the build fails.

Naming convention enforced:

- All lowercase.
- Dot-separated namespaces: `forge.<recipe>.<outcome>`.
- The `<recipe>` namespace is exactly the recipe's `id` minus the
  `recipe-` prefix.
- The `<outcome>` is exactly one of `success`, `partial`, `failure`.

If your recipe needs additional narrative variants (e.g. a
posture-specific success line), add them as further dotted segments —
`forge.salt-reed.success.maker`, `forge.salt-reed.success.witness` —
and document the variants in the recipe's `description` field so
Phase 9 knows to expect them.

## 5. Worked example — a full new recipe, from scratch

The world has a Drowned Court that records debts in salt. The
`item-salt-reed` from `AUTHORING_5E_ITEMS.md` §5 is the natural
forge output. Let's author the recipe.

1. **The lineage.** The reed is *journeyman* work — solid, named,
   slightly magical. `smithDC: 15`.
2. **The materials.** A reed needs reed-stock and Drowned Court
   salt. Existing items in `items.json`: `item-fountain-water`
   (a vessel of salt-touched water) and a hypothetical
   `item-cut-reed` (the unblessed substrate). If the unblessed reed
   does not yet exist, author it as a mundane item first, then this
   recipe.
3. **The constraint.** Only the *maker* posture can forge it; you
   want creation ≥ 4 to attempt; you want it bound to the Archive
   anvil because the anvil knows the cipher.
4. **The outputs.** Per §5 of `AUTHORING_5E_ITEMS.md`.

Result:

```json
{
  "id": "recipe-salt-reed",
  "name": "Bind a Salt-Crusted Reed",
  "description": "A journeyman's binding. The reed is dipped in fountain water, then dried against the Archive anvil until it remembers the order of names. The anvil charges a debt for the work; the maker carries it.",
  "inputs": [
    { "itemId": "item-cut-reed", "quantity": 1 },
    { "itemId": "item-fountain-water", "quantity": 1 }
  ],
  "output": {
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
  },
  "smithDC": 15,
  "successNarrativeKey": "forge.salt-reed.success",
  "partialNarrativeKey": "forge.salt-reed.partial",
  "failureNarrativeKey": "forge.salt-reed.failure",
  "requires": {
    "posture": "maker",
    "minStat": { "stat": "creation", "value": 4 },
    "location": "loc-archive-anvil"
  }
}
```

Commentary:

- `smithDC: 15` matches *journeyman* and the *uncommon* output rarity.
- Two inputs, both already present (or trivially added) in `items.json`.
- `requires` is fully populated because the world hook demanded it —
  this is a Drowned-Court-anvil-cipher item, not a campfire forge.
- The three narrative keys follow the convention exactly. The text
  behind them will be authored alongside the Anvil panel in Phase 9.
- The `description` carries the *cost* — "the maker carries it" — so
  the player understands why this is not free, even before reading
  the failure text.
