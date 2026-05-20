import type { GameState, FactionState, TaleEntry } from "@first-perception/types";
import type {
  KimiClient,
  PromptBuilder,
  FactionMoveContext,
  FactionMoveOutput,
} from "@first-perception/llm-client";
import { factionMoveTemplate } from "@first-perception/llm-client";
import type { GameRepository } from "@first-perception/persistence";
import { makeId } from "@first-perception/engine";

export interface FactionActionResult {
  narrative: TaleEntry;
  worldPulse?: {
    title: string;
    description: string;
    intensity: number;
  };
}

export class FactionSubagent {
  private factionId: string;
  private client: KimiClient;
  private builder: PromptBuilder;
  private repository?: GameRepository;

  constructor(options: {
    factionId: string;
    client: KimiClient;
    builder: PromptBuilder;
    repository?: GameRepository;
  }) {
    this.factionId = options.factionId;
    this.client = options.client;
    this.builder = options.builder;
    this.repository = options.repository;
  }

  async advancePlan(game: GameState): Promise<FactionActionResult | null> {
    const faction = this._getFaction(game);
    if (!faction) return null;

    // Factions act every 3-5 turns based on seed
    const actFrequency = 3 + (game.seed % 3);
    if (game.turnCount % actFrequency !== 0) return null;

    const context = this._buildContext(game, faction);
    const request = this.builder.build(factionMoveTemplate, context);

    try {
      const response = await this.client.complete(request);
      const move = factionMoveTemplate.outputSchema.parse(response.content);

      return this._resolveMove(game, faction, move);
    } catch (err) {
      console.warn(`FactionSubagent(${this.factionId}) failed:`, err);
      return null;
    }
  }

  private _getFaction(game: GameState): FactionState | undefined {
    return game.factions.find((f) => f.id === this.factionId);
  }

  private _buildContext(game: GameState, faction: FactionState): FactionMoveContext {
    const recentEvents: string[] = [];
    if (this.repository) {
      // Would load recent faction-related events
    }

    return {
      factionName: faction.name,
      factionDescription: faction.description ?? "",
      primaryGoal: faction.plan ?? "maintain influence",
      powerLevel: faction.power ?? 5,
      wealthLevel: 5,
      influenceLevel: 5,
      playerReputation: faction.trust ?? 0,
      recentEvents,
      alliedFactions: [],
      enemyFactions: [],
      territories: faction.controlledLocations ?? [],
      turnNumber: game.turnCount,
    };
  }

  private _resolveMove(
    game: GameState,
    faction: FactionState,
    move: FactionMoveOutput
  ): FactionActionResult {
    const narrative: TaleEntry = {
      id: makeId("fac"),
      turn: game.turnCount,
      title: `${faction.name} moves`,
      body: move.narrativeImpact || `${faction.name} ${move.action}.`,
      tone: "warning",
      tags: ["faction", move.action],
    };

    return {
      narrative,
      worldPulse: move.playerFacingHint
        ? {
            title: `${faction.name}: ${move.action}`,
            description: move.playerFacingHint,
            intensity: 3,
          }
        : undefined,
    };
  }
}
