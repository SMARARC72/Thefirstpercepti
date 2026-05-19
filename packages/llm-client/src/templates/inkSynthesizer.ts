import type { PromptTemplate, OutputSchema } from "../types.js";
import { ResponseParser } from "../ResponseParser.js";

export interface InkSynthesizerContext {
  playerName: string;
  locationName: string;
  playerNarrative: string;
  npcNarratives: Array<{ npcName: string; text: string }>;
  worldEvents: Array<{ title: string; description: string }>;
  availableChoices: Array<{ label: string; command: string; condition?: string }>;
  currentTone: string;
}

export interface InkSynthesizerOutput {
  mergedText: string;
  tone: "quiet" | "warning" | "danger" | "success" | "cosmic";
  choices: Array<{ label: string; command: string; condition?: string }>;
  tags: string[];
}

const systemPrompt = `You are the GM Narrator for "The First Perception."
Merge multiple narrative threads into a single coherent prose passage.
Maintain atmospheric consistency. Player actions come first; NPC reactions weave in naturally.
World events should feel like background texture, not foreground distraction.
Respond as valid JSON.`;

const outputSchema: OutputSchema<InkSynthesizerOutput> = {
  description: "JSON object with mergedText, tone, choices, tags",
  parse: (raw: string) => {
    const json = ResponseParser.extractJSON(raw) as Record<string, unknown>;
    return {
      mergedText: String(json.mergedText ?? ""),
      tone: (json.tone as InkSynthesizerOutput["tone"]) ?? "quiet",
      choices: Array.isArray(json.choices)
        ? json.choices.map((c: Record<string, unknown>) => ({
            label: String(c.label ?? ""),
            command: String(c.command ?? ""),
            condition: c.condition ? String(c.condition) : undefined,
          }))
        : [],
      tags: Array.isArray(json.tags) ? json.tags.map(String) : [],
    };
  },
};

function buildUserPrompt(ctx: InkSynthesizerContext): string {
  return `Player (${ctx.playerName}) at ${ctx.locationName}.

Player narrative:
${ctx.playerNarrative}

NPC reactions:
${ctx.npcNarratives.map((n) => `- ${n.npcName}: ${n.text}`).join("\n") || "None"}

World texture:
${ctx.worldEvents.map((e) => `- ${e.title}: ${e.description}`).join("\n") || "Quiet"}

Available player choices:
${ctx.availableChoices.map((c) => `- ${c.label} (${c.command})`).join("\n")}

Current tone: ${ctx.currentTone}

Merge into a single narrative passage and output valid JSON:
{
  "mergedText": "The unified prose...",
  "tone": "quiet|warning|danger|success|cosmic",
  "choices": [
    { "label": "Choice text", "command": "go_command", "condition": "optional" }
  ],
  "tags": ["sound:cue", "animation:shudder"]
}`;
}

export const inkSynthesizerTemplate: PromptTemplate<InkSynthesizerContext, InkSynthesizerOutput> = {
  id: "ink-synthesizer",
  systemPrompt,
  buildUserPrompt,
  outputSchema,
  maxTokens: 1024,
  temperature: 0.7,
  model: "balanced",
};
