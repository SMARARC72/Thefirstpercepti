import "@first-perception/ui-system/styles.css";
import "./styles.css";

import type { AppState, GameTab, GameState, ActionResult, StatePatch, Legacy } from "@first-perception/types";
import { getLogger } from "@first-perception/types";
import {
  blankCreation,
  clearSavedGame,
  createGameFromCreation,
  createInitialState,
  hasSavedGame,
  loadAppState,
  saveAppState,
  updateDocumentTitle,
  advanceAmbientTime,
  renderStateToText,
} from "./game";
import { createStore } from "./stores/gameStore";
import { TitleScreen } from "./screens/TitleScreen";
import { CreationScreen } from "./screens/CreationScreen";
import { GameplayScreen } from "./screens/GameplayScreen";
import { DeathScreen } from "./screens/DeathScreen";
import { LegacyScreen } from "./screens/LegacyScreen";
import { SettingsModal } from "./screens/SettingsModal";
import { screenTransition } from "./effects/transitions";
import { setReducedMotion, setHighContrast, setFontSize } from "@first-perception/ui-system";
import { AudioEngine } from "@first-perception/audio";
import { NarrativeEngine, TurnOrchestrator } from "@first-perception/narrative";
import {
  SeededRNG,
  applyPatches,
  parseCommand,
  moveReducer,
  combatReducer,
  restReducer,
  itemReducer,
  dialogueReducer,
  investigationReducer,
  conditionReducer,
  deathReducer,
  LegacySystem,
  makeId,
} from "@first-perception/engine";
import {
  HttpRepository,
  LocalStorageRepository,
  type GameRepository,
} from "@first-perception/persistence";
import {
  ProxyLLMClient,
  PromptBuilder,
  WorldContextAssembler,
  IntentClassifier,
  type LLMClient,
} from "@first-perception/llm-client";
import { buildWorldEvent, buildFactionWorldEvent, deriveCampaignId } from "./data/worldEvents";

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
  }
}

// IDB save-slot CRUD lives in ./data/idbSaves; legacy ledger in
// ./data/legacyHistory. They were inlined here before the Phase 5 split.
import { getSaveSlots, writeSaveSlot, deleteSaveSlot, readSaveSlot } from "./data/idbSaves";
import { loadLegacyHistory, saveLegacyHistory } from "./data/legacyHistory";

// ── Persistence + LLM layer instances ──
// repo prefers the server-backed HTTP API; falls back to localStorage if
// the API is unreachable. Either implementation satisfies GameRepository.
let repo: GameRepository | null = null;
let llmClient: LLMClient | null = null;
let promptBuilder: PromptBuilder | null = null;
let contextAssembler: WorldContextAssembler | null = null;
let turnOrchestrator: TurnOrchestrator | null = null;

const appRoot = document.querySelector<HTMLDivElement>("#app");
if (!appRoot) throw new Error("App root not found");

const store = createStore<AppState>(createBootState());
let currentScreen: { destroy: () => void; element: HTMLElement; update?(props: Record<string, unknown>): void } | null = null;
let settingsModal: SettingsModal | null = null;

// ── Engine instances ──
const audioEngine = new AudioEngine();
const narrativeEngine = new NarrativeEngine();
let narrativeReady = false;

// Intent classifier — uses the LLM proxy when enabled, falls back to
// regex when not. Constructed once and re-wired with a client whenever
// the Living World toggle flips.
let intentClassifier = new IntentClassifier();

function createBootState(): AppState {
  const next = createInitialState();
  const params = new URLSearchParams(window.location.search);
  if (params.get("demo") !== "1") return next;

  const creation = {
    ...blankCreation(),
    step: 5 as const,
    name: "No One",
    form: "spirit_bound" as const,
    formDescription: "A second shadow answers half a breath late.",
    perception: "A dry footprint at the edge of a fountain that has been underwater for years.",
    dominantSense: "sight",
    capabilityClaim: "I can hear the shape of a lie before it becomes language.",
    primaryDomain: "lore" as const,
    posture: "witness" as const,
    postureDescription: "Record first. Intervene only when the record would become an excuse.",
    optionalDetails: "The name No One was given as punishment and kept as armor.",
    desiredItem: "a cracked brass lens",
    fear: "being remembered incorrectly",
    leftBehind: "a room full of sleeping bells",
  };

  return {
    ...next,
    screen: "gameplay",
    creation,
    game: createGameFromCreation(creation),
    activeTab: "tale",
    feedback: "Demo run loaded for local verification.",
  };
}

