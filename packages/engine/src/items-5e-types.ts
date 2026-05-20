/**
 * ============================================================================
 * 5e-STYLE ITEM RARITY / FORGING TYPES — engine-local mirror
 * ============================================================================
 * These declarations mirror packages/types/src/items-5e.ts. The types module's
 * public surface (index.ts) is owned by the Phase 7 foundation pass; until
 * Phase 7 reconciles the canonical Item type with this 5e layer, the engine
 * consumes a local copy so the engine and its tests have something concrete
 * to typecheck against.
 *
 * Phase 7 will delete this file and re-point imports at @first-perception/types.
 * Keep the two declarations in sync until then.
 *
 * @module engine/items-5e-types
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
  label: string;
  order: number;
  attunementRequired: boolean | 'sometimes';
  bonusMagic: number;
  colorTokenCss: string;
  description: string;
}

export interface AttunementRequirement {
  required: boolean;
  prerequisites?: string[];
}

export interface ForgeRecipe {
  id: string;
  label: string;
  outputTemplateId: string;
  outputRarity: RarityTierId;
  inputs: Array<{ materialId: string; quantity: number }>;
  smithDC: number;
  craftTimeHours: number;
  successNarrativeKey: string;
  partialNarrativeKey: string;
  failureNarrativeKey: string;
}

export type ForgeOutcomeKind = 'success' | 'partial' | 'failure';

export interface ForgeOutcome {
  kind: ForgeOutcomeKind;
  outputItemTemplateId: string | null;
  outputRarity: RarityTierId | null;
  consumedInputs: Array<{ materialId: string; quantity: number }>;
  smithRollTotal: number;
  smithDC: number;
  narrativeKey: string;
}
