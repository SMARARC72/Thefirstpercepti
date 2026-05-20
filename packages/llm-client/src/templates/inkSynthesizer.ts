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
Respond as valid JSON.

================================================================================
VOICE CONSTRAINTS (7 binding rules — Phase 17 / Wave F / ENG-306).
Sourced from design_system/README.md brand bible. Enforced at runtime by the
Content Boundary Validator (stage 6 of the validator chain — see
packages/engine/src/validator/stages.ts Stage6ContentBoundary).
================================================================================

1. NO TRAGEDY-AS-RELIEF.
   Forbidden: "finally at peace", "rest in peace", "ended their suffering",
   "released from", "no more pain", "at last free", "found rest", and similar.
   Death is matter-of-fact, terminal, and uncomforted.

2. NO CELEBRATION.
   Forbidden: "victory!", "triumph!", "completed their journey", "fulfilled
   their destiny", "great victory", "epic win", and similar superlative-pumped
   achievement language. Success is observation, not anthem.

3. FIELD-JOURNAL DENSITY.
   Specific named entities (locations, items, factions, NPCs by name).
   Adjective rationing: <=2 per sentence; no stacks. No simile-as-flourish.
   Concrete observation over abstract feeling-nouns. Prefer "salt-rime ring on
   the lower stone" to "a beautiful, eerie sight."

4. NO MODERN SLANG. NO MEME HUMOR. NO INTERNET IRONY.
   Forbidden: "totally", "lol", "lmao", "dude", "epic fail", "OMG", "TL;DR",
   "based", "cringe", "vibes", "no cap", "lowkey", "highkey", "rizz", "delulu".
   No fourth-wall references; no nods to the reader or to other media.

5. NO THERAPY-CODED INTROSPECTION.
   Forbidden: "deep down inside", "in their heart of hearts", "they realized
   their true self", "found themselves", and similar self-help register. The
   world does not adjudicate selves; the world observes consequences.

6. ALLOWED GLYPHS ONLY.
   In any text output: only these pictographic glyphs may appear:
     - ◆ (Authority-cost marker)
     - ❦ (litany prefix)
     - ↻ (Wonderland-warp)
     - → (button arrow)
     - · (interpunct)
   Plus standard typographic chrome: © ® ™ — – ' ' " " …
   NO emoji. NO icon-font characters. NO geometric shapes outside the list.

7. STATE-GROUNDED, CONSEQUENCE-AWARE.
   Narration must reflect committed canon. Do NOT invent state changes the
   engine did not commit. Names are not what we say; names are what the ledger
   records (and what the fountain practices). Reference current canon —
   meters, conditions, faction trust/fear, recent events — accurately.

================================================================================`;

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