// IDB save-slot CRUD + legacy ledger moved to ./data/idbSaves and
// ./data/legacyHistory respectively (Phase 5 decomposition).

function autoSaveIfNeeded(state: AppState): void {
  if (!state.settings.autoSave || !state.game) return;
  if (state.game.turnCount > 0 && state.game.turnCount % 5 === 0) {
    saveAppState(state);
    const slot: AppState["saveSlots"][number] = {
      id: "auto",
      name: "Auto-save",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      turnCount: state.game.turnCount,
      characterName: state.game.player.name,
      data: JSON.stringify(state),
    };
    writeSaveSlot(slot).catch(() => {});
  }
}

function applySettings(settings: AppState["settings"]): void {
  setReducedMotion(settings.reducedMotion);
  setHighContrast(settings.highContrast);
  setFontSize(settings.fontSize);
  document.documentElement.dataset.textSpeed = String(settings.textSpeed);
}

// ── Command Processing ──

async function runCommand(command: string): Promise<void> {
  const state = store.getState();
  if (!state.game) return;
  const trimmed = command.trim();
  const lower = trimmed.toLowerCase();

  if (lower === "save") {
    const savedAt = saveAppState(state);
    state.game.lastFeedback = `Saved locally at ${new Date(savedAt).toLocaleTimeString()}.`;
    store.setState({ game: state.game, commandDraft: "" });
    return;
  }

  if (lower === "help" || lower === "?") {
    state.game.lastFeedback = "Try: look, listen, speak, approach, rest, wait, flee, attack, or choose a suggested action.";
    store.setState({ game: state.game, commandDraft: "" });
    return;
  }

  let game = state.game;
  const rng = new SeededRNG(game.seed + game.turnCount);

  // LLM-first intent classification. Falls back to regex on any LLM
  // error or when llmEnabled is off (the classifier is constructed
  // without a client in that path). Always resolves quickly.
  const intent = await intentClassifier.classify(trimmed);
  const { verb } = parseCommand(trimmed);

  // Run mechanical reducer. Prefer the classified reducer when the LLM
  // returned high-confidence (intent.source === "llm" or "cache"); for
  // the regex fallback we keep the original keyword dispatch so behaviour
  // matches what the test suite already locks in.
  let actionResult: ActionResult | null = null;
  const dispatch = intent.source === "regex" ? verb : intent.reducer;

  if (intent.source !== "regex") {
    if (intent.reducer === "combat") actionResult = combatReducer(game, trimmed, rng);
    else if (intent.reducer === "move") actionResult = moveReducer(game, trimmed, rng);
    else if (intent.reducer === "rest") actionResult = restReducer(game, trimmed, rng);
    else if (intent.reducer === "item") actionResult = itemReducer(game, trimmed, rng);
    else if (intent.reducer === "dialogue") actionResult = dialogueReducer(game, trimmed, rng);
    else if (intent.reducer === "investigation") actionResult = investigationReducer(game, trimmed, rng);
    // narrative_only → leave actionResult null; Ink + LLM handle it
  } else if (["attack", "defend", "riposte", "surrender"].includes(dispatch)) {
    actionResult = combatReducer(game, trimmed, rng);
  } else if (["go", "approach", "flee", "sneak"].includes(dispatch)) {
    actionResult = moveReducer(game, trimmed, rng);
  } else if (["rest", "sleep", "recover"].includes(dispatch)) {
    actionResult = restReducer(game, trimmed, rng);
  } else if (["use", "equip", "consume", "inspect", "drop", "trade"].includes(dispatch)) {
    actionResult = itemReducer(game, trimmed, rng);
  } else if (["speak", "ask", "bargain", "threaten", "lie"].includes(dispatch)) {
    actionResult = dialogueReducer(game, trimmed, rng);
  } else if (["look", "examine", "read", "listen", "search"].includes(dispatch)) {
    actionResult = investigationReducer(game, trimmed, rng);
  }

  // Apply mechanical patches
  if (actionResult) {
    game = applyPatches(game, actionResult.patches);
    game.turnCount += 1;
    // Tick conditions
    const conditionResult = conditionReducer(game, trimmed, rng);
    game = applyPatches(game, conditionResult.patches);
  }

  // Get narrative from Ink. Pre-warm the WorldMemoryCache first so any
  // `recall(loc)` or `llm_generate(prompt)` externals the next passage
  // hits can answer instantly from session-scoped cache instead of the
  // deterministic fallback.
  let narrativeResult: import("@first-perception/narrative").NarrativeResult | null = null;
  if (narrativeReady) {
    try {
      if (repo) {
        await narrativeEngine.prepareWorldMemory(game, { repo });
      }
      narrativeResult = narrativeEngine.processCommand(trimmed, game);
    } catch (err) {
      getLogger().warn("Narrative error", { error: err });
    }
  }

  // Merge narrative into game state
  if (narrativeResult) {
    if (narrativeResult.taleEntry) {
      game.tale = [narrativeResult.taleEntry, ...game.tale].slice(0, 20);
    } else if (actionResult?.narrative.length) {
      // Ink produced no tale entry, but engine reducers did
      game.tale = [...actionResult.narrative, ...game.tale].slice(0, 20);
    }
    if (narrativeResult.journalEntry) {
      game.journal = [narrativeResult.journalEntry, ...game.journal].slice(0, 16);
    } else if (actionResult?.journal) {
      game.journal = [actionResult.journal, ...game.journal].slice(0, 16);
    }
    game.suggestedActions = narrativeResult.choices.length > 0
      ? narrativeResult.choices
      : actionResult?.suggestions ?? game.suggestedActions;
    game.lastFeedback = narrativeResult.text || actionResult?.feedback || "You act.";
    // Handle Ink consequence tags
    if (narrativeResult.consequences && narrativeResult.consequences.length > 0) {
      for (const consequenceId of narrativeResult.consequences) {
        try {
          const consequenceResult = narrativeEngine.triggerConsequence(consequenceId, game);
          if (consequenceResult?.text) {
            game.tale = [{ id: `c-${consequenceId}`, turn: game.turnCount, title: "Consequence", body: consequenceResult.text, tone: "warning" as import("@first-perception/types").TaleTone, tags: ["consequence"] }, ...game.tale].slice(0, 20);
          }
        } catch {
          // consequence knot may not exist
        }
      }
    }
  } else if (actionResult) {
    if (actionResult.narrative.length > 0) {
      game.tale = [...actionResult.narrative, ...game.tale].slice(0, 20);
    }
    if (actionResult.journal) {
      game.journal = [actionResult.journal, ...game.journal].slice(0, 16);
    }
    game.suggestedActions = actionResult.suggestions;
    game.lastFeedback = actionResult.feedback;
  }

  // ── Living World LLM Layer ──
  // turnOrchestrator is only constructed if settings.llmEnabled is true
  // AND the proxy initialized successfully (see initLLMLayer). No
  // per-user api keys; the /api/llm proxy reads keys from server env.
  const llmEnabled = state.settings.llmEnabled && turnOrchestrator !== null;
  if (llmEnabled) {
    try {
      const llmResult = await turnOrchestrator!.processTurn(game, trimmed);
      if (!llmResult.fallback) {
        // Replace static tale entry with LLM-merged narrative
        game.tale = [llmResult.taleEntry, ...game.tale.slice(1)].slice(0, 20);
        // Apply NPC state patches
        if (llmResult.patches.length > 0) {
          game = applyPatches(game, llmResult.patches);
        }
        // Update suggestions if LLM provided better ones
        if (llmResult.suggestedActions.length > 0) {
          game.suggestedActions = llmResult.suggestedActions;
        }
        // Append world pulse as a secondary tale entry if present
        if (llmResult.worldPulse) {
          game.tale = [
            {
              id: makeId("pulse"),
              turn: game.turnCount,
              title: llmResult.worldPulse.title,
              body: llmResult.worldPulse.description,
              tone: "warning" as import("@first-perception/types").TaleTone,
              tags: ["world-pulse", "faction"],
            },
            ...game.tale,
          ].slice(0, 20);

          // Cross-run faction memory: write the pulse as a WorldEvent so
          // future runs can recall it. Best-effort; never blocks the turn.
          if (repo) {
            try {
              const pulse = llmResult.worldPulse;
              const sourceFactionId = game.factions[0]?.id ?? "unknown";
              const sourceFactionName = game.factions[0]?.name ?? "An offstage force";
              await repo.recordEvent(
                buildFactionWorldEvent({
                  game,
                  factionId: sourceFactionId,
                  factionName: sourceFactionName,
                  pulse,
                  campaignId: deriveCampaignId(game),
                }),
              );
            } catch (err) {
              getLogger().warn("Faction WorldEvent writeback failed", { error: err });
            }
          }
        }
        game.lastFeedback = `Turn ${game.turnCount} · ${llmResult.llmCallsMade} LLM calls · ${llmResult.latencyMs}ms`;
      }
    } catch (err) {
      getLogger().warn("Living World layer failed", { error: err });
      // Keep static narrative — graceful fallback
    }
  }

  // Advance world time
  const TIME_PHASES = [
    "The Waking Hour", "The Ash Hour", "The Weeping Hour",
    "The Pale Market", "The Bell Without Sound", "Deep Night",
  ];
  game.world.phaseIndex = (game.world.phaseIndex + 1) % TIME_PHASES.length;
  game.world.phaseName = TIME_PHASES[game.world.phaseIndex];
  if (game.world.phaseIndex === 0) game.world.day += 1;

  // Death check
  if (game.player.hp <= 0 && !game.gameOver) {
    const deathResult = deathReducer(game, trimmed, rng);
    if (deathResult.patches.length > 0) {
      game = applyPatches(game, deathResult.patches);
      if (deathResult.narrative.length > 0) {
        game.tale = [deathResult.narrative[0], ...game.tale].slice(0, 20);
      }
      if (deathResult.journal) {
        game.journal = [deathResult.journal, ...game.journal].slice(0, 16);
      }
      game.lastFeedback = deathResult.feedback;
      // Generate legacy
      const legacySystem = new LegacySystem();
      const legacy = legacySystem.generateLegacy(
        game.legacy?.deadCharacter ?? {
          id: "legacy-death",
          characterName: game.player.name,
          vector: "unknown",
          epitaph: game.tale[0]?.body ?? "Gone without record.",
          turnsSurvived: game.turnCount,
          finalLocationId: game.currentLocationId,
          worldSnapshot: {
            seed: game.seed,
            turnCount: game.turnCount,
            day: game.day,
            phaseIndex: game.phaseIndex,
            locationId: game.currentLocationId,
            regionId: game.world.region,
            weather: game.world.weather,
            danger: game.world.danger,
            pulse: game.world.pulse,
            crisis: game.world.crisis,
          },
        },
        game,
        rng,
      );
      game.legacy = legacy;
      const history = loadLegacyHistory();
      history.unshift(legacy);
      saveLegacyHistory(history);
      store.setState({ game, screen: "game_over", commandDraft: "" });
      saveAppState(store.getState());
      return;
    }
  }

  // Audio
  try {
    audioEngine.updateFromGameState(game);
    if (narrativeResult?.soundCue) {
      audioEngine.playCue({ layer: "narrative", type: "trigger", soundId: narrativeResult.soundCue });
    }
  } catch {
    // Audio not critical
  }

  // ── World event writeback ──
  // Persist what happened this turn so future runs (via recall) and
  // the LLM context assembler can refer to it. Best-effort: the repo
  // may be the localStorage fallback (session-scoped) or unavailable.
  // Either way, save and turn flow must not block.
  if (actionResult && repo) {
    try {
      const event = buildWorldEvent({
        game,
        command: trimmed,
        result: actionResult,
        campaignId: deriveCampaignId(game),
      });
      if (event) await repo.recordEvent(event);
    } catch (err) {
      getLogger().warn("WorldEvent writeback failed", { error: err });
    }
  }

  store.setState({ game, commandDraft: "" });
  saveAppState(store.getState());
  autoSaveIfNeeded(store.getState());
}

