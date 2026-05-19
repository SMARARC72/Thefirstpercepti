import type { PromptTemplate, OutputSchema } from "../types.js";
import { ResponseParser } from "../ResponseParser.js";

export interface WorldEventContext {
  campaignName: string;
  currentTurn: number;
  inGameDate: string;
  themes: string[];
  factions: Array<{ name: string; power: number; recentAction: string }>;
  regions: Array<{ name: string; stability: number; corruption: number }>;
  recentPlayerActions: string[];
  activeRumors: string[];
}

export interface WorldEventOutput {
  events: Array<{
    title: string;
    description: string;
    type: "political" | "environmental" | "social" | "cosmic" | "economic";
    intensity: number;
    affectedRegion?: string;
    affectedFaction?: string;
  }>;
}

const systemPrompt = `You are the world simulation engine for a cosmic-horror RPG.
Generate 1-3 offscreen events that reflect the current state of the world.
Events should feel connected to player actions, faction dynamics, and world themes.
Some events should be subtle; some should be ominous.
Respond as valid JSON.`;

const outputSchema: OutputSchema<WorldEventOutput> = {
  description: "JSON object with array of events",
  parse: (raw: string) => {
    const json = ResponseParser.extractJSON(raw) as Record<string, unknown>;
    const events = Array.isArray(json.events) ? json.events : [];
    return {
      events: events.map((e: Record<string, unknown>) => ({
        title: String(e.title ?? "Unnamed event"),
        description: String(e.description ?? ""),
        type: (e.type as WorldEventOutput["events"][0]["type"]) ?? "social",
        intensity: Number(e.intensity ?? 1),
        affectedRegion: e.affectedRegion ? String(e.affectedRegion) : undefined,
        affectedFaction: e.affectedFaction ? String(e.affectedFaction) : undefined,
      })),
    };
  },
};

function buildUserPrompt(ctx: WorldEventContext): string {
  return `Campaign: ${ctx.campaignName}, Turn ${ctx.currentTurn}, ${ctx.inGameDate}
Themes: ${ctx.themes.join(", ")}

Factions:
${ctx.factions.map((f) => `- ${f.name} (power ${f.power}/10): ${f.recentAction}`).join("\n")}

Regions:
${ctx.regions.map((r) => `- ${r.name}: stability ${r.stability}, corruption ${r.corruption}`).join("\n")}

Player's recent actions:
${ctx.recentPlayerActions.join("\n") || "None recorded"}

Active rumors:
${ctx.activeRumors.join("\n") || "None circulating"}

Generate 1-3 offscreen world events as JSON:
{
  "events": [
    {
      "title": "Event headline",
      "description": "What happens",
      "type": "political|environmental|social|cosmic|economic",
      "intensity": 1-10,
      "affectedRegion": "optional",
      "affectedFaction": "optional"
    }
  ]
}`;
}

export const worldEventTemplate: PromptTemplate<WorldEventContext, WorldEventOutput> = {
  id: "world-event",
  systemPrompt,
  buildUserPrompt,
  outputSchema,
  maxTokens: 512,
  temperature: 0.8,
  model: "balanced",
};
