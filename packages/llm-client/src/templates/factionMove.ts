import type { PromptTemplate, OutputSchema } from "../types.js";
import { ResponseParser } from "../ResponseParser.js";

export interface FactionMoveContext {
  factionName: string;
  factionDescription: string;
  primaryGoal: string;
  powerLevel: number;
  wealthLevel: number;
  influenceLevel: number;
  playerReputation: number;
  recentEvents: string[];
  alliedFactions: string[];
  enemyFactions: string[];
  territories: string[];
  turnNumber: number;
}

export interface FactionMoveOutput {
  action: string;
  target?: string;
  description: string;
  narrativeImpact: string;
  playerFacingHint?: string;
}

const systemPrompt = `You are a faction strategy engine for a cosmic-horror RPG.
Determine what this faction does next based on its goals, resources, relationships, and recent events.
Actions should feel organic, not game-like. Factions make mistakes, change plans, and react to the world.
Respond as valid JSON.`;

const outputSchema: OutputSchema<FactionMoveOutput> = {
  description: "JSON object with action, target, description, narrativeImpact, optional playerFacingHint",
  parse: (raw: string) => {
    const json = ResponseParser.extractJSON(raw) as Record<string, unknown>;
    return {
      action: String(json.action ?? ""),
      target: json.target ? String(json.target) : undefined,
      description: String(json.description ?? ""),
      narrativeImpact: String(json.narrativeImpact ?? ""),
      playerFacingHint: json.playerFacingHint ? String(json.playerFacingHint) : undefined,
    };
  },
};

function buildUserPrompt(ctx: FactionMoveContext): string {
  return `Faction: ${ctx.factionName}
${ctx.factionDescription}
Goal: ${ctx.primaryGoal}
Power: ${ctx.powerLevel}/10 | Wealth: ${ctx.wealthLevel}/10 | Influence: ${ctx.influenceLevel}/10
Player reputation: ${ctx.playerReputation}/100
Allies: ${ctx.alliedFactions.join(", ") || "none"}
Enemies: ${ctx.enemyFactions.join(", ") || "none"}
Territories: ${ctx.territories.join(", ") || "none"}

Recent events:
${ctx.recentEvents.join("\n") || "Nothing significant"}

Turn ${ctx.turnNumber}. What does this faction do?

Respond as JSON:
{
  "action": "what they do",
  "target": "who/what they target",
  "description": "internal narrative of the action",
  "narrativeImpact": "how this changes the world",
  "playerFacingHint": "optional hint the player might perceive"
}`;
}

export const factionMoveTemplate: PromptTemplate<FactionMoveContext, FactionMoveOutput> = {
  id: "faction-move",
  systemPrompt,
  buildUserPrompt,
  outputSchema,
  maxTokens: 512,
  temperature: 0.7,
  model: "balanced",
};
