import type { GameState, TaleEntry, SuggestedAction, StatePatch } from "@first-perception/types";
import { getLogger } from "@first-perception/types";
import type { LLMClient, PromptBuilder, WorldContextAssembler } from "@first-perception/llm-client";
import type { GameRepository } from "@first-perception/persistence";
import { NPCSubagent } from "./NPCSubagent.js";
import { GMNarrator } from "./GMNarrator.js";
import { FactionSubagent } from "./FactionSubagent.js";
import { makeId, ValidatorPipeline, type AgentEnvelope, type ValidatorPipelineResult } from "@first-perception/engine";

export interface TurnOrchestratorResult {
  taleEntry: TaleEntry;
  patches: StatePatch[];
  suggestedActions: SuggestedAction[];
  worldPulse?: {
    title: string;
    description: string;
    intensity: number;
  };
  tokensUsed: number;
  latencyMs: number;
  llmCallsMade: number;
  fallback: boolean;
  /** Phase 16 / Wave E: 6-stage validator result. Patches are cleared if overall_pass=false. */
  validationResult?: ValidatorPipelineResult;
}

export interface TurnOrchestratorOptions {
  client: LLMClient;
  builder: PromptBuilder;
  repository?: GameRepository;
  contextAssembler: WorldContextAssembler;
  maxLLMCallsPerTurn: number;
  maxLatencyMs: number;
  /** Max NPCs to activate per turn */
  maxActiveNPCs: number;
  /** Max factions to activate per turn */
  maxActiveFactions: number;
}

/**
 * Coordinates all LLM subagents for a single turn.
 *
 * Budget: ~10 LLM calls, <5s per turn.
 * When budget is exceeded or LLM unavailable, falls back to static narrative.
 */
export class TurnOrchestrator {
  private client: LLMClient;
  private builder: PromptBuilder;
  private repository?: GameRepository;
  private contextAssembler: WorldContextAssembler;
  private maxLLMCalls: number;
  private maxLatency: number;
  private maxActiveNPCs: number;
  private maxActiveFactions: number;

  private npcSubagents: Map<string, NPCSubagent> = new Map();
  private factionSubagents: Map<string, FactionSubagent> = new Map();
  private gmNarrator: GMNarrator;
  private validator: ValidatorPipeline;

  constructor(options: TurnOrchestratorOptions) {
    this.client = options.client;
    this.builder = options.builder;
    this.repository = options.repository;
    this.contextAssembler = options.contextAssembler;
    this.maxLLMCalls = options.maxLLMCallsPerTurn;
    this.maxLatency = options.maxLatencyMs;
    this.maxActiveNPCs = options.maxActiveNPCs;
    this.maxActiveFactions = options.maxActiveFactions;
    this.gmNarrator = new GMNarrator({ client: options.client, builder: options.builder });
    this.validator = new ValidatorPipeline();
  }

  /**
   * Refresh subagent instances to match current game state NPCs/factions.
   * Call this when game state changes significantly (new game, load, etc.)
   */
  syncAgents(game: GameState): void {
    // Reconcile NPC subagents
    const currentNpcIds = new Set(game.npcs.map((n) => n.id));
    for (const id of currentNpcIds) {
      if (!this.npcSubagents.has(id)) {
        this.npcSubagents.set(
          id,
          new NPCSubagent({
            npcId: id,
            client: this.client,
            builder: this.builder,
            repository: this.repository,
          })
        );
      }
    }
    for (const [id] of this.npcSubagents) {
      if (!currentNpcIds.has(id)) {
        this.npcSubagents.delete(id);
      }
    }

    // Reconcile faction subagents
    const currentFactionIds = new Set(game.factions.map((f) => f.id));
    for (const id of currentFactionIds) {
      if (!this.factionSubagents.has(id)) {
        this.factionSubagents.set(
          id,
          new FactionSubagent({
            factionId: id,
            client: this.client,
            builder: this.builder,
            repository: this.repository,
          })
        );
      }
    }
    for (const [id] of this.factionSubagents) {
      if (!currentFactionIds.has(id)) {
        this.factionSubagents.delete(id);
      }
    }
  }

