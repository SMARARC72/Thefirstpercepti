import { Story } from "inkjs";
import type {
  GameState,
  SuggestedAction,
  TaleEntry,
  JournalEntry,
  TaleTone,
  Domain,
} from "@first-perception/types";
import type { NarrativeResult } from "./index.js";
import { createGameStateBindings } from "./bindings/gameStateBindings";
import { WorldMemoryCache } from "./WorldMemoryCache.js";

export class InkBridge {
  private story: Story | null = null;
  private externalFunctions: Map<string, (...args: unknown[]) => unknown> = new Map();
  private gameState: GameState | null = null;
  private gameStateRef: { current: GameState | null } = { current: null };
  private worldMemory: WorldMemoryCache = new WorldMemoryCache();
  private _journalBuffer: Array<{ label: string; detail: string }> = [];
  private _consequenceBuffer: string[] = [];
  private _gameBindingsRegistered = false;

  constructor() {}

  loadStory(storyJson: Record<string, unknown>): void {
    this.story = new Story(storyJson);
    this._registerGameStateBindings();
    for (const [name, fn] of this.externalFunctions) {
      try {
        this.story.BindExternalFunction(name, fn as (...args: unknown[]) => unknown);
      } catch {
        // Already bound, ignore
      }
    }
  }

  bindGameState(state: GameState): void {
    this.gameState = state;
    this.gameStateRef.current = state;
  }

  /**
   * Swap in a different WorldMemoryCache. Useful so the orchestrator
   * can share one cache instance across many InkBridges or pre-warm
   * the cache before the bridge runs Ink.
   */
  bindWorldMemory(cache: WorldMemoryCache): void {
    this.worldMemory = cache;
  }

  /** Direct access for orchestrator pre-warming (`setRecall`, etc.). */
  getWorldMemory(): WorldMemoryCache {
    return this.worldMemory;
  }

  choosePath(path: string): void {
    if (!this.story) throw new Error("Story not loaded");
    this.story.ChoosePathString(path);
  }

  makeChoice(index: number): void {
    if (!this.story) throw new Error("Story not loaded");
    this.story.ChooseChoiceIndex(index);
  }

  continueStory(): NarrativeResult | null {
    if (!this.story) throw new Error("Story not loaded");
    this._syncStateToInk();
    this._journalBuffer = [];
    this._consequenceBuffer = [];

    const segments: string[] = [];
    const allTags: string[] = [];
    let soundCue: string | undefined;
    let animation: string | undefined;
    const story = this.story;

    while (story.canContinue) {
      const text = story.Continue();
      if (text) segments.push(text);
      for (const tag of story.currentTags ?? []) {
        allTags.push(tag);
        const parsed = this._parseTag(tag);
        if (parsed.soundCue) soundCue = parsed.soundCue;
        if (parsed.animation) animation = parsed.animation;
        if (parsed.journal) this._journalBuffer.push(parsed.journal);
        if (parsed.consequence) this._consequenceBuffer.push(parsed.consequence);
      }
    }

    const text = segments.join("\n").trim();
    if (!text && this.story.currentChoices.length === 0) {
      return null;
    }

    const taleEntry: TaleEntry | undefined = text
      ? {
          id: this._uuid(),
          turn: this.gameState?.turnCount ?? 0,
          title: this._inferTitle(text),
          body: text,
          tone: this._inferTone(allTags),
          tags: allTags,
        }
      : undefined;

    const journalEntry: JournalEntry | undefined = this._buildJournalEntry();

    return {
      text,
      choices: this.getCurrentChoices(),
      tags: allTags,
      taleEntry,
      journalEntry,
      soundCue,
      animation,
      consequences: this._consequenceBuffer.length > 0 ? [...this._consequenceBuffer] : undefined,
    };
  }

  getCurrentChoices(): SuggestedAction[] {
    if (!this.story) return [];
    return this.story.currentChoices.map((choice) => this._enrichChoice(choice));
  }

  registerExternalFunction(name: string, fn: (...args: unknown[]) => unknown): void {
    this.externalFunctions.set(name, fn);
    if (this.story) {
      try {
        this.story.BindExternalFunction(name, fn as (...args: unknown[]) => unknown);
      } catch {
        // Already bound, ignore
      }
    }
  }

  evaluateFunction(name: string, args: unknown[]): unknown {
    if (!this.story) throw new Error("Story not loaded");
    const result = this.story.EvaluateFunction(name, args, true);
    if (result && typeof result === "object" && "returned" in result) {
      return (result as { returned: unknown }).returned;
    }
    return result;
  }

