import type { GameState, LocationNode, NpcState, FactionState } from "@first-perception/types";
import type { GameRepository } from "@first-perception/persistence";

export interface WorldContext {
  campaign: {
    name: string;
    currentTurn: number;
    inGameDate: string;
    themes: string[];
    worldAge: number;
  };
  player: {
    name: string;
    form: string;
    stats: Record<string, number>;
    conditions: Array<{ name: string; description: string }>;
    location: string;
    region: string;
    reputation: Record<string, number>;
    recentActions: string[];
    hp: number;
    maxHp: number;
  };
  location: {
    name: string;
    description: string;
    danger: number;
    atmosphere: string;
    presentNPCs: Array<{ name: string; description: string; emotionalState: string }>;
    connectedLocations: string[];
  };
  nearbyNPCs: Array<{
    name: string;
    description: string;
    emotionalState: string;
    relationshipToPlayer: string;
    currentGoal: string;
    lastMetTurn: number;
  }>;
  factions: Array<{
    name: string;
    power: number;
    playerReputation: number;
    currentPlans: string;
    recentActions: string[];
  }>;
  recentEvents: Array<{ turn: number; verb: string; actor: string; target: string; description: string; importance: number }>;
  knownRumors: Array<{ content: string; truthLevel: number; spreadLevel: number }>;
  pendingConsequences: Array<{ description: string; delayTurns: number; effectType: string }>;
  recentPulses: Array<{ title: string; description: string; intensity: number }>;
}

export class WorldContextAssembler {
  private repository?: GameRepository;

  constructor(repository?: GameRepository) {
    this.repository = repository;
  }

  /**
   * Assemble full world context from GameState + optional SQLite repository.
   */
  async assemble(game: GameState): Promise<WorldContext> {
    const campaignId = game.seed.toString();
    const currentLocation = this._getCurrentLocation(game);
    const presentNPCs = this._getPresentNPCs(game);

    const recentEvents = this.repository
      ? await this.repository.getRecentEvents(campaignId, 10)
      : [];

    const knownRumors = this.repository
      ? await this.repository.getRumorsKnownToPlayer(campaignId)
      : [];

    return {
      campaign: {
        name: "The First Perception",
        currentTurn: game.turnCount,
        inGameDate: `Day ${game.day}, ${game.world.phaseName}`,
        themes: ["decay", "redemption", "cosmic horror"],
        worldAge: game.day,
      },
      player: {
        name: game.player.name,
        form: game.player.form,
        stats: game.player.stats ?? {},
        conditions: game.player.conditions.map((c) => ({
          name: c.name ?? String(c),
          description: c.description ?? "",
        })),
        location: game.world.location,
        region: game.world.region,
        reputation: this._buildReputation(game),
        recentActions: game.tale.slice(0, 5).map((t) => t.title),
        hp: game.player.hp,
        maxHp: game.player.maxHp,
      },
      location: {
        name: currentLocation?.name ?? game.world.location,
        description: currentLocation?.description ?? "",
        danger: currentLocation?.dangerBase ?? game.world.danger,
        atmosphere: currentLocation?.tags?.join(", ") ?? "quiet",
        presentNPCs: presentNPCs.map((n) => ({
          name: n.name,
          description: n.description ?? "",
          emotionalState: n.emotionalState ?? "neutral",
        })),
        connectedLocations: currentLocation?.exits?.map((e) => e.toLocationId) ?? [],
      },
      nearbyNPCs: this._getNearbyNPCs(game),
      factions: this._getFactions(game),
      recentEvents: recentEvents.map((e) => ({
        turn: e.turnNumber,
        verb: e.verb,
        actor: e.actorName ?? e.actorType,
        target: e.targetName ?? "none",
        description: e.description,
        importance: e.importance,
      })),
      knownRumors: knownRumors.map((r) => ({
        content: r.content,
        truthLevel: r.truthLevel,
        spreadLevel: r.spreadLevel,
      })),
      pendingConsequences: game.consequences.map((c) => ({
        description: c.narrative ?? "Unknown consequence",
        delayTurns: c.source?.turn ?? 0,
        effectType: c.type,
      })),
      recentPulses: [], // TODO: load from repository
    };
  }