  /**
   * Process a turn with LLM-driven living world.
   *
   * Phase 1: Activate present NPCs (decide actions)
   * Phase 2: Activate factions (advance plans, if applicable)
   * Phase 3: GM Narrator merges all threads into coherent passage
   */
  async processTurn(game: GameState, playerAction: string): Promise<TurnOrchestratorResult> {
    const turnStart = performance.now();
    let llmCallsMade = 0;
    let tokensUsed = 0;
    let fallback = false;

    // Quick health check
    if (!this._isClientHealthy()) {
      return this._fallbackResult(game, playerAction, "LLM client unavailable");
    }

    // Ensure agents match current game state
    this.syncAgents(game);

    // ── Phase 1: NPC Actions ──
    const presentNpcs = game.npcs
      .filter((n) => n.locationId === game.currentLocationId && n.alive !== false)
      .slice(0, this.maxActiveNPCs);

    const npcResults: Array<{
      npcName: string;
      text: string;
      patches: StatePatch[];
    }> = [];

    const npcPromises = presentNpcs.map(async (npc) => {
      const subagent = this.npcSubagents.get(npc.id);
      if (!subagent) return;
      if (llmCallsMade >= this.maxLLMCalls) return;

      try {
        const result = await this._withTimeout(
          subagent.decideAction(game, playerAction),
          3000
        );
        if (result) {
          llmCallsMade++;
          tokensUsed += this._estimateTokens(result.narrative.body);
          npcResults.push({
            npcName: npc.name,
            text: result.narrative.body,
            patches: result.patches as StatePatch[],
          });
        }
      } catch (err) {
        getLogger().warn("NPC subagent timed out or failed", { npcId: npc.id, error: err });
      }
    });

    await Promise.all(npcPromises);

    // Check budget before continuing
    if (performance.now() - turnStart > this.maxLatency * 0.6) {
      fallback = true;
    }

    // ── Phase 2: Faction Actions ──
    const factionResults: Array<{ title: string; description: string; intensity: number }> = [];

    if (!fallback && llmCallsMade < this.maxLLMCalls) {
      const activeFactions = game.factions.slice(0, this.maxActiveFactions);
      const factionPromises = activeFactions.map(async (faction) => {
        const subagent = this.factionSubagents.get(faction.id);
        if (!subagent) return;
        if (llmCallsMade >= this.maxLLMCalls) return;

        try {
          const result = await this._withTimeout(
            subagent.advancePlan(game),
            3000
          );
          if (result) {
            llmCallsMade++;
            tokensUsed += this._estimateTokens(result.narrative.body);
            if (result.worldPulse) {
              factionResults.push(result.worldPulse);
            }
          }
        } catch (err) {
          getLogger().warn("Faction subagent timed out or failed", { factionId: faction.id, error: err });
        }
      });

      await Promise.all(factionPromises);
    }

    // Check budget before GM merge
    if (performance.now() - turnStart > this.maxLatency * 0.8) {
      fallback = true;
    }

    // ── Phase 3: GM Narrator Merge ──
    let mergedText = "";
    let mergedTone: TaleEntry["tone"] = "quiet";
    let mergedChoices: SuggestedAction[] = [];
    let mergedTags: string[] = [];

    if (!fallback && llmCallsMade < this.maxLLMCalls) {
      try {
        const gmResult = await this._withTimeout(
          this.gmNarrator.mergeNarrative({
            game,
            playerNarrative: game.tale[0]?.body ?? playerAction,
            npcNarratives: npcResults.map((r) => ({ npcName: r.npcName, text: r.text })),
            worldEvents: factionResults.map((f) => ({
              title: f.title,
              description: f.description,
            })),
            availableChoices: game.suggestedActions,
            currentTone: game.tale[0]?.tone ?? "quiet",
          }),
          4000
        );
        if (gmResult) {
          llmCallsMade++;
          tokensUsed += this._estimateTokens(gmResult.text);
          mergedText = gmResult.text;
          mergedTone = gmResult.tone;
          mergedChoices = gmResult.choices;
          mergedTags = gmResult.tags;
        } else {
          fallback = true;
        }
      } catch (err) {
        getLogger().warn("GM Narrator merge failed", { error: err });
        fallback = true;
      }
    } else {
      fallback = true;
    }

    // ── Assemble result ──
    const latencyMs = Math.round(performance.now() - turnStart);

    if (fallback || !mergedText) {
      return this._fallbackResult(game, playerAction, "Budget exceeded or merge failed");
    }

    // Collect patches from NPC actions
    const allPatches: StatePatch[] = [];
    for (const r of npcResults) {
      allPatches.push(...r.patches);
    }

    const taleEntry: TaleEntry = {
      id: makeId("llm"),
      turn: game.turnCount,
      title: this._inferTitle(mergedText),
      body: mergedText,
      tone: mergedTone,
      tags: ["llm", ...mergedTags],
    };

    // Log to repository
    if (this.repository) {
      try {
        await this.repository.logAgentAction({
          agentLogId: makeId("log"),
          campaignId: game.seed.toString(),
          agentType: "gm_narrator",
          agentId: "gm",
          actionTaken: "merge_narrative",
          reasoning: `NPCs: ${npcResults.length}, Factions: ${factionResults.length}`,
          inputContext: JSON.stringify({ playerAction, presentNPCs: presentNpcs.length }),
          outputResult: JSON.stringify({ textLength: mergedText.length, patches: allPatches.length }),
          tokensUsed,
          latencyMs,
          timestamp: Date.now(),
        });
      } catch {
        // Logging failure is non-critical
      }
    }

    // ── Phase 16 / Wave E: 6-stage validator chain ──
    // Run validator on the proposed envelope before returning. If overall_pass=false,
    // clear patches (don't commit) but still return narrative + tale entry so the
    // player sees the scene; the validation failure is attached for the caller to render.
    const envelope: AgentEnvelope = {
      envelope_id: makeId(),
      author: "turn_orchestrator",
      input: { player_command: playerAction, player_id: game.player.id, turn_index: game.turnCount ?? 0 },
      proposal: {
        patches: allPatches,
        narrative_text: taleEntry.body ?? taleEntry.title ?? "",
      },
      game_state_before: game,
    };
    const validationResult = this.validator.process(envelope);
    const safePatches = validationResult.overall_pass ? allPatches : [];
    if (!validationResult.overall_pass) {
      try {
        getLogger().warn("validator chain rejected turn", {
          failed_at_stage: validationResult.failed_at_stage,
          envelope_id: envelope.envelope_id,
        });
      } catch { /* logging is best-effort */ }
    }

    return {
      taleEntry,
      patches: safePatches,
      suggestedActions: mergedChoices.length > 0 ? mergedChoices : game.suggestedActions,
      worldPulse: factionResults[0],
      tokensUsed,
      latencyMs,
      llmCallsMade,
      fallback: false,
      validationResult,
    };
  }

