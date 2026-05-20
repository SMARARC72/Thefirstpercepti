/**
 * ============================================================================
 * 5e-STYLE ITEM RARITY, ATTUNEMENT, AND FORGING — Type Declarations
 * ============================================================================
 * Authored for Wave 1, Unit 2 of the tabletop-depth refactor.
 *
 * These types live in a separate module so they can be merged into the
 * canonical Item shape during the Phase 7 foundation pass without disturbing
 * the existing Item interface in index.ts (which many consumers already
 * import).
 *
 * @module @first-perception/types/items-5e
 * @version 1.0.0
 * ============================================================================
 */

export type RarityTierId =
  | 'common'
  | 'uncommon'
  | 'rare'
  | 'very_rare'
  | 'legendary'
  | 'artifact';

export interface RarityTier {
  id: RarityTierId;
  /** Display label, e.g. "Common", "Very Rare". */
  label: string;
  /** 0..5 ascending by power; common=0, artifact=5. */
  order: number;
  /** True/false/'sometimes' — 5e attunement rules vary by tier. */
  attunementRequired: boolean | 'sometimes';
  /** Baseline +N to attack/save rolls when magical (5e bonus convention). */
  bonusMagic: number;
  /** CSS custom-property name; the UI defines the actual color value. */
  colorTokenCss: string;
  /** Single-sentence in-world flavor. */
  description: string;
}

export interface AttunementRequirement {
  required: boolean;
  /**
   * Optional 5e-style "requires attunement by…" prerequisites.
   * Examples: "by a spellcaster", "by a creature of cosmic-aware lineage".
   */
  prerequisites?: string[];
}

export interface ForgeRecipe {
  id: string;
  label: string;
  /** Item template id from items.json (resolved by Phase 7). */
  outputTemplateId: string;
  outputRarity: RarityTierId;
  inputs: Array<{ materialId: string; quantity: number }>;
  /** 5e Difficulty Class for the smith check; typical range 10–25. */
  smithDC: number;
  craftTimeHours: number;
  /** Narrative hook id fired on full success. */
  successNarrativeKey: string;
  /** Narrative hook id fired on partial success (output one tier lower). */
  partialNarrativeKey: string;
  /** Narrative hook id fired on failure (materials consumed, no output). */
  failureNarrativeKey: string;
}

export type ForgeOutcomeKind = 'success' | 'partial' | 'failure';

export interface ForgeOutcome {
  kind: ForgeOutcomeKind;
  /** Null when no item is produced (failure, or refunded common partial). */
  outputItemTemplateId: string | null;
  /** Null when no item is produced. */
  outputRarity: RarityTierId | null;
  /** Materials actually consumed; empty array on a refunded common partial. */
  consumedInputs: Array<{ materialId: string; quantity: number }>;
  smithRollTotal: number;
  smithDC: number;
  narrativeKey: string;
}
