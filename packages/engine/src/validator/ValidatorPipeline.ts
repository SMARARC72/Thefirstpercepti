/**
 * ============================================================================
 * ValidatorPipeline — orchestrates the 6-stage validator chain
 * ============================================================================
 * Phase 16 / Wave E / ENG-201.
 *
 * Usage:
 *   const pipeline = new ValidatorPipeline();
 *   const result = pipeline.process(envelope);
 *   if (!result.overall_pass) { ...handle failure; result.failed_at_stage tells you which stage rejected }
 *
 * Pipeline collects:
 *   - Per-stage results (stages[])
 *   - Surfaced contradictions from stage 5 (surfaced_contradictions)
 *   - Total elapsed time (total_ms)
 *
 * Default behavior: short-circuit on first failure.
 * Set short_circuit_on_fail=false to run all stages and aggregate results.
 * ============================================================================
 */

import type {
  AgentEnvelope,
  ValidatorPipelineOptions,
  ValidatorPipelineResult,
  ValidatorStage,
  ValidatorStageId,
  ValidatorStageOutcome,
} from "./types.js";
import { DEFAULT_STAGES, Stage5ContradictionCheck } from "./stages.js";

const DEFAULT_OPTIONS: ValidatorPipelineOptions = {
  short_circuit_on_fail: true,
};

export class ValidatorPipeline {
  private readonly stages: ReadonlyArray<ValidatorStage>;
  private readonly options: ValidatorPipelineOptions;

  constructor(options?: Partial<ValidatorPipelineOptions>, stages?: ReadonlyArray<ValidatorStage>) {
    this.options = { ...DEFAULT_OPTIONS, ...(options ?? {}) };
    const all = stages ?? DEFAULT_STAGES;
    if (this.options.enabled_stages && this.options.enabled_stages.length > 0) {
      const enabled = new Set(this.options.enabled_stages);
      this.stages = all.filter((s) => enabled.has(s.id));
    } else {
      this.stages = all;
    }
  }

  process(envelope: AgentEnvelope): ValidatorPipelineResult {
    const t0 = Date.now();
    const stageResults: ValidatorStageOutcome[] = [];
    let failed_at_stage: ValidatorStageId | null = null;
    const surfaced_contradictions: ValidatorPipelineResult["surfaced_contradictions"] = [];

    for (const stage of this.stages) {
      let result: ValidatorStageOutcome;
      try {
        result = stage.validate(envelope);
      } catch (err: unknown) {
        result = {
          stage_id: stage.id,
          pass: false,
          reason: `stage threw: ${err instanceof Error ? err.message : String(err)}`,
          validator_id: stage.validator_id,
          completed_at: new Date().toISOString(),
        };
      }
      stageResults.push(result);

      // Stage 5 may pass but surface contradictions in details.surfaced
      if (stage.id === Stage5ContradictionCheck.id && result.pass && result.details && Array.isArray((result.details as any).surfaced)) {
        for (const c of (result.details as any).surfaced as Array<{ kind: string; detail: string }>) {
          surfaced_contradictions.push({ kind: c.kind, detail: c.detail });
        }
      }

      if (!result.pass) {
        failed_at_stage = stage.id;
        if (this.options.short_circuit_on_fail) break;
      }
    }

    const overall_pass = stageResults.every((r) => r.pass);
    return {
      envelope_id: envelope.envelope_id,
      overall_pass,
      stages: stageResults,
      failed_at_stage,
      total_ms: Date.now() - t0,
      surfaced_contradictions: surfaced_contradictions.length > 0 ? surfaced_contradictions : undefined,
    };
  }
}
