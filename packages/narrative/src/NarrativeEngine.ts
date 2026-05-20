import { InkBridge } from "./InkBridge";
import { ContentLoader } from "./ContentLoader";
import type {
  GameState,
  SuggestedAction,
} from "@first-perception/types";
import type { NarrativeResult } from "./index.js";
import type { GameRepository, WorldEvent } from "@first-perception/persistence";
import { WorldMemoryCache } from "./WorldMemoryCache.js";

export class NarrativeEngine {
  private bridge: InkBridge;
  private currentKnot: string = "start";
  private stories: Record<string, Record<string, unknown>> = {};
  private loaded = false;
  private worldMemory: WorldMemoryCache;

  constructor() {
    this.bridge = new InkBridge();
    this.worldMemory = this.bridge.getWorldMemory();
  }

  /** Access the shared WorldMemoryCache. */
  getWorldMemory(): WorldMemoryCache {
    return this.worldMemory;
  }

  async initialize(): Promise<void> {
    this.stories = await ContentLoader.loadAll();
    const mainStory = this.stories["main"];
    if (!mainStory) {
      throw new Error("Main story not found in compiled content");
    }
    this.bridge.loadStory(mainStory);
    this.loaded = true;
  }

  enterScene(sceneId: string, gameState: GameState): NarrativeResult {
    this._ensureLoaded();
    this.bridge.bindGameState(gameState);
    this.currentKnot = sceneId;
    this.bridge.choosePath(sceneId);
    return this.bridge.continueStory() ?? this._emptyResult();
  }

  /**
   * Pre-warm the WorldMemoryCache before the next Ink continuation.
   * Reads recent world_event rows at the current location via repo and
   * stores a short, narrative-ready summary. Safe to call without a
   * repo — the cache just stays cold and Ink externals return their
   * deterministic fallback. Best-effort: any error is swallowed so a
   * persistence outage cannot block a turn.
   */
  async prepareWorldMemory(
    gameState: GameState,
    options: { repo?: GameRepository; recallLimit?: number } = {},
  ): Promise<void> {
    if (!options.repo) return;
    const limit = options.recallLimit ?? 5;
    try {
      const events = await options.repo.getEventsAtLocation(
        gameState.currentLocationId,
        limit,
      );
      this.worldMemory.setRecall(
        gameState.currentLocationId,
        summarizeEvents(events),
      );
    } catch {
      // Persistence outage — leave the cache cold so the fallback fires.
    }
  }

  processCommand(command: string, gameState: GameState): NarrativeResult {
    this._ensureLoaded();
    this.bridge.bindGameState(gameState);

    const lower = command.trim().toLowerCase();

    // Try to match current choices first
    const choices = this.bridge.getCurrentChoices();
    const choiceIndex = choices.findIndex(
      (c) => c.label.toLowerCase().includes(lower) || lower.includes(c.label.toLowerCase())
    );

    if (choiceIndex >= 0) {
      this.bridge.makeChoice(choiceIndex);
      return this.bridge.continueStory() ?? this._emptyResult();
    }

    // Fallback: keyword-based path selection
    const path = this._commandToPath(lower);
    if (path) {
      this.bridge.choosePath(path);
      return this.bridge.continueStory() ?? this._emptyResult();
    }

    // Generic fallback
    return this.bridge.continueStory() ?? this._emptyResult();
  }

  getSuggestions(gameState: GameState): SuggestedAction[] {
    this._ensureLoaded();
    this.bridge.bindGameState(gameState);
    return this.bridge.getCurrentChoices();
  }

  enterCombat(encounterId: string, gameState: GameState): NarrativeResult {
    this._ensureLoaded();
    this.bridge.bindGameState(gameState);
    this.bridge.choosePath(`combat_${encounterId}`);
    return this.bridge.continueStory() ?? this._emptyResult();
  }

  enterDialogue(npcId: string, gameState: GameState): NarrativeResult {
    this._ensureLoaded();
    this.bridge.bindGameState(gameState);
    this.bridge.choosePath(`dialogue_${npcId}`);
    return this.bridge.continueStory() ?? this._emptyResult();
  }

  triggerConsequence(consequenceId: string, gameState: GameState): NarrativeResult {
    this._ensureLoaded();
    this.bridge.bindGameState(gameState);
    this.bridge.choosePath(`consequence_${consequenceId}`);
    return this.bridge.continueStory() ?? this._emptyResult();
  }

  enterLegacy(gameState: GameState): NarrativeResult {
    this._ensureLoaded();
    this.bridge.bindGameState(gameState);
    this.bridge.choosePath("legacy_death");
    return this.bridge.continueStory() ?? this._emptyResult();
  }

  private _ensureLoaded(): void {
    if (!this.loaded) {
      throw new Error("NarrativeEngine not initialized. Call initialize() first.");
    }
  }

  private _commandToPath(command: string): string | null {
    if (command.includes("look") || command.includes("examine")) return "wait_and_watch";
    if (command.includes("listen")) return "arrival_listen";
    if (command.includes("rest")) return "rest";
    if (command.includes("speak") || command.includes("talk")) return "dialogue_sister_mourn";
    if (command.includes("approach") && command.includes("fountain")) return "fountain";
    if (command.includes("attack") || command.includes("fight")) return "combat_threat_emerges";
    if (command.includes("flee") || command.includes("hide")) return "combat_flee";
    return null;
  }

  private _emptyResult(): NarrativeResult {
    return {
      text: "",
      choices: [],
      tags: [],
    };
  }
}

/**
 * Turn a list of WorldEvent rows into a single recall string the Ink
 * runtime can splice into a passage. Caps at three events; if more
 * exist, hints that the location holds more than this. Style stays
 * cosmic-horror neutral so any scene can host it without rewriting.
 */
function summarizeEvents(events: readonly WorldEvent[]): string {
  if (events.length === 0) return "Nothing in particular comes to memory here.";
  const top = events
    .slice()
    .sort((a, b) => b.importance - a.importance || b.turnNumber - a.turnNumber)
    .slice(0, 3);
  const lines = top.map((e) => {
    const trimmed = e.description.trim();
    const single = trimmed.length > 140 ? trimmed.slice(0, 137) + "..." : trimmed;
    return `— ${single}`;
  });
  const overflow = events.length > top.length ? "\n— (and more, half-remembered)" : "";
  return `Something happened here, once.\n${lines.join("\n")}${overflow}`;
}
