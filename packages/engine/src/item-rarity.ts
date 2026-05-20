/**
 * ============================================================================
 * ITEM RARITY — 5e-style rarity ladder helpers (pure)
 * ============================================================================
 * Read-only helpers over the six-tier 5e rarity ladder. No state, no I/O.
 *
 * Canonical content lives at content/world-data/rarity-tiers.json. The engine
 * targets both browser (Vite) and Node (vitest) runtimes; rather than embed
 * the JSON via filesystem reads or cross-package imports (which violate the
 * engine's rootDir), the ladder is mirrored here as a frozen const. Phase 7's
 * content-loading pass will replace this with a real loader and verify the
 * two stay synchronized via a schema check.
 *
 * @module engine/item-rarity
 * @version 1.0.0
 * ============================================================================
 */

import type { RarityTier, RarityTierId } from '@first-perception/types';

const RARITY_TIERS: readonly RarityTier[] = Object.freeze([
  Object.freeze<RarityTier>({
    id: 'common',
    label: 'Common',
    order: 0,
    attunementRequired: false,
    bonusMagic: 0,
    colorTokenCss: '--rarity-common',
    description: 'Bone-flute knapping; market-counter goods. No sigil. No song.',
  }),
  Object.freeze<RarityTier>({
    id: 'uncommon',
    label: 'Uncommon',
    order: 1,
    attunementRequired: false,
    bonusMagic: 1,
    colorTokenCss: '--rarity-uncommon',
    description: 'Patterned to the second sight. Hums when a witness is near.',
  }),
  Object.freeze<RarityTier>({
    id: 'rare',
    label: 'Rare',
    order: 2,
    attunementRequired: 'sometimes',
    bonusMagic: 2,
    colorTokenCss: '--rarity-rare',
    description: 'Sigil-cut by named smiths. Lineage-tracked in three guilds.',
  }),
  Object.freeze<RarityTier>({
    id: 'very_rare',
    label: 'Very Rare',
    order: 3,
    attunementRequired: 'sometimes',
    bonusMagic: 3,
    colorTokenCss: '--rarity-very-rare',
    description: 'A relic with a single recorded incident. Trade is logged.',
  }),
  Object.freeze<RarityTier>({
    id: 'legendary',
    label: 'Legendary',
    order: 4,
    attunementRequired: true,
    bonusMagic: 3,
    colorTokenCss: '--rarity-legendary',
    description: 'Two of these are known. Both wars were lost or won by their bearer.',
  }),
  Object.freeze<RarityTier>({
    id: 'artifact',
    label: 'Artifact',
    order: 5,
    attunementRequired: true,
    bonusMagic: 4,
    colorTokenCss: '--rarity-artifact',
    description: 'The world made it. Reasons unrecorded. Attunement is not a choice.',
  }),
]);

const RARITY_INDEX: Readonly<Record<RarityTierId, RarityTier>> = Object.freeze(
  RARITY_TIERS.reduce(
    (acc, tier) => {
      acc[tier.id] = tier;
      return acc;
    },
    {} as Record<RarityTierId, RarityTier>,
  ),
);

const DOWNGRADE_MAP: Readonly<Record<RarityTierId, RarityTierId>> = Object.freeze({
  common: 'common',
  uncommon: 'common',
  rare: 'uncommon',
  very_rare: 'rare',
  legendary: 'very_rare',
  artifact: 'legendary',
});

/** Standard compare: -1 if a < b, 0 if equal, +1 if a > b (by ladder order). */
export function compareRarity(a: RarityTierId, b: RarityTierId): number {
  const av = getRarityTier(a).order;
  const bv = getRarityTier(b).order;
  if (av < bv) return -1;
  if (av > bv) return 1;
  return 0;
}

/** Step one tier down. Common stays common (already at the floor). */
export function downgradeRarity(r: RarityTierId): RarityTierId {
  return DOWNGRADE_MAP[r];
}

/**
 * Return the six-tier ladder sorted ascending by `order`.
 * Deep-cloned so callers can't mutate the canonical table.
 */
export function loadRarityTiers(): RarityTier[] {
  return RARITY_TIERS.map((tier) => ({ ...tier })).sort((a, b) => a.order - b.order);
}

export function getRarityTier(id: RarityTierId): RarityTier {
  const tier = RARITY_INDEX[id];
  if (!tier) {
    throw new Error(`Unknown rarity tier id: "${id}"`);
  }
  return { ...tier };
}