// ── Screen Renderers ──

function renderTitle(): void {
  const state = store.getState();
  const screen = new TitleScreen({
    hasSave: state.hasSave,
    version: "v2.0.0",
    onBegin: () => {
      store.setState({
        screen: "creation",
        creation: blankCreation(),
        feedback: "",
      });
    },
    onContinue: () => {
      const loaded = loadAppState();
      if (loaded) {
        store.setState(loaded.game ? { ...loaded, screen: "gameplay" } : loaded);
      } else {
        store.setState({ feedback: "No local save could be loaded." });
      }
    },
    onSettings: () => openSettings(),
    onLegacy: () => {
      const history = loadLegacyHistory();
      if (history.length === 0) {
        store.setState({ feedback: "No legacy yet. Survive, then die with purpose." });
        return;
      }
      store.setState({ screen: "legacy", feedback: "" });
    },
  });
  mountScreen(screen.render(), screen);
}

function renderCreation(): void {
  const state = store.getState();
  const screen = new CreationScreen({
    state,
    onExit: () => store.setState({ screen: "title", feedback: "" }),
    onUpdate: (creation) => store.setState({ creation }),
    onComplete: () => {
      const game = createGameFromCreation(store.getState().creation);
      store.setState({ game, screen: "gameplay", activeTab: "tale", feedback: "" });
      saveAppState(store.getState());
      // Enter initial narrative scene
      if (narrativeReady) {
        try {
          const result = narrativeEngine.enterScene("arrival", game);
          if (result?.taleEntry) {
            game.tale = [result.taleEntry, ...game.tale].slice(0, 20);
          }
          if (result?.journalEntry) {
            game.journal = [result.journalEntry, ...game.journal].slice(0, 16);
          }
          game.suggestedActions = result?.choices ?? game.suggestedActions;
          store.setState({ game });
        } catch (err) {
          getLogger().warn("Initial narrative error", { error: err });
        }
      }
    },
  });
  mountScreen(screen.render(), screen);
}

