import type { GameState, NpcState, TaleEntry } from "@first-perception/types";
import type {
  KimiClient,
  PromptBuilder,
  NPCActionContext,
  NPCActionOutput,
  NPCDialogueContext,
  NPCDialogueOutput,
} from "@first-perception/llm-client";
import { npcActionTemplate, npcDialogueTemplate } from "@first-perception/llm-client";
import type { GameRepository } from "@first-perception/persistence";
import { makeId } from "@first-perception/engine";

export interface NPCActionResult {
  narrative: TaleEntry;
  patches: Array<{ path: string; op: string; value: unknown }>;
  memory?: {
    description: string;
    emotionalValence: number;
    emotionalIntensity: number;
    importanceScore: number;
  };
}

export class NPCSubagent {
  private npcId: string;
  private client: KimiClient;
  private builder: PromptBuilder;
  private repository?: GameRepository;

  constructor(options: {
    npcId: string;
    client: KimiClient;
    builder: PromptBuilder;
    repository?: GameRepository;
  }) {
    this.npcId = options.npcId;
    this.client = options.client;
    this.builder = options.builder;
    this.repository = options.repository;
  }

  /**
   * Decide what this NPC does in response to player action.
   */
  async decideAction(game: GameState, playerAction: string): Promise<NPCActionResult | null> {
    const npc = this._getNPC(game);
    if (!npc) return null;

    // Skip if NPC is not present or dead
    if (npc.alive === false) return null;
    if (npc.locationId !== game.currentLocationId) return null;

    const context = await this._buildActionContext(game, npc, playerAction);
    const request = this.builder.build(npcActionTemplate, context);

    try {
      const response = await this.client.complete(request);
      const decision = npcActionTemplate.outputSchema.parse(response.content);

      // Build result
      const result = this._resolveDecision(game, npc, decision);

      // Record memory if generated
      if (result.memory && this.repository) {
        await this.repository.addNPCMemory({
          memoryId: makeId("mem"),
          campaignId: game.seed.toString(),
          npcId: this.npcId,
          memoryType: "event",
          description: result.memory.description,
          emotionalValence: result.memory.emotionalValence,
          emotionalIntensity: result.memory.emotionalIntensity,
          importanceScore: result.memory.importanceScore,
          decayRate: 0.01,
          timesRecalled: 0,
          isForgotten: false,
          isCoreMemory: false,
          aboutEntityType: "player",
          aboutEntityId: game.player.id,
          formedTurn: game.turnCount,
          timestamp: Date.now(),
        });
      }

      return result;
    } catch (err) {
      console.warn(`NPCSubagent(${this.npcId}) decision failed:`, err);
      return null;
    }
  }

  /**
   * Generate dialogue from this NPC toward the player.
   */
  async generateDialogue(game: GameState, playerAction: string): Promise<string | null> {
    const npc = this._getNPC(game);
    if (!npc) return null;

    const context = await this._buildDialogueContext(game, npc, playerAction);
    const request = this.builder.build(npcDialogueTemplate, context);

    try {
      const response = await this.client.complete(request);
      const output = npcDialogueTemplate.outputSchema.parse(response.content);

      // Update emotional state if shifted
      if (output.emotionalShift && npc.emotionalState !== output.emotionalShift) {
        npc.emotionalState = output.emotionalShift;
      }

      // Record memory if generated
      if (output.memoryToRecord && this.repository) {
        await this.repository.addNPCMemory({
          memoryId: makeId("mem"),
          campaignId: game.seed.toString(),
          npcId: this.npcId,
          memoryType: "conversation",
          description: output.memoryToRecord,
          emotionalValence: 0,
          emotionalIntensity: 0.5,
          importanceScore: 0.4,
          decayRate: 0.01,
          timesRecalled: 0,
          isForgotten: false,
          isCoreMemory: false,
          aboutEntityType: "player",
          aboutEntityId: game.player.id,
          formedTurn: game.turnCount,
          timestamp: Date.now(),
        });
      }

      return output.dialogue;
    } catch (err) {
      console.warn(`NPCSubagent(${this.npcId}) dialogue failed:`, err);
      return null;
    }
  }

