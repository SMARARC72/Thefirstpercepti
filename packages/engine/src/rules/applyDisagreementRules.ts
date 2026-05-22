/**
 * applyDisagreementRules — pure function consuming the RuleRegistry to resolve
 * source disagreements at the persistence/engine boundary. Phase 24c §5c.3.
 *
 * Per ARD-017 + Phase 4.10 ratified rule (opening_hours_disagreement_rule_v1):
 * when multiple sources report different values for `entity.field`, this
 * function consults the RuleRegistry's matching disagreement rule(s), applies
 * the rule's resolution_strategy + trust_ranking, and returns:
 *   - the resolved value (winner)
 *   - any side-effects to emit (contradiction_ledger_entry, information
 *     veracity tag, surface_to_player flag, etc.)
 *
 * Pure function: no I/O, no global state. Engine integration site decides
 * what to DO with the side-effects (write to ledger, emit to player, etc.).
 *
 * **Where this is called from (engine integration map):**
 *
 *   - **Stage 5 (contradiction_check)** — when contradictions surface from
 *     state_diff vs ledger, Stage 5 consults this function to apply registry
 *     resolutions. Hook point lives in `validator/stages.ts` Stage5; deferred
 *     to engine bootstrap rewrite (Session 5c.2 proper).
 *
 *   - **Engine surface layer** — when player queries an entity field and
 *     multiple sources have reported different values, the surface layer
 *     consults this to pick which value to render. Hook point lives in the
 *     dialogue/NPC-response generation path; deferred to Session 24d.
 *
 *   - **State manager write** — when a write would conflict with a prior
 *     write on the same entity.field, state_manager consults this function
 *     to decide whether the new value supersedes or is held back.
 */

import type { EngineRule, RuleRegistrySurface } from "./RuleRegistry.js";

// ============================================================================
// PUBLIC TYPES
// ============================================================================

/**
 * A single observation/claim about an entity.field from a specific source.
 * Examples:
 *   {source_kind: "institution_canonical_record", value: "first dawn"}
 *   {source_kind: "npc_with_role_inside_institution", value: "third bell",
 *    source_id: "npc_orro"}
 */
export interface SourceObservation {
  /** Classification of this source — must match a trust_ranking entry's source_kind. */
  source_kind: string;
  /** The observed value (any JSON-serializable shape — strings, numbers, objects). */
  value: unknown;
  /** Optional source identifier for downstream logging (npc_id, event_id, etc.). */
  source_id?: string;
}

/** A single side-effect emitted from a disagreement resolution. */
export interface DisagreementSideEffect {
  kind: string;
  with_topic?: string;
  with_veracity?: "true" | "false" | "partial" | "unknown";
  trust_delta_threshold?: number;
  /** Free-form payload for class-specific side-effects. */
  [extraField: string]: unknown;
}

/** The result of applying disagreement rules to a set of observations. */
export interface DisagreementResolution {
  /** The matched rule (or null if no rule applied — function returns sources untouched). */
  matched_rule: EngineRule | null;
  /** The winning observation (or null if rule says surface_disagreement / no clear winner). */
  resolved_observation: SourceObservation | null;
  /** Side-effects to emit (downstream code decides what to do with these). */
  side_effects: DisagreementSideEffect[];
  /** True when sources actually disagreed (i.e. not all identical). */
  had_disagreement: boolean;
  /** True if rule's `validator_chain_stage_5_hook` is set — Stage 5 should care. */
  stage_5_hook: boolean;
}

// ============================================================================
// INTERNAL: rule specificity scoring
// ============================================================================

/**
 * Score a rule's specificity relative to a target. Higher score = more specific.
 *   - 3 = exact entity AND exact field
 *   - 2 = exact entity, wildcard field
 *   - 1 = wildcard entity, exact field
 *   - 0 = wildcard entity AND wildcard field (or no fields at all)
 *
 * Wildcard rules are LESS specific than exact rules; among same specificity
 * tier, insertion order breaks the tie.
 */
function specificityScore(rule: EngineRule, target: string): number {
  const dotIndex = target.indexOf(".");
  const entity = dotIndex >= 0 ? target.slice(0, dotIndex) : target;
  const field = dotIndex >= 0 ? target.slice(dotIndex + 1) : undefined;
  const entityExact = rule.applies_to_entity === entity;
  const fieldExact = field !== undefined && rule.applies_to_field === field;
  if (entityExact && fieldExact) return 3;
  if (entityExact && rule.applies_to_field === "*") return 2;
  if (rule.applies_to_entity === "*" && fieldExact) return 1;
  return 0;
}

/**
 * From a list of matching rules, pick the most-specific one. Returns null on
 * empty input. Stable: among same specificity, the first rule by insertion
 * order wins.
 */
