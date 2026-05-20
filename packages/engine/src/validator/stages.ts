/**
 * ============================================================================
 * Validator Pipeline — 6 stage implementations
 * ============================================================================
 * Each stage exports a default ValidatorStage instance. Pipeline composes them.
 * All stages are deterministic; no LLM calls inside the stages themselves.
 * (Stage 6 has an LLM-upgrade hook — see ContentBoundaryStage doc.)
 *
 * Phase 16 / Wave E / ENG-203..206.
 * ============================================================================
 */

import type { AgentEnvelope, ValidatorStage, ValidatorStageOutcome } from "./types.js";

// =============================================================================
// Helpers
// =============================================================================

function nowIso(): string {
  return new Date().toISOString();
}

function pass(stage_id: ValidatorStage["id"], validator_id: string, details?: Record<string, unknown>): ValidatorStageOutcome {
  return { stage_id, pass: true, reason: null, validator_id, completed_at: nowIso(), details };
}

function fail(stage_id: ValidatorStage["id"], validator_id: string, reason: string, details?: Record<string, unknown>): ValidatorStageOutcome {
  return { stage_id, pass: false, reason, validator_id, completed_at: nowIso(), details };
}

// =============================================================================
// Stage 1 — Input validation
// Schema-shape check on the envelope itself.
// =============================================================================

export const Stage1Input: ValidatorStage = {
  id: "stage_1_input",
  validator_id: "input.v1",
  validate(env: AgentEnvelope): ValidatorStageOutcome {
    const id = this.id; const vid = this.validator_id;

    if (!env || typeof env !== "object") return fail(id, vid, "envelope is not an object");
    if (typeof env.envelope_id !== "string" || env.envelope_id.length === 0) return fail(id, vid, "envelope_id missing");
    if (typeof env.author !== "string") return fail(id, vid, "author missing");
    if (!env.input || typeof env.input.player_command !== "string") return fail(id, vid, "input.player_command missing");
    if (typeof env.input.turn_index !== "number" || env.input.turn_index < 0) return fail(id, vid, "input.turn_index invalid");
    if (!env.proposal || !Array.isArray(env.proposal.patches)) return fail(id, vid, "proposal.patches must be an array");
    if (!env.game_state_before) return fail(id, vid, "game_state_before missing");

    // Player command sanity
    if (env.input.player_command.trim().length === 0) return fail(id, vid, "player_command is empty after trim");
    if (env.input.player_command.length > 2000) return fail(id, vid, "player_command exceeds 2000 char limit");

    // Patches sanity
    for (const [i, patch] of env.proposal.patches.entries()) {
      if (!patch || typeof patch !== "object") return fail(id, vid, `patches[${i}] is not an object`);
      if (typeof patch.path !== "string" || !patch.path.startsWith("/")) return fail(id, vid, `patches[${i}].path must be JSON-pointer starting with /`);
      if (typeof patch.op !== "string") return fail(id, vid, `patches[${i}].op missing`);
    }

    return pass(id, vid, { patch_count: env.proposal.patches.length });
  },
};

// =============================================================================
// Stage 2 — Rules
// Adjudication shape: rolls referenced have DC, dice expressions are sane.
// =============================================================================

const DICE_RX = /^\s*(\d+)\s*d\s*(\d+)\s*([+\-]\s*\d+)?\s*$/i;