  private _getNPC(game: GameState): NpcState | undefined {
    return game.npcs.find((n) => n.id === this.npcId);
  }

  private async _buildActionContext(
    game: GameState,
    npc: NpcState,
    playerAction: string
  ): Promise<NPCActionContext> {
    const memories = this.repository
      ? await this.repository.getNPCMemories(this.npcId, { limit: 5, minImportance: 0.2 })
      : [];

    const presentNPCs = game.npcs
      .filter((n) => n.id !== this.npcId && n.locationId === game.currentLocationId && n.alive !== false)
      .map((n) => n.name);

    return {
      npcName: npc.name,
      npcDescription: npc.description ?? "",
      traits: npc.desires ?? npc.fears ?? [],
      emotionalState: npc.emotionalState ?? "neutral",
      currentGoal: npc.wants ?? "survive",
      hp: npc.hp ?? 10,
      maxHp: npc.maxHp ?? 10,
      relationshipToPlayer: npc.disposition ?? "neutral",
      memories: memories.map((m) => m.description),
      locationName: game.world.location,
      presentNPCs,
      playerAction,
      dangerLevel: game.world.danger,
    };
  }

  private async _buildDialogueContext(
    game: GameState,
    npc: NpcState,
    playerAction: string
  ): Promise<NPCDialogueContext> {
    const memories = this.repository
      ? await this.repository.getNPCMemories(this.npcId, { limit: 5, minImportance: 0.2 })
      : [];

    return {
      npcName: npc.name,
      npcDescription: npc.description ?? "",
      npcTraits: npc.desires ?? npc.fears ?? [],
      emotionalState: npc.emotionalState ?? "neutral",
      relationshipToPlayer: npc.disposition ?? "neutral",
      currentGoal: npc.wants ?? "survive",
      memories: memories.map((m) => m.description),
      playerName: game.player.name,
      playerAction,
      locationName: game.world.location,
    };
  }

  private _resolveDecision(
    game: GameState,
    npc: NpcState,
    decision: NPCActionOutput
  ): NPCActionResult {
    const patches: Array<{ path: string; op: string; value: unknown }> = [];
    let narrativeText = "";
    let tone: TaleEntry["tone"] = "quiet";

    switch (decision.action) {
      case "speak":
        narrativeText = `${npc.name} ${decision.dialogue ?? "says nothing"}`;
        tone = "quiet";
        break;
      case "move":
        if (decision.destination) {
          patches.push({ path: `/npcs/${game.npcs.indexOf(npc)}/locationId`, op: "replace", value: decision.destination });
          narrativeText = `${npc.name} moves toward ${decision.destination}.`;
        }
        tone = "quiet";
        break;
      case "act":
        narrativeText = `${npc.name} ${decision.reasoning ?? "acts"}.`;
        tone = "warning";
        break;
      case "react":
        narrativeText = `${npc.name} reacts to ${game.player.name}'s action.`;
        tone = "warning";
        break;
      case "observe":
        narrativeText = `${npc.name} watches carefully.`;
        tone = "quiet";
        break;
      case "scheme":
        narrativeText = `${npc.name} seems to be planning something.`;
        tone = "warning";
        break;
      default:
        narrativeText = `${npc.name} does nothing.`;
        tone = "quiet";
    }

    return {
      narrative: {
        id: makeId("npc-act"),
        turn: game.turnCount,
        title: `${npc.name} acts`,
        body: narrativeText,
        tone,
        tags: ["npc", decision.action],
      },
      patches,
      memory: {
        description: `${npc.name} observed the player ${decision.action} (${decision.reasoning})`,
        emotionalValence: this._emotionToValence(npc.emotionalState ?? "neutral"),
        emotionalIntensity: 0.5,
        importanceScore: 0.4,
      },
    };
  }

  private _emotionToValence(emotion: string): number {
    const map: Record<string, number> = {
      happy: 0.7,
      trusting: 0.5,
      neutral: 0,
      surprised: 0.1,
      afraid: -0.6,
      sad: -0.5,
      disgusted: -0.7,
      angry: -0.8,
    };
    return map[emotion.toLowerCase()] ?? 0;
  }
}