  private _syncStateToInk(): void {
    if (!this.story || !this.gameState) return;
    const s = this.story;
    const g = this.gameState;

    s.variablesState["player_name"] = g.player.name;
    s.variablesState["player_hp"] = g.player.hp;
    s.variablesState["player_max_hp"] = g.player.maxHp;
    s.variablesState["player_focus"] = g.player.focus;
    s.variablesState["player_max_focus"] = g.player.maxFocus;
    s.variablesState["player_form"] = g.player.form;
    s.variablesState["player_posture"] = g.player.posture;
    s.variablesState["player_domain"] = g.player.domain;

    const location = g.locations.find((l) => l.id === g.currentLocationId);
    const region = location ? g.regions.find((r) => r.id === location.regionId) : undefined;

    s.variablesState["world_danger"] = (location?.dangerBase ?? 0) + (region?.dangerModifier ?? 0);
    s.variablesState["world_location"] = location?.name ?? "Unknown";
    s.variablesState["world_region"] = region?.name ?? "Unknown";
    s.variablesState["world_day"] = g.day;
    s.variablesState["world_phase"] = g.phaseName;
    s.variablesState["turn_count"] = g.turnCount;
  }

  private _registerGameStateBindings(): void {
    if (!this.story || this._gameBindingsRegistered) return;
    const bindings = createGameStateBindings(this.gameStateRef, {
      onJournalEntry: (label: string, detail: string) =>
        this._journalBuffer.push({ label, detail }),
    });
    for (const [name, fn] of Object.entries(bindings)) {
      this.story.BindExternalFunction(name, fn as (...args: unknown[]) => unknown);
    }
    // Bind pure math helpers used in Ink scripts
    this.story.BindExternalFunction("min", (a: number, b: number) => Math.min(a, b));
    this.story.BindExternalFunction("max", (a: number, b: number) => Math.max(a, b));

    // Living World externals — sync reads from the WorldMemoryCache.
    // Async population happens in the orchestrator before continueStory().
    this.story.BindExternalFunction("recall", (...args: unknown[]) => {
      const locationId = String(args[0] ?? this.gameState?.currentLocationId ?? "");
      if (!locationId) return "";
      return this.worldMemory.getRecall(locationId);
    });
    this.story.BindExternalFunction("llm_generate", (...args: unknown[]) => {
      const prompt = String(args[0] ?? "");
      if (!prompt) return "";
      return this.worldMemory.getLLMGeneration(prompt);
    });

    this._gameBindingsRegistered = true;
  }

  private _enrichChoice(choice: { text: string; index: number; tags: string[] | null }): SuggestedAction {
    const tags = choice.tags ?? [];
    return {
      label: choice.text,
      command: choice.text.toLowerCase().trim(),
      domain: this._parseDomainTag(tags),
      riskHint: this._parseRiskTag(tags),
      requires: this._parseRequiresTag(tags),
    };
  }

  private _parseDomainTag(tags: string[]): Domain {
    const domainTag = tags.find((t) => t.startsWith("domain:"));
    const value = domainTag?.slice(7);
    const validDomains: Domain[] = [
      "physical",
      "social",
      "metaphysical",
      "combat",
      "craft",
      "stealth",
      "lore",
      "wilderness",
      "intrigue",
    ];
    return validDomains.includes(value as Domain) ? (value as Domain) : "physical";
  }

  private _parseRiskTag(tags: string[]): string | undefined {
    const tag = tags.find((t) => t.startsWith("risk:"));
    return tag ? tag.slice(5) : undefined;
  }

  private _parseRequiresTag(tags: string[]): string | undefined {
    const tag = tags.find((t) => t.startsWith("requires:"));
    return tag ? tag.slice(9) : undefined;
  }

  private _parseTag(tag: string): {
    soundCue?: string;
    animation?: string;
    journal?: { label: string; detail: string };
    consequence?: string;
  } {
    if (tag.startsWith("sound:")) return { soundCue: tag.slice(6) };
    if (tag.startsWith("animation:")) return { animation: tag.slice(10) };
    if (tag.startsWith("journal:")) {
      const parts = tag.slice(8).split("|");
      return { journal: { label: parts[0] ?? "", detail: parts[1] ?? "" } };
    }
    if (tag.startsWith("consequence:")) return { consequence: tag.slice(12) };
    return {};
  }

  private _inferTitle(text: string): string {
    const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 0);
    const first = sentences[0]?.trim() ?? "Event";
    return first.length > 40 ? first.slice(0, 37) + "..." : first;
  }

  private _inferTone(tags: string[]): TaleTone {
    if (tags.some((t) => t.includes("danger") || t.includes("combat"))) return "danger";
    if (tags.some((t) => t.includes("warning"))) return "warning";
    if (tags.some((t) => t.includes("success"))) return "success";
    if (tags.some((t) => t.includes("cosmic"))) return "cosmic";
    return "quiet";
  }

  private _buildJournalEntry(): JournalEntry | undefined {
    if (this._journalBuffer.length === 0) return undefined;
    const entry = this._journalBuffer[0];
    return {
      id: this._uuid(),
      turn: this.gameState?.turnCount ?? 0,
      label: entry.label,
      detail: entry.detail,
      category: "world",
    };
  }

  private _uuid(): string {
    if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
      return crypto.randomUUID();
    }
    return `id-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  }
}