function renderDeath(): void {
  const state = store.getState();
  const screen = new DeathScreen({
    game: state.game!,
    onMount: () => {
      // The audio fades to silence over ~2.5s in parallel with the
      // visual ceremony. Errors are swallowed — the audio engine may
      // never have been started (no user gesture before death) and we
      // don't want that to mar the screen.
      void audioEngine.fadeOut(2.5).catch(() => {});
    },
    onNewRun: () => {
      const creation = blankCreation();
      const next = createInitialState();
      const newGame = createGameFromCreation(creation);
      // Apply last legacy if present
      const history = loadLegacyHistory();
      const lastLegacy = history[0];
      if (lastLegacy) {
        newGame.legacy = lastLegacy;
        if (lastLegacy.inheritance.item) {
          newGame.player.inventory = [lastLegacy.inheritance.item, ...newGame.player.inventory].slice(0, 8);
        }
        if (lastLegacy.inheritance.startingAdvantage === "warned") {
          newGame.world.danger = Math.max(0, newGame.world.danger - 10);
        }
      }
      store.setState({
        ...next,
        screen: "creation",
        creation,
        game: undefined,
        feedback: lastLegacy ? "A new run begins, shaped by what came before." : "A new run begins.",
      });
    },
    onTitle: () => store.setState({ screen: "title", feedback: "" }),
  });
  mountScreen(screen.render(), screen);
}