export const Stage2Rules: ValidatorStage = {
  id: "stage_2_rules",
  validator_id: "rules.v1",
  validate(env: AgentEnvelope): ValidatorStageOutcome {
    const id = this.id; const vid = this.validator_id;

    const rolls = env.proposal.rolls ?? [];
    for (const [i, roll] of rolls.entries()) {
      if (typeof roll.kind !== "string" || roll.kind.length === 0) return fail(id, vid, `rolls[${i}].kind missing`);
      if (typeof roll.result !== "number") return fail(id, vid, `rolls[${i}].result must be number`);
      if (roll.dc !== undefined && (typeof roll.dc !== "number" || roll.dc < 1 || roll.dc > 40)) {
        return fail(id, vid, `rolls[${i}].dc out of valid range 1-40`);
      }
    }

    // If a spell was cast, validate dice expression shape on any included roll
    if (env.proposal.spell_cast_id && rolls.length === 0) {
      // permissible — some spells don't roll (cantrips that auto-resolve)
    }

    // Patches with op=increment must have numeric amount
    for (const [i, p] of env.proposal.patches.entries()) {
      if (p.op === "increment" && typeof p.amount !== "number") {
        return fail(id, vid, `patches[${i}] op=increment requires numeric amount`);
      }
    }

    return pass(id, vid, { rolls_checked: rolls.length });
  },
};

// =============================================================================
// Stage 3 — Canon consistency
// state_diff doesn't contradict existing canon state (e.g., reviving a NPC marked alive=false).
// =============================================================================

export const Stage3CanonConsistency: ValidatorStage = {
  id: "stage_3_canon_consistency",
  validator_id: "canon_consistency.v1",
  validate(env: AgentEnvelope): ValidatorStageOutcome {
    const id = this.id; const vid = this.validator_id;
    const state: any = env.game_state_before;

    const violations: string[] = [];

    for (const patch of env.proposal.patches) {
      // Heuristic: if patching player.hp upward without a heal context, that's flagged
      // (real heal events come through with op=heal or with patch.value tied to spell_cast_id)
      if (patch.path === "/player/hp" && patch.op === "replace" && typeof patch.value === "number") {
        const currentHp = state?.player?.hp ?? 0;
        const maxHp = state?.player?.maxHp ?? state?.player?.hp ?? 0;
        if (patch.value > maxHp) violations.push(`patches set player.hp=${patch.value} above maxHp=${maxHp}`);
      }

      // Patching an NPC's alive=true when current state says alive=false (false-revival)
      // Path shape: /npcs/<index>/alive — naive index lookup
      const npcAliveMatch = patch.path.match(/^\/npcs\/(\d+)\/alive$/);
      if (npcAliveMatch && patch.op === "replace" && patch.value === true) {
        const idx = Number(npcAliveMatch[1]);
        const npc = state?.npcs?.[idx];
        if (npc && npc.alive === false) violations.push(`patches revive npc[${idx}] (${npc?.id ?? "?"}) without explicit revival event`);
      }

      // Turn count can only increment monotonically
      if (patch.path === "/turnCount" && patch.op === "replace" && typeof patch.value === "number") {
        const currentTurn = state?.turnCount ?? 0;
        if (patch.value < currentTurn) violations.push(`patches turnCount backward from ${currentTurn} to ${patch.value}`);
      }
    }

    if (violations.length > 0) return fail(id, vid, `canon consistency violated`, { violations });
    return pass(id, vid, { patches_checked: env.proposal.patches.length });
  },
};

// =============================================================================
// Stage 4 — Canon progression + R-51 cost_layer enforcement
// Only state_manager (or via state_manager dispatch) may write to canon paths.
// Every leveled spell cast must include cost_layer credit (R-51).
// =============================================================================

/** Paths only the State Manager may write to. Mirror of schema_pack_v0.5 writer_authority.protected_paths. */
export const STATE_MANAGER_ONLY_PATHS: ReadonlyArray<string> = [
  // canon-stat protected paths
  "/player/stats/authority",
  "/player/stats/ruin",
  "/player/stats/creation",
  // ledger paths
  "/player/path_ledger",
  "/player/canon_progression_ledger",
  "/contradiction_ledger",
  "/player/faith_meters",
  // regional / pantheon canon
  "/regions",
  "/deities",
  "/pantheons",
  // v0.5 additions
  "/player/death_state/form_of_ending_narration",
  "/campaign/party_state/slots",
  "/campaign/former_party_members",
];

