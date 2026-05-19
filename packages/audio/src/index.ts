/**
 * ============================================================================
 * AUDIO SYSTEM — The First Perception
 * ============================================================================
 * Generative audio using Web Audio API and Tone.js.
 * All audio is synthesized in real-time. No pre-rendered audio files.
 * ============================================================================
 */

import type { AudioCue, AudioLayer, GameState } from "@first-perception/types";

export interface AudioPreset {
  name: string;
  description: string;
  layer: AudioLayer;
  volume: number;
  synth?: Record<string, unknown>;
  filter?: Record<string, unknown>;
  envelope?: Record<string, unknown>;
  effects?: Record<string, unknown>[];
  lfo?: Record<string, unknown>;
  scale?: string[];
}

export interface AudioSystem {
  initialize(): Promise<void>;
  start(): void;
  stop(): void;
  loadPresets(url: string): Promise<void>;
  playCue(cue: AudioCue): void;
  startLayer(layer: AudioLayer, presetName: string): void;
  stopLayer(layer: AudioLayer): void;
  setLayerParameter(layer: AudioLayer, param: string, value: number): void;
  setMasterVolume(volume: number): void;
  setMuted(muted: boolean): void;
  updateFromGameState(state: GameState): void;
  dispose(): void;
}

export { AudioEngine } from "./AudioEngine.js";
export { buildSynthFromPreset, buildChain } from "./PresetParser.js";
export type { SynthChain } from "./PresetParser.js";
export type { AudioCue, AudioLayer, GameState };
