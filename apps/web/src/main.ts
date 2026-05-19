import "@first-perception/ui-system/styles.css";
import "./styles.css";

import type { AppState, GameTab, GameState, ActionResult, StatePatch, Legacy } from "@first-perception/types";
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
import { SqliteRepository, MINIMAL_SCHEMA } from "@first-perception/persistence";
import { KimiClient, PromptBuilder, WorldContextAssembler } from "@first-perception/llm-client";

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
  }
}

const DB_NAME = "the-first-perception";
const DB_VERSION = 1;
const STORE_NAME = "saves";
const LEGACY_HISTORY_KEY = "the-first-perception.legacy-history";
const API_KEY_STORAGE_KEY = "the-first-perception.moonshot-api-key";

// ── LLM Layer Instances ──
let sqliteRepo: SqliteRepository | null = null;
let llmClient: KimiClient | null = null;
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

// ── IndexedDB helpers ──

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error);
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

async function getSaveSlots(): Promise<AppState["saveSlots"]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store_ = tx.objectStore(STORE_NAME);
    const req = store_.getAll();
    return new Promise((resolve, reject) => {
      req.onsuccess = () => resolve(req.result as AppState["saveSlots"]);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
}

async function writeSaveSlot(slot: AppState["saveSlots"][number]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store_ = tx.objectStore(STORE_NAME);
  store_.put(slot);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function deleteSaveSlot(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store_ = tx.objectStore(STORE_NAME);
  store_.delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function loadLegacyHistory(): Legacy[] {
  try {
    const raw = localStorage.getItem(LEGACY_HISTORY_KEY);
    return raw ? (JSON.parse(raw) as Legacy[]) : [];
  } catch {
    return [];
  }
}

function loadApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function saveApiKey(key: string): void {
  try {
    if (key) {
      localStorage.setItem(API_KEY_STORAGE_KEY, key);
    } else {
      localStorage.removeItem(API_KEY_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

function saveLegacyHistory(history: Legacy[]): void {
  try {
    localStorage.setItem(LEGACY_HISTORY_KEY, JSON.stringify(history.slice(0, 20)));
  } catch {
    // ignore
  }
}

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
  const { verb } = parseCommand(trimmed);

  // Run mechanical reducer
  let actionResult: ActionResult | null = null;

  if (["attack", "defend", "riposte", "surrender"].includes(verb)) {
    actionResult = combatReducer(game, trimmed, rng);
  } else if (["go", "approach", "flee", "sneak"].includes(verb)) {
    actionResult = moveReducer(game, trimmed, rng);
  } else if (["rest", "sleep", "recover"].includes(verb)) {
    actionResult = restReducer(game, trimmed, rng);
  } else if (["use", "equip", "consume", "inspect", "drop", "trade"].includes(verb)) {
    actionResult = itemReducer(game, trimmed, rng);
  } else if (["speak", "ask", "bargain", "threaten", "lie"].includes(verb)) {
    actionResult = dialogueReducer(game, trimmed, rng);
  } else if (["look", "examine", "read", "listen", "search"].includes(verb)) {
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

  // Get narrative from Ink
  let narrativeResult: import("@first-perception/narrative").NarrativeResult | null = null;
  if (narrativeReady) {
    try {
      narrativeResult = narrativeEngine.processCommand(trimmed, game);
    } catch (err) {
      console.warn("Narrative error:", err);
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
  const llmEnabled = state.settings.llmEnabled && turnOrchestrator && loadApiKey();
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
        }
        game.lastFeedback = `Turn ${game.turnCount} · ${llmResult.llmCallsMade} LLM calls · ${llmResult.latencyMs}ms`;
      }
    } catch (err) {
      console.warn("Living World layer failed:", err);
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
          console.warn("Initial narrative error:", err);
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
        initLLMLayer(nextSettings.llmEnabled, loadApiKey());
      }
    },
    apiKey: loadApiKey(),
    onApiKeyChange: (key) => {
      saveApiKey(key);
      initLLMLayer(state.settings.llmEnabled, key);
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
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, "readonly");
        const st = tx.objectStore(STORE_NAME);
        const req = st.get(slotId);
        req.onsuccess = () => {
          const slot = req.result as AppState["saveSlots"][number] | undefined;
          if (slot?.data) {
            const parsed = JSON.parse(slot.data) as AppState;
            store.setState({ ...parsed, screen: "gameplay" });
          }
        };
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

// Initialize audio on first interaction
document.addEventListener(
  "click",
  () => {
    try {
      audioEngine.start();
      const state = store.getState();
      if (state.game) {
        audioEngine.updateFromGameState(state.game);
      }
    } catch {
      // AudioContext may not be supported
    }
  },
  { once: true },
);

// ── LLM Layer Initialization ──

function initLLMLayer(enabled: boolean, apiKey: string): void {
  if (!enabled || !apiKey) {
    turnOrchestrator = null;
    llmClient = null;
    console.log("LLM layer disabled.");
    return;
  }

  try {
    llmClient = new KimiClient({ apiKey });
    promptBuilder = new PromptBuilder();
    contextAssembler = new WorldContextAssembler(sqliteRepo ?? undefined);
    turnOrchestrator = new TurnOrchestrator({
      client: llmClient,
      builder: promptBuilder,
      repository: sqliteRepo ?? undefined,
      contextAssembler: contextAssembler,
      maxLLMCallsPerTurn: 8,
      maxLatencyMs: 5000,
      maxActiveNPCs: 3,
      maxActiveFactions: 2,
    });
    console.log("LLM layer initialized.");
  } catch (err) {
    console.warn("Failed to initialize LLM layer:", err);
    turnOrchestrator = null;
    llmClient = null;
  }
}

// ── Boot Sequence ──
async function boot(): Promise<void> {
  // Initialize SQLite repository
  try {
    sqliteRepo = new SqliteRepository();
    await sqliteRepo.init();
    await sqliteRepo.runSchema(MINIMAL_SCHEMA);
    console.log("SQLite repository initialized.");
  } catch (err) {
    console.warn("SQLite repository failed to initialize:", err);
    sqliteRepo = null;
  }

  // Initialize LLM layer if configured
  const loadedState = loadAppState();
  const settings = loadedState?.settings ?? createInitialState().settings;
  const apiKey = loadApiKey();
  initLLMLayer(settings.llmEnabled, apiKey);

  const [slots] = await Promise.all([
    getSaveSlots(),
    narrativeEngine.initialize().then(() => {
      narrativeReady = true;
      console.log("Narrative engine ready");
    }).catch((err) => {
      console.warn("Narrative engine failed to initialize:", err);
    }),
  ]);
  store.setState({ saveSlots: slots });
  render();
}

boot();

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
  } else if (currentName === "gameplay" && currentScreen && "update" in currentScreen) {
    (currentScreen as unknown as { update(props: { state: AppState }): void }).update({ state });
  }
});