function renderLegacy(): void {
  const state = store.getState();
  const history = loadLegacyHistory();
  const screen = new LegacyScreen({
    history,
    onBack: () => store.setState({ screen: "title", feedback: "" }),
  });
  mountScreen(screen.render(), screen);
}

function renderGameplay(): void {
  const state = store.getState();
  if (!state.game) return;
  const screen = new GameplayScreen({
    state,
    onCommand: (command) => runCommand(command),
    onDraftChange: (value) => store.setState({ commandDraft: value }),
    onTabChange: (tab) => store.setState({ activeTab: tab }),
    onSave: () => {
      const savedAt = saveAppState(store.getState());
      const s = store.getState();
      if (s.game) {
        s.game.lastFeedback = `Saved locally at ${new Date(savedAt).toLocaleTimeString()}.`;
        store.setState({ game: s.game });
      }
    },
    onLoad: () => {
      const loaded = loadAppState();
      if (loaded?.game) {
        store.setState({ ...loaded, screen: "gameplay" });
      } else {
        const s = store.getState();
        if (s.game) {
          s.game.lastFeedback = "No playable local save found.";
          store.setState({ game: s.game });
        }
      }
    },
    onNewGame: () => store.setState({ screen: "title", feedback: "Current run is still available if you saved it." }),
    onOpenSettings: () => openSettings(),
  });
  mountScreen(screen.render(), screen);
}

