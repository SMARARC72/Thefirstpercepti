import type { PromptTemplate, OutputSchema } from "../types.js";
import { ResponseParser } from "../ResponseParser.js";

export interface NPCDialogueContext {
  npcName: string;
  npcDescription: string;
  npcTraits: string[];
  emotionalState: string;
  relationshipToPlayer: string;
  currentGoal: string;
  memories: string[];
  playerName: string;
  playerAction: string;
  locationName: string;
}

export interface NPCDialogueOutput {
  dialogue: string;
  emotionalShift?: string;
  memoryToRecord?: string;
}

const systemPrompt = `You are an NPC in a cosmic-horror RPG. Respond in character.
Your voice should reflect your personality, current emotional state, and relationship with the player.
Be concise but atmospheric. 1-3 sentences maximum.
Respond as valid JSON.`;

const outputSchema: OutputSchema<NPCDialogueOutput> = {
  description: "JSON object with dialogue, optional emotionalShift and memoryToRecord",
  parse: (raw: string) => {
    const json = ResponseParser.extractJSON(raw) as Record<string, unknown>;
    return {
      dialogue: String(json.dialogue ?? ""),
      emotionalShift: json.emotionalShift ? String(json.emotionalShift) : undefined,
      memoryToRecord: json.memoryToRecord ? String(json.memoryToRecord) : undefined,
    };
  },
};

function buildUserPrompt(ctx: NPCDialogueContext): string {
  return `You are ${ctx.npcName}, ${ctx.npcDescription}.
Traits: ${ctx.npcTraits.join(", ")}
Current emotional state: ${ctx.emotionalState}
Relationship with ${ctx.playerName}: ${ctx.relationshipToPlayer}
Your current goal: ${ctx.currentGoal}

Relevant memories:
${ctx.memories.join("\n") || "No strong memories"}

Location: ${ctx.locationName}

${ctx.playerName} just: ${ctx.playerAction}

Respond as JSON:
{
  "dialogue": "Your spoken response...",
  "emotionalShift": "optional new emotional state",
  "memoryToRecord": "optional memory to record about this interaction"
}`;
}

export const npcDialogueTemplate: PromptTemplate<NPCDialogueContext, NPCDialogueOutput> = {
  id: "npc-dialogue",
  systemPrompt,
  buildUserPrompt,
  outputSchema,
  maxTokens: 256,
  temperature: 0.8,
  model: "fast",
};