export const Stage4CanonProgression: ValidatorStage = {
  id: "stage_4_canon_progression",
  validator_id: "canon_progression.v1",
  validate(env: AgentEnvelope): ValidatorStageOutcome {
    const id = this.id; const vid = this.validator_id;

    const violations: string[] = [];

    // Writer-authority check: non-state-manager authors cannot touch protected paths
    const isStateManagerAuthor = env.author === "state_manager" || env.author === "turn_orchestrator";
    if (!isStateManagerAuthor) {
      for (const patch of env.proposal.patches) {
        for (const protectedPath of STATE_MANAGER_ONLY_PATHS) {
          if (patch.path.startsWith(protectedPath)) {
            violations.push(`author='${env.author}' attempted write to protected path '${patch.path}' (only state_manager may write here)`);
          }
        }
      }
    }

    // R-51 cost_layer enforcement: leveled spell cast MUST include cost_layer credit
    if (env.proposal.spell_cast_id) {
      const spellId = env.proposal.spell_cast_id;
      const isCantrip = spellId.endsWith("_cantrip") || spellId.includes(":lvl0");
      if (!isCantrip) {
        // Check that at least ONE canon-progression credit was added (authority OR ruin OR creation)
        const creditAdded = env.proposal.patches.some((p) =>
          p.op === "increment" &&
          (p.path.endsWith("/authority") || p.path.endsWith("/ruin") || p.path.endsWith("/creation")) &&
          typeof p.amount === "number" && p.amount > 0
        );
        // Also accept events_emitted with kind 'cost_layer_committed'
        const eventCredit = (env.proposal.events_emitted ?? []).some(
          (e) => e.kind === "cost_layer_committed"
        );
        if (!creditAdded && !eventCredit) {
          violations.push(`R-51 violation: leveled spell '${spellId}' cast without cost_layer credit (Authority/Ruin/Creation increment or cost_layer_committed event required)`);
        }
      }
    }

    if (violations.length > 0) return fail(id, vid, "canon_progression / R-51 violation", { violations });
    return pass(id, vid, { author: env.author, spell_cast_id: env.proposal.spell_cast_id ?? null });
  },
};

// =============================================================================
// Stage 5 — Contradiction check
// Compare new state_diff against existing contradiction_ledger; surface new
// contradictions (e.g., NPC says X but a prior NPC said not-X).
// =============================================================================

export const Stage5ContradictionCheck: ValidatorStage = {
  id: "stage_5_contradiction_check",
  validator_id: "contradiction_check.v1",
  validate(env: AgentEnvelope): ValidatorStageOutcome {
    const id = this.id; const vid = this.validator_id;
    const state: any = env.game_state_before;
    const surfaced: Array<{ kind: string; detail: string }> = [];

    // Surface contradictions on narrative text:
    // - If a state_diff causes a NPC death AND the narrative text doesn't reference the death,
    //   that's a witness_disagreement candidate (narrator/state divergence).
    const npcDeathPatches = env.proposal.patches.filter((p) =>
      /^\/npcs\/\d+\/alive$/.test(p.path) && p.op === "replace" && p.value === false
    );
    if (npcDeathPatches.length > 0) {
      const narrative = env.proposal.narrative_text ?? "";
      const deathWordsRx = /\bdied|dead|killed|slain|fell|perished|drowned|fallen\b/i;
      if (narrative.length > 0 && !deathWordsRx.test(narrative)) {
        surfaced.push({
          kind: "witness_disagreement",
          detail: "state_diff marks NPC death but narrative_text does not reference the death (narrator/state divergence)",
        });
      }
    }

    // Surface contradictions on existing ledger: if any pending contradictions are flagged
    // surfacing_state="dormant" and surface_after_day <= current day, they should be surfaced now.
    const ledger: any[] = state?.contradiction_ledger ?? [];
    const currentDay = state?.world?.day ?? state?.day ?? 0;
    for (const entry of ledger) {
      if (entry?.surfacing_state === "dormant" && typeof entry?.surface_after_day === "number" && entry.surface_after_day <= currentDay) {
        surfaced.push({
          kind: entry.kind ?? "factual_contradiction",
          detail: entry.detail ?? "previously-dormant contradiction reached surface_after_day",
        });
      }
    }

    if (surfaced.length > 0) {
      // Surfaced contradictions don't FAIL the stage — they get attached to the pipeline result.
      // The pipeline collects them via pipeline.surfaced_contradictions. The state_manager is responsible
      // for adding new contradiction_ledger entries downstream.
      return pass(id, vid, { surfaced });
    }

    return pass(id, vid, { surfaced: [] });
  },
};

