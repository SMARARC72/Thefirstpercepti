import type { PromptTemplate, OutputSchema } from "../types.js";
import { ResponseParser } from "../ResponseParser.js";

export interface NPCActionContext {
  npcName: string;
  npcDescription: string;
  traits: string[];
  emotionalState: string;
  currentGoal: string;
  hp: number;
  maxHp: number;
  relationshipToPlayer: string;
  memories: string[];
  locationName: string;
  presentNPCs: string[];
  playerAction: string;
  dangerLevel: number;
}

export interface NPCActionOutput {
  action: "speak" | "move" | "act" | "observe" | "scheme" | "react" | "do_nothing";
  target?: string;
  destination?: string;
  reasoning: string;
  dialogue?: string;
}

const systemPrompt = `You are the decision engine for an NPC in a cosmic-horror RPG.
Choose ONE action that best reflects this NPC's personality, goals, and current situation.
Actions must be grounded in the world state. Be decisive.
Respond as valid JSON.`;

const outputSchema: OutputSchema<NPCActionOutput> = {
  description: "JSON object with action, target, destination, reasoning, optional dialogue",
  parse: (raw: string) => {
    const json = ResponseParser.extractJSON(raw) as Record<string, unknown>;
    return {
      action: (json.action as NPCActionOutput["action"]) ?? "do_nothing",
      target: json.target ? String(json.target) : undefined,
      destination: json.destination ? String(json.destination) : undefined,
      reasoning: String(json.reasoning ?? ""),
      dialogue: json.dialogue ? String(json.dialogue) : undefined,
    };
  },
};

function buildUserPrompt(ctx: NPCActionContext): string {
  return `NPC: ${ctx.npcName}, ${ctx.npcDescription}
Traits: ${ctx.traits.join(", ")}
Emotional state: ${ctx.emotionalState}
Goal: ${ctx.currentGoal}
HP: ${ctx.hp}/${ctx.maxHp}
Relationship with player: ${ctx.relationshipToPlayer}
Location: ${ctx.locationName}
Present: ${ctx.presentNPCs.join(", ") || "no one"}
Danger level: ${ctx.dangerLevel}/10

Memories:
${ctx.memories.join("\n") || "None"}

The player just: ${ctx.playerAction}

Choose ONE action from: speak, move, act, observe, scheme, react, do_nothing

Respond as JSON:
{
  "action": "speak|move|act|observe|scheme|react|do_nothing",
  "target": "who this targets, if any",
  "destination": "where to move, if moving",
  "reasoning": "brief internal reasoning",
  "dialogue": "optional spoken line"
}`;
}

export const npcActionTemplate: PromptTemplate<NPCActionContext, NPCActionOutput> = {
  id: "npc-action",
  systemPrompt,
  buildUserPrompt,
  outputSchema,
  maxTokens: 256,
  temperature: 0.6,
  model: "fast",
};