  private _isClientHealthy(): boolean {
    // LLMClient implementations don't expose circuit state directly, but we can infer from
    // whether the client exists. If API key is missing, complete() will fail fast.
    return true; // Actual failures are caught per-call
  }

  private _fallbackResult(
    game: GameState,
    playerAction: string,
    _reason: string
  ): TurnOrchestratorResult {
    // Fallback details are returned in the TurnOrchestratorResult and
    // surfaced by the caller; intentionally not logged from here so the
    // happy-path doesn't spam the console.
    return {
      taleEntry: {
        id: makeId("fb"),
        turn: game.turnCount,
        title: "Turn unfolds",
        body: game.tale[0]?.body ?? `You ${playerAction}.`,
        tone: game.tale[0]?.tone ?? "quiet",
        tags: ["fallback"],
      },
      patches: [],
      suggestedActions: game.suggestedActions,
      tokensUsed: 0,
      latencyMs: 0,
      llmCallsMade: 0,
      fallback: true,
    };
  }

  private async _withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
    return Promise.race([
      promise,
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error("Timeout")), ms)
      ),
    ]);
  }

  private _estimateTokens(text: string): number {
    // Rough heuristic: 1 token ≈ 4 chars for English/Chinese mixed
    return Math.ceil(text.length / 4);
  }

  private _inferTitle(text: string): string {
    const firstSentence = text.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length < 60) {
      return firstSentence;
    }
    return text.slice(0, 40) + "...";
  }
}
