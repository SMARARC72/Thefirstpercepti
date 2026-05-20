/**
 * ============================================================================
 * NARRATIVE SYSTEM — The First Perception
 * ============================================================================
 * Ink narrative integration: bridge between game engine and inkjs runtime.
 * ============================================================================
 */

export { InkBridge } from "./InkBridge";
export { NarrativeEngine } from "./NarrativeEngine";
export { ContentLoader } from "./ContentLoader";
export { WorldMemoryCache, promptKey } from "./WorldMemoryCache.js";
export { createGameStateBindings } from "./bindings/gameStateBindings";
export type { GameStateBindings, BindingsCallbacks } from "./bindings/gameStateBindings";

import type {
  TaleEntry,
  SuggestedAction,
  JournalEntry,
} from "@first-perception/types";

export interface NarrativeResult {
  text: string;
  choices: SuggestedAction[];
  tags: string[];
  taleEntry?: TaleEntry;
  journalEntry?: JournalEntry;
  soundCue?: string;
  animation?: string;
  consequences?: string[];
}

export { Story } from "inkjs";

// Agents
export * from "./agents/index.js";
export * from "./voice/index.js";