function pickMostSpecificRule(rules: EngineRule[], target: string): EngineRule | null {
  if (rules.length === 0) return null;
  let best = rules[0];
  let bestScore = specificityScore(best, target);
  for (let i = 1; i < rules.length; i++) {
    const score = specificityScore(rules[i], target);
    if (score > bestScore) {
      best = rules[i];
      bestScore = score;
    }
  }
  return best;
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Apply disagreement rules to a set of observations about `entity.field`.
 *
 * Returns a {@link DisagreementResolution} describing the matched rule (if
 * any), the resolved winner, and side-effects to emit. Caller decides what
 * to do with the side-effects (write to ledger, emit to player, log, etc.).
 */
export function applyDisagreementRules(
  registry: RuleRegistrySurface,
  target: string,
  observations: SourceObservation[],
): DisagreementResolution {
  // No-observations short-circuit
  if (observations.length === 0) {
    return {
      matched_rule: null,
      resolved_observation: null,
      side_effects: [],
      had_disagreement: false,
      stage_5_hook: false,
    };
  }

  // Detect disagreement — all values identical means no rule needed
  const firstValueStr = JSON.stringify(observations[0].value);
  const hadDisagreement = observations.some(
    (o) => JSON.stringify(o.value) !== firstValueStr,
  );

  // Phase 5c.x BUG-FIX: select by rule CLASS + specific-over-wildcard precedence.
  //
  // Why: registry.findRulesFor returns ALL rules whose entity/field match
  // (including wildcard "*" rules per ARD-017 future rule classes). Picking
  // rules[0] made resolution depend on registry insertion order — a wildcard
  // scene-routing rule registered before a specific disagreement rule would
  // be chosen for a disagreement resolution, which is semantically wrong.
  //
  // Selection contract:
  //   1. Filter to disagreement-class rules only (signature: has
  //      `resolution_strategy` string field — disambiguates from scene
  //      routing / validator chain configs / slide triggers / etc.)
  //   2. Among disagreement rules, prefer EXACT entity+field matches over
  //      wildcards. Order: (exact entity AND exact field) > (exact entity,
  //      wildcard field) > (wildcard entity, exact field) > both wildcard.
  //   3. Among rules at the same specificity tier, the first one (by
  //      insertion order) wins. v0.9 may extend with `priority` field per
  //      rule for explicit ordering.
  const all = registry.findRulesFor(target);
  const disagreementRules = all.filter(
    (r) => typeof r.resolution_strategy === "string",
  );
  const matched_rule = pickMostSpecificRule(disagreementRules, target);

  // No rule registered → return first observation as winner (engine default)
  if (!matched_rule) {
    return {
      matched_rule: null,
      resolved_observation: observations[0],
      side_effects: [],
      had_disagreement: hadDisagreement,
      stage_5_hook: false,
    };
  }

  // Apply resolution_strategy
  const resolutionStrategy = String(matched_rule.resolution_strategy ?? "");
  const fallbackStrategy = String(matched_rule.fallback_strategy ?? "surface_disagreement");
  const trustRanking = (matched_rule.trust_ranking ?? []) as Array<{
    source_kind: string;
    trust: number;
  }>;
  const trustMap = new Map(trustRanking.map((t) => [t.source_kind, t.trust]));

  let winner: SourceObservation | null = null;

  if (resolutionStrategy === "highest_trust_source") {
    let highestTrust = -Infinity;
    for (const obs of observations) {
      const t = trustMap.get(obs.source_kind) ?? -1;
      if (t > highestTrust) {
        highestTrust = t;
        winner = obs;
      }
    }
  } else if (resolutionStrategy === "most_recent_source") {
    // Caller must order observations newest-first for this strategy
    winner = observations[0];
  } else if (resolutionStrategy === "majority_consensus") {
    const tally = new Map<string, number>();
    for (const obs of observations) {
      const key = JSON.stringify(obs.value);
      tally.set(key, (tally.get(key) ?? 0) + 1);
    }
    let maxCount = 0;
    let majorityKey: string | null = null;
    let tied = false;
    for (const [key, count] of tally.entries()) {
      if (count > maxCount) {
        maxCount = count;
        majorityKey = key;
        tied = false;
      } else if (count === maxCount) {
        tied = true;
      }
    }
    if (majorityKey !== null && !tied) {
      winner = observations.find((o) => JSON.stringify(o.value) === majorityKey) ?? null;
    }
  }

  // If primary strategy didn't produce a winner, fall back
  if (!winner) {
    if (fallbackStrategy === "use_default") {
      // No semantic default at this layer; engine integration site supplies.
      winner = null;
    } else if (fallbackStrategy === "surface_disagreement") {
      winner = null; // explicitly no winner; side-effects below will surface
    }
  }

  // Compute side-effects — only emit when actual disagreement detected
  const sideEffects: DisagreementSideEffect[] = [];
  if (hadDisagreement) {
    const declared = (matched_rule.side_effects_on_disagreement ??
      []) as DisagreementSideEffect[];
    for (const eff of declared) {
      sideEffects.push({ ...eff });
    }
  }

  return {
    matched_rule,
    resolved_observation: winner,
    side_effects: sideEffects,
    had_disagreement: hadDisagreement,
    stage_5_hook: matched_rule.validator_chain_stage_5_hook === true,
  };
}