  /**
   * Assemble context focused on a specific NPC (for NPC subagent prompts).
   */
  async assembleForNPC(game: GameState, npcId: string): Promise<{
    npc: {
      name: string;
      description: string;
      traits: string[];
      emotionalState: string;
      currentGoal: string;
      hp: number;
      maxHp: number;
      relationshipToPlayer: string;
      memories: string[];
    };
    location: WorldContext["location"];
    playerAction: string;
  }> {
    const npc = game.npcs.find((n) => n.id === npcId);
    if (!npc) throw new Error(`NPC ${npcId} not found`);

    const memories = this.repository
      ? await this.repository.getNPCMemories(npcId, { limit: 10, minImportance: 0.2 })
      : [];

    const currentLocation = this._getCurrentLocation(game);
    const presentNPCs = this._getPresentNPCs(game);

    return {
      npc: {
        name: npc.name,
        description: npc.description ?? "",
        traits: npc.desires ?? npc.fears ?? [],
        emotionalState: npc.emotionalState ?? "neutral",
        currentGoal: npc.wants ?? "survive",
        hp: npc.hp ?? 10,
        maxHp: npc.maxHp ?? 10,
        relationshipToPlayer: this._getRelationshipLabel(npc),
        memories: memories.map((m) => m.description),
      },
      location: {
        name: currentLocation?.name ?? game.world.location,
        description: currentLocation?.description ?? "",
        danger: currentLocation?.dangerBase ?? game.world.danger,
        atmosphere: currentLocation?.tags?.join(", ") ?? "quiet",
        presentNPCs: presentNPCs
          .filter((n) => n.id !== npcId)
          .map((n) => ({
            name: n.name,
            description: n.description ?? "",
            emotionalState: n.emotionalState ?? "neutral",
          })),
        connectedLocations: currentLocation?.exits?.map((e) => e.toLocationId) ?? [],
      },
      playerAction: game.tale[0]?.body ?? "The player stands nearby.",
    };
  }

  private _getCurrentLocation(game: GameState): LocationNode | undefined {
    return game.locations.find((l) => l.id === game.currentLocationId);
  }

  private _getPresentNPCs(game: GameState): NpcState[] {
    return game.npcs.filter((n) => n.locationId === game.currentLocationId && n.alive !== false);
  }

  private _getNearbyNPCs(game: GameState): WorldContext["nearbyNPCs"] {
    return game.npcs
      .filter((n) => n.alive !== false)
      .map((n) => ({
        name: n.name,
        description: n.description ?? "",
        emotionalState: n.emotionalState ?? "neutral",
        relationshipToPlayer: this._getRelationshipLabel(n),
        currentGoal: n.wants ?? "survive",
        lastMetTurn: 0,
      }));
  }

  private _getFactions(game: GameState): WorldContext["factions"] {
    return game.factions.map((f) => ({
      name: f.name,
      power: f.power ?? 5,
      playerReputation: f.trust ?? 0,
      currentPlans: f.plan ?? "maintain influence",
      recentActions: [],
    }));
  }

  private _getRelationshipLabel(npc: NpcState): string {
    const disp = npc.disposition ?? "neutral";
    switch (disp) {
      case "friendly": return "close ally";
      case "curious": return "interested";
      case "neutral": return "neutral";
      case "wary": return "suspicious";
      case "afraid": return "fearful";
      case "hostile": return "hostile";
      default: return "unknown";
    }
  }

  private _buildReputation(game: GameState): Record<string, number> {
    const rep: Record<string, number> = {};
    for (const faction of game.factions) {
      rep[faction.name] = faction.trust ?? 0;
    }
    for (const npc of game.npcs) {
      // NpcState doesn't have playerReputation, use disposition as proxy
      const dispositionMap: Record<string, number> = {
        friendly: 50, curious: 20, neutral: 0, wary: -20, afraid: -30, hostile: -60,
      };
      rep[npc.name] = dispositionMap[npc.disposition ?? "neutral"] ?? 0;
    }
    return rep;
  }
}
