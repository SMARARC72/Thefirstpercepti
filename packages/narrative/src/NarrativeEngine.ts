import { InkBridge } from "./InkBridge";
import { ContentLoader } from "./ContentLoader";
import type {
  GameState,
  SuggestedAction,
} from "@first-perception/types";
import type { NarrativeResult } from "./index.js";

export class NarrativeEngine {
  private bridge: InkBridge;
  private currentKnot: string = "start";
  private stories: Record<string, Record<string, unknown>> = {};
  private loaded = false;

  constructor() {
    this.bridge = new InkBridge();
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
