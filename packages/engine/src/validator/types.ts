/**
 * ============================================================================
 * Validator Pipeline — shared types
 * ============================================================================
 * 6-stage validator chain per ARD-004. Each agent envelope (state_diff +
 * authoring metadata) passes through:
 *   1. stage_1_input              — schema-shape on the envelope itself
 *   2. stage_2_rules              — adjudication (dice/cost shape)
 *   3. stage_3_canon_consistency  — state_diff doesn't contradict existing canon
 *   4. stage_4_canon_progression  — writer_authority enforcement + R-51 cost_layer
 *   5. stage_5_contradiction_check — vs contradiction_ledger
 *   6. stage_6_content_boundary   — voice + glyph + jailbreak guard
 *
 * Result shape mirrors schema_pack_v0.5 $def validator_stage_result.
 *
 * Phase 16 / Wave E / ENG-201.
 * ============================================================================
 */

import type { StatePatch, GameState } from "@first-perception/types";

export type ValidatorStageId =
  | "stage_1_input"
  | "stage_2_rules"
  | "stage_3_canon_consistency"
  | "stage_4_canon_progression"
  | "stage_5_contradiction_check"
  | "stage_6_content_boundary";

export const VALIDATOR_STAGE_IDS: readonly ValidatorStageId[] = [
  "stage_1_input",
  "stage_2_rules",
  "stage_3_canon_consistency",
  "stage_4_canon_progression",
  "stage_5_contradiction_check",
  "stage_6_content_boundary",
] as const;

/** Author identity for an envelope — who produced it. Per ARD-006 only "state_manager" may commit canon writes. */
export type EnvelopeAuthor =
  | "input_interpreter"
  | "rules_agent"
  | "npc_evaluator"
  | "faction_evaluator"
  | "domain_evaluator"
  | "world_director"
  | "dice_resolution"
  | "state_manager"
  | "narrator"
  | "content_boundary_validator"
  | "intent_classifier"      // repo's name for input_interpreter
  | "turn_orchestrator";     // repo's coordination layer

/** What the player did/said in this turn. */
export interface EnvelopeInput {
  player_command: string;
  player_id: string;
  session_id?: string;
  turn_index: number;
}

/** Proposed mechanical effects of this turn — what the engine wants to commit. */
export interface EnvelopeProposal {
  patches: StatePatch[];
  narrative_text?: string;
  spell_cast_id?: string;
  rolls?: Array<{ kind: string; result: number; dc?: number }>;
  events_emitted?: Array<{ kind: string; data?: Record<string, unknown> }>;
}

/** The full agent envelope a stage validates against. */
export interface AgentEnvelope {
  envelope_id: string;
  author: EnvelopeAuthor;
  input: EnvelopeInput;
  proposal: EnvelopeProposal;
  game_state_before: GameState;
  rng_seed?: string;
}

/** Result of a single validator stage. Mirrors schema_pack_v0.5 $def validator_stage_result. */
export interface ValidatorStageOutcome {
  stage_id: ValidatorStageId;
  pass: boolean;
  reason: string | null;
  validator_id: string;
  completed_at: string;
  /** Optional structured details when reason is too thin */
  details?: Record<string, unknown>;
}

/** Aggregate result after pipeline runs all (or short-circuits at first failed) stages. */
export interface ValidatorPipelineResult {
  envelope_id: string;
  overall_pass: boolean;
  stages: ValidatorStageOutcome[];
  /** Which stage stopped the pipeline, if any */
  failed_at_stage: ValidatorStageId | null;
  /** Total time across all stages */
  total_ms: number;
  /** New contradiction_ledger entries surfaced by stage 5, if any */
  surfaced_contradictions?: Array<{ kind: string; detail: string; surface_after_day?: number | null }>;
}

/** Options controlling pipeline behavior. */
export interface ValidatorPipelineOptions {
  /** If true, stop running stages after first failure. Default true. */
  short_circuit_on_fail: boolean;
  /** Override which stages to run; default = all 6 in order. */
  enabled_stages?: ValidatorStageId[];
}

/** Single-stage validator interface. */
export interface ValidatorStage {
  readonly id: ValidatorStageId;
  readonly validator_id: string;
  validate(envelope: AgentEnvelope): ValidatorStageOutcome;
}