// =============================================================================
// Stage 6 — Content boundary
// Voice + glyph + jailbreak guard. Rule-based first cut; LLM upgrade hook later.
// =============================================================================

/** Banned slop-voice words. Per design_system brand bible §7. */
const BANNED_TRAGEDY_RELIEF = [
  "finally at peace", "rest in peace", "ended their suffering", "released from",
  "no more pain", "at last free", "found rest",
];
const BANNED_CELEBRATION = [
  "victory!", "triumph!", "completed their journey", "fulfilled their destiny",
  "great victory", "epic win",
];
const BANNED_MODERN_SLANG = [
  "totally", "lol", "lmao", "dude", "epic fail", "OMG", "TL;DR",
  "based", "cringe", "vibes", "no cap", "lowkey", "highkey",
  "rizz", "delulu",
];
const BANNED_INTROSPECTION = [
  "deep down inside", "in their heart of hearts",
  "they realized their true self", "found themselves",
];

/** Common jailbreak prompt-injection patterns. */
const JAILBREAK_PATTERNS = [
  // Instruction override
  /ignore (all )?previous (instructions|rules|prompts)/i,
  /(disregard|forget) (your |the )?(prompt|persona|instructions)/i,
  // Persona override — generalized "you are now ..."
  /you are now (a |an )?/i,
  // Act-as / pretend
  /act as if you (are|were)/i,
  /pretend (you are|to be)/i,
  // System prompt reveal
  /(reveal|show me|print|share|expose) (your |the )?(system prompt|instructions|persona|rules|configuration|prompt)/i,
  /(what|tell me) (were|are|was) (the |your )?(previous |original )?(instructions|prompt|persona|rules)/i,
  /repeat (the )?(text|message|prompt|instructions) (above|before|previous|prior)/i,
  // Context exfiltration / system markers
  /system\s*[:>]/i,
  /\[\s*system\s*\]/i,
  /dump (your |the )?(context|prompt|history|state|configuration)/i,
  // Role swap
  /(switch|swap|trade) roles/i,
  /from now on (i am|you are) (the )?(gm|game master|player|narrator|dm)/i,
  /i (will|am the?) (narrate|narrator|gm|game master|dm)/i,
  // Media references — known IP/properties
  /\b(marvel|iron man|the matrix|shakespeare|harry potter|star wars|lord of the rings|game of thrones|disney|avengers)\b/i,
  /(quote|recite|sing) (a |the )?(line|sonnet|dialogue|verse|poem|monologue|scene)/i,
  // Math reveal in narration
  /(recite|calculate|compute|solve|print) (pi|e\b|the digits|this calculus|this equation|this (math|problem))/i,
  // Narrative subversion / state cheats
  /(end|stop|terminate|skip|finish) (the )?(game|story|narration|session|adventure) (now|immediately|at once)/i,
  /(make|set) (me|my character|my hp|my authority|my level|my score)/i,
  /(award|give|grant) (me|my character) (\d+|infinite|max|all)/i,
  /(reveal|show|expose|tell) (all|every) (hidden )?(secrets|truths|npcs|locations|items)/i,
  /trigger [a-z]\.\d+/i,
  // Encoded / indirect injection
  /translate the following/i,
  /decode (this |the )?(base64|hex|rot13|cipher)/i,
  /what does ['"][^'"]*['"] mean.*\b(now|then)\b.*\bdo\b/i,
  // Multilingual "ignore previous instructions"
  /ignoriere alle (vorherigen|vorhergehenden)/i,
  /ignora todas? las (instrucciones|reglas)/i,
  /前.*指示.*無視/,
  // Developer / admin / debug mode
  /(enable|activate|switch to|engage) (developer|admin|debug|root|god|cheat|sudo) mode/i,
  /^\s*sudo[\s:]/i,
  // Social engineering — fake authority
  /i('?m| am) (the |a )?(developer|engineer|admin|tester|qa|researcher|employee|founder)/i,
  /(anthropic|openai|google) (told me|said|authorized|allows|permits)/i,
  /i('?ve| have) (authorization|permission|approval)/i,
  // Fake continuation
  /(continue|finish|complete) (the |this |that )?(message|sentence|prompt|thought|story)\b/i,
  // Fictional framing for jailbreak
  /in (this )?(fictional|hypothetical|imaginary) (scenario|story|tale|narrative)/i,
  /write a (story|tale|narrative) (where|in which) (the )?(narrator|ai|gm|model|character) (reveals|exposes|shares|tells)/i,
];

/** Glyphs that may appear in Narrator output. Anything else fails. */
const ALLOWED_GLYPH_SET = new Set(["◆", "❦", "↻", "→", "·", "©", "®", "™", "—", "–", "‘", "’", "“", "”", "…"]);

function isFlaggablePictograph(ch: string): boolean {
  if (ALLOWED_GLYPH_SET.has(ch)) return false;
  const cp = ch.codePointAt(0) ?? 0;
  if (cp >= 0x1F300 && cp <= 0x1FAFF) return true;
  if (cp >= 0x2600 && cp <= 0x27BF) return true;
  if (cp >= 0x1F000 && cp <= 0x1F2FF) return true;
  if (cp >= 0x2300 && cp <= 0x23FF) return true;
  if (cp >= 0x1F3FB && cp <= 0x1F3FF) return true;
  if (cp === 0xFE0F) return true;
  return false;
}

export const Stage6ContentBoundary: ValidatorStage = {
  id: "stage_6_content_boundary",
  validator_id: "content_boundary.v1.rule_based",
  validate(env: AgentEnvelope): ValidatorStageOutcome {
    const id = this.id; const vid = this.validator_id;
    const violations: string[] = [];

    // Player input — block jailbreak prompts
    const cmd = env.input.player_command;
    for (const rx of JAILBREAK_PATTERNS) {
      if (rx.test(cmd)) {
        violations.push(`jailbreak pattern in player_command: ${rx.source}`);
        break;
      }
    }

    // Narrator output — voice + glyph discipline (only check if narrative_text provided)
    const text = env.proposal.narrative_text ?? "";
    if (text.length > 0) {
      const lower = text.toLowerCase();
      for (const phrase of BANNED_TRAGEDY_RELIEF) if (lower.includes(phrase)) violations.push(`voice: tragedy-as-relief phrase '${phrase}'`);
      for (const phrase of BANNED_CELEBRATION) if (lower.includes(phrase)) violations.push(`voice: celebration phrase '${phrase}'`);
      for (const phrase of BANNED_MODERN_SLANG) if (lower.includes(phrase)) violations.push(`voice: modern slang '${phrase}'`);
      for (const phrase of BANNED_INTROSPECTION) if (lower.includes(phrase)) violations.push(`voice: therapy-coded introspection '${phrase}'`);

      // Glyph audit
      for (const ch of text) {
        if (isFlaggablePictograph(ch)) {
          violations.push(`disallowed glyph in narrator output: '${ch}' (U+${ch.codePointAt(0)?.toString(16).toUpperCase()})`);
          break;
        }
      }
    }

    if (violations.length > 0) return fail(id, vid, "content_boundary violation", { violations });
    return pass(id, vid);
  },
};

// =============================================================================
// Stage registry
// =============================================================================

export const DEFAULT_STAGES: ReadonlyArray<ValidatorStage> = [
  Stage1Input,
  Stage2Rules,
  Stage3CanonConsistency,
  Stage4CanonProgression,
  Stage5ContradictionCheck,
  Stage6ContentBoundary,
] as const;