function openSettings(): void {
  if (settingsModal) return;
  const state = store.getState();
  settingsModal = new SettingsModal({
    state,
    onClose: () => {
      settingsModal?.destroy();
      settingsModal = null;
      document.querySelector(".modal-backdrop")?.remove();
    },
    onSettingsChange: (partial) => {
      const s = store.getState();
      const nextSettings = { ...s.settings, ...partial };
      store.setState({ settings: nextSettings });
      applySettings(nextSettings);
      saveAppState(store.getState());
      // Re-init LLM layer if toggled
      if ("llmEnabled" in partial) {
        initLLMLayer(nextSettings.llmEnabled);
      }
    },
    onSaveState: async (slotId) => {
      const s = store.getState();
      const slot: AppState["saveSlots"][number] = {
        id: slotId,
        name: `Slot ${slotId}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        turnCount: s.game?.turnCount ?? 0,
        characterName: s.game?.player.name ?? "Unknown",
        data: JSON.stringify(s),
      };
      await writeSaveSlot(slot);
      const slots = await getSaveSlots();
      store.setState({ saveSlots: slots });
    },
    onLoadState: async (slotId) => {
      try {
        const slot = await readSaveSlot(slotId);
        if (slot?.data) {
          const parsed = JSON.parse(slot.data) as AppState;
          store.setState({ ...parsed, screen: "gameplay" });
        }
      } catch {
        // ignore
      }
    },
    onDeleteSlot: async (slotId) => {
      await deleteSaveSlot(slotId);
      const slots = await getSaveSlots();
      store.setState({ saveSlots: slots });
    },
  });
  document.body.appendChild(settingsModal.render());
}

function mountScreen(element: HTMLElement, instance: { destroy: () => void; update?(props: Record<string, unknown>): void }): void {
  const outgoing = currentScreen?.element ?? null;
  const boundUpdate = instance.update?.bind(instance);
  if (outgoing) {
    screenTransition(outgoing, element, () => {
      currentScreen?.destroy();
      currentScreen = { element, destroy: instance.destroy.bind(instance), update: boundUpdate };
    });
    appRoot!.appendChild(element);
  } else {
    appRoot!.appendChild(element);
    currentScreen = { element, destroy: instance.destroy.bind(instance), update: boundUpdate };
  }
}

// ── Render Loop ──

function render(): void {
  const state = store.getState();
  state.hasSave = hasSavedGame();
  updateDocumentTitle(state);
  applySettings(state.settings);

  const targetScreen = state.screen;

  currentScreen?.destroy();
  appRoot!.innerHTML = "";
  currentScreen = null;

  switch (targetScreen) {
    case "title":
      renderTitle();
      break;
    case "creation":
      renderCreation();
      break;
    case "gameplay":
      renderGameplay();
      break;
    case "game_over":
      renderDeath();
      break;
    case "legacy":
      renderLegacy();
      break;
    default:
      renderTitle();
  }
}

window.render_game_to_text = () => renderStateToText(store.getState());
window.advanceTime = (ms: number) => {
  store.setState(advanceAmbientTime(store.getState(), ms));
};

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && settingsModal) {
    settingsModal.destroy();
    settingsModal = null;
    document.querySelector(".modal-backdrop")?.remove();
  }
});

// Initialize audio on first interaction. Tone.js requires a user gesture
// before it will start its AudioContext, and start() is async — we must
// await it before the first updateFromGameState() call, otherwise the
// first command's audio adaptation runs on an uninitialized engine and
// is silently dropped.
document.addEventListener(
  "click",
  () => {
    void (async () => {
      try {
        await audioEngine.start();
        const state = store.getState();
        if (state.game) {
          audioEngine.updateFromGameState(state.game);
        }
      } catch {
        // AudioContext may not be supported
      }
    })();
  },
  { once: true },
);

// ── LLM Layer Initialization ──

// LLM keys live in Vercel env vars and are read server-side by
// /api/llm + /api/llm/stream. The browser only needs the proxy client,
// which forwards LLMRequest envelopes. Nothing in the bundle holds a key.
function initLLMLayer(enabled: boolean): void {
  if (!enabled) {
    turnOrchestrator = null;
    llmClient = null;
    // Drop the classifier back to regex-only.
    intentClassifier = new IntentClassifier();
    return;
  }

  try {
    llmClient = new ProxyLLMClient();
    promptBuilder = new PromptBuilder();
    contextAssembler = new WorldContextAssembler(repo ?? undefined);
    // Re-wire the intent classifier with the new proxy client so
    // free-text commands can be classified via /api/llm.
    intentClassifier = new IntentClassifier({ client: llmClient });
    turnOrchestrator = new TurnOrchestrator({
      client: llmClient,
      builder: promptBuilder,
      repository: repo ?? undefined,
      contextAssembler: contextAssembler,
      maxLLMCallsPerTurn: 8,
      maxLatencyMs: 5000,
      maxActiveNPCs: 3,
      maxActiveFactions: 2,
    });
  } catch (err) {
    getLogger().warn("Failed to initialize LLM layer", { error: err });
    turnOrchestrator = null;
    llmClient = null;
  }
}

// ── Boot Sequence ──
async function boot(): Promise<void> {
  // Try the server-backed HTTP repo first. If /api/health is unreachable
  // (offline, deploy without Postgres, dev without env vars), fall back to
  // a session-scoped localStorage repo so save slots still work locally.
  // The world-event / NPC-memory writebacks won't compound across sessions
  // in fallback mode; the UI will surface that in Phase 7.
  try {
    const http = new HttpRepository();
    await http.init();
    repo = http;
  } catch {
    try {
      const local = new LocalStorageRepository();
      await local.init();
      repo = local;
    } catch (err) {
      getLogger().warn("All persistence backends unavailable", { error: err });
      repo = null;
    }
  }

  // Initialize LLM layer if configured. API keys live in Vercel env;
  // the proxy reads them server-side.
  const loadedState = loadAppState();
  const settings = loadedState?.settings ?? createInitialState().settings;
  initLLMLayer(settings.llmEnabled);

  const [slots] = await Promise.all([
    getSaveSlots(),
    narrativeEngine.initialize().then(() => {
      narrativeReady = true;
    }).catch((err) => {
      getLogger().warn("Narrative engine failed to initialize", { error: err });
    }),
  ]);
  store.setState({ saveSlots: slots });
  render();
}

boot().catch((err) => {
  getLogger().error("Boot failed", err);
  appRoot!.innerHTML = `<div style="padding:2rem;color:#c9b8a8;font-family:system-ui">
    <h1>The First Perception</h1>
    <p>Failed to initialize. Try a hard refresh (Ctrl+Shift+R) or open in incognito mode.</p>
    <pre style="background:#1a1a1a;padding:1rem;border-radius:4px;overflow:auto">${String(err)}</pre>
  </div>`;
});

// Subscribe to re-render on screen changes
store.subscribe((state) => {
  const target = state.screen;
  const currentEl = currentScreen?.element;
  const currentName = currentEl?.classList.contains("title-screen")
    ? "title"
    : currentEl?.classList.contains("creation-screen")
      ? "creation"
      : currentEl?.classList.contains("game-screen")
        ? "gameplay"
        : currentEl?.classList.contains("death-screen")
          ? "game_over"
          : currentEl?.classList.contains("legacy-screen")
            ? "legacy"
            : target;
  if (currentName !== target) {
    render();
  } else if (currentScreen && "update" in currentScreen) {
    (currentScreen as unknown as { update(props: { state: AppState }): void }).update({ state });
  }
});
