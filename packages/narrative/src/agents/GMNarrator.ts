import type { GameState, TaleEntry, SuggestedAction } from "@first-perception/types";
import { getLogger } from "@first-perception/types";
import type {
  LLMClient,
  PromptBuilder,
  InkSynthesizerContext,
  InkSynthesizerOutput,
} from "@first-perception/llm-client";
import { inkSynthesizerTemplate } from "@first-perception/llm-client";
import { makeId } from "@first-perception/engine";

export interface GMNarrativeResult {
  text: string;
  tone: TaleEntry["tone"];
  choices: SuggestedAction[];
  tags: string[];
  taleEntry: TaleEntry;
}

export class GMNarrator {
  private client: LLMClient;
  private builder: PromptBuilder;

  constructor(options: { client: LLMClient; builder: PromptBuilder }) {
    this.client = options.client;
    this.builder = options.builder;
  }

  /**
   * Merge all narrative threads into a single coherent passage.
   */
  async mergeNarrative(options: {
    game: GameState;
    playerNarrative: string;
    npcNarratives: Array<{ npcName: string; text: string }>;
    worldEvents: Array<{ title: string; description: string }>;
    availableChoices: SuggestedAction[];
    currentTone: string;
  }): Promise<GMNarrativeResult> {
    const context: InkSynthesizerContext = {
      playerName: options.game.player.name,
      locationName: options.game.world.location,
      playerNarrative: options.playerNarrative,
      npcNarratives: options.npcNarratives,
      worldEvents: options.worldEvents,
      availableChoices: options.availableChoices.map((c) => ({
        label: c.label,
        command: c.command,
        condition: c.requires,
      })),
      currentTone: options.currentTone,
    };

    const request = this.builder.build(inkSynthesizerTemplate, context);

    try {
      const response = await this.client.complete(request);
      const output = inkSynthesizerTemplate.outputSchema.parse(response.content);

      const taleEntry: TaleEntry = {
        id: makeId("tale"),
        turn: options.game.turnCount,
        title: this._inferTitle(output.mergedText),
        body: output.mergedText,
        tone: output.tone,
        tags: output.tags,
      };

      return {
        text: output.mergedText,
        tone: output.tone,
        choices: output.choices.map((c) => ({
          label: c.label,
          command: c.command,
          domain: "lore",
          riskHint: c.condition,
        })),
        tags: output.tags,
        taleEntry,
      };
    } catch (err) {
      getLogger().warn("GMNarrator merge failed", { error: err });
      // Fallback: return player narrative as-is
      return {
        text: options.playerNarrative,
        tone: "quiet",
        choices: options.availableChoices,
        tags: [],
        taleEntry: {
          id: makeId("tale"),
          turn: options.game.turnCount,
          title: "Turn unfolds",
          body: options.playerNarrative,
          tone: "quiet",
          tags: [],
        },
      };
    }
  }

  private _inferTitle(text: string): string {
    // Extract first sentence or first 40 chars as title
    const firstSentence = text.split(/[.!?]/)[0]?.trim();
    if (firstSentence && firstSentence.length < 60) {
      return firstSentence;
    }
    return text.slice(0, 40) + "...";
  }
}
