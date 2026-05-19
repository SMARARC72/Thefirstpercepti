import type { PromptTemplate, OutputSchema } from "../types.js";
import { ResponseParser } from "../ResponseParser.js";

export interface SceneNarrativeContext {
  playerName: string;
  playerForm: string;
  locationName: string;
  locationDescription: string;
  atmosphere: string;
  dangerLevel: number;
  presentNPCs: Array<{ name: string; description: string; emotionalState: string }>;
  playerAction: string;
  recentEvents: string[];
  worldPhase: string;
}

export interface SceneNarrativeOutput {
  narrative: string;
  tone: "quiet" | "warning" | "danger" | "success" | "cosmic";
  tags: string[];
  soundCue?: string;
  animation?: string;
}

const systemPrompt = `You are the narrative engine for "The First Perception," a cosmic-horror solo RPG.
Write in a literary, atmospheric style. Second person present tense.
Ground every detail in sensory specifics. Never summarize — always render the moment.
Respond as valid JSON.`;

const outputSchema: OutputSchema<SceneNarrativeOutput> = {
  description: "JSON object with narrative, tone, tags, optional soundCue and animation",
  parse: (raw: string) => {
    const json = ResponseParser.extractJSON(raw) as Record<string, unknown>;
    return {
      narrative: String(json.narrative ?? ""),
      tone: (json.tone as SceneNarrativeOutput["tone"]) ?? "quiet",
      tags: Array.isArray(json.tags) ? json.tags.map(String) : [],
      soundCue: json.soundCue ? String(json.soundCue) : undefined,
      animation: json.animation ? String(json.animation) : undefined,
    };
  },
};

function buildUserPrompt(ctx: SceneNarrativeContext): string {
  const npcList = ctx.presentNPCs
    .map((n) => `- ${n.name}: ${n.description} (feeling ${n.emotionalState})`)
    .join("\n");

  return `World state:
- Location: ${ctx.locationName}
- Description: ${ctx.locationDescription}
- Atmosphere: ${ctx.atmosphere}
- Danger: ${ctx.dangerLevel}/10
- Time: ${ctx.worldPhase}

Present NPCs:
${npcList || "None"}

Recent events:
${ctx.recentEvents.join("\n") || "Nothing notable"}

Player (${ctx.playerName}, ${ctx.playerForm}) performs: ${ctx.playerAction}

Generate the narrative response as JSON:
{
  "narrative": "The prose...",
  "tone": "quiet|warning|danger|success|cosmic",
  "tags": ["tag1", "tag2"],
  "soundCue": "optional_sound_id",
  "animation": "optional_animation_id"
}`;
}

export const sceneNarrativeTemplate: PromptTemplate<SceneNarrativeContext, SceneNarrativeOutput> = {
  id: "scene-narrative",
  systemPrompt,
  buildUserPrompt,
  outputSchema,
  maxTokens: 512,
  temperature: 0.75,
  model: "balanced",
};
