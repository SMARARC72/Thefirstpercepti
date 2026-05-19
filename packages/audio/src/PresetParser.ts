/**
 * ============================================================================
 * PRESET PARSER — The First Perception Audio System
 * ============================================================================
 * Converts JSON audio presets into live Tone.js synthesizer chains.
 * ============================================================================
 */

import * as Tone from "tone";
import type { AudioPreset } from "./index.js";

/** Minimal interface for any Tone.js node we connect and dispose. */
export interface ToneNode {
  connect(destination: unknown, outputNum?: number, inputNum?: number): unknown;
  dispose(): void;
}

type Waveform = "sine" | "triangle" | "square" | "sawtooth";

export interface SynthChain {
  entry: ToneNode;
  synth: ToneNode;
  filter?: Tone.Filter;
  effects: ToneNode[];
  volume: Tone.Volume;
  lfo?: Tone.LFO;
}

/**
 * Build a complete synthesizer chain from a preset definition.
 * Returns the entry node for simple connection scenarios.
 */
export function buildSynthFromPreset(preset: AudioPreset): ToneNode {
  const chain = buildChain(preset);
  return chain.entry;
}

/**
 * Build a complete synthesizer chain with all controllable nodes exposed.
 */
export function buildChain(preset: AudioPreset): SynthChain {
  const synth = createSynth(preset);
  const filter = createFilter(preset);
  const effects = createEffects(preset);
  const volume = new Tone.Volume(preset.volume ?? -12);
  const lfo = createLfo(preset);

  // Connect synth -> filter -> effects -> volume
  let current: ToneNode = synth;

  if (filter) {
    current.connect(filter);
    current = filter as unknown as ToneNode;
  }

  for (const effect of effects) {
    current.connect(effect);
    current = effect;
  }

  current.connect(volume);

  // LFO modulation
  if (lfo && filter && preset.lfo?.target === "filter.frequency") {
    const baseFreq = typeof preset.filter?.frequency === "number" ? preset.filter.frequency : 800;
    const depth = typeof preset.lfo?.depth === "number" ? preset.lfo.depth : 50;
    lfo.min = Math.max(20, baseFreq - depth);
    lfo.max = Math.min(20000, baseFreq + depth);
    lfo.connect(filter.frequency);
    lfo.start();
  }

  return {
    entry: synth,
    synth,
    filter,
    effects,
    volume,
    lfo,
  };
}

function createSynth(preset: AudioPreset): ToneNode {
  const synthType = (preset.synth?.type as string)?.toLowerCase() ?? "synth";
  const envelope = parseEnvelope(preset.envelope);

  switch (synthType) {
    case "fm": {
      const carrier = (preset.synth?.carrier as Record<string, unknown>) ?? {};
      const modulator = (preset.synth?.modulator as Record<string, unknown>) ?? {};
      return new Tone.FMSynth({
        harmonicity: 1,
        modulationIndex: (modulator.depth as number) ?? 200,
        oscillator: { type: (carrier.waveform as Waveform) ?? "sine" },
        modulation: { type: (modulator.waveform as Waveform) ?? "sine" },
        envelope,
      }) as unknown as ToneNode;
    }
    case "am": {
      const carrier = (preset.synth?.carrier as Record<string, unknown>) ?? {};
      const modulator = (preset.synth?.modulator as Record<string, unknown>) ?? {};
      return new Tone.AMSynth({
        harmonicity: 1,
        oscillator: { type: (carrier.waveform as Waveform) ?? "triangle" },
        modulation: { type: (modulator.waveform as Waveform) ?? "sine" },
        envelope,
      }) as unknown as ToneNode;
    }
    case "membrane": {
      return new Tone.MembraneSynth({
        pitchDecay: 0.05,
        octaves: (preset.synth?.octaves as number) ?? 4,
        envelope,
      }) as unknown as ToneNode;
    }
    case "metal": {
      return new Tone.MetalSynth({
        harmonicity: (preset.synth?.harmonicity as number) ?? 3.1,
        modulationIndex: (preset.synth?.modulationIndex as number) ?? 16,
        resonance: (preset.synth?.resonance as number) ?? 4000,
        octaves: (preset.synth?.octaves as number) ?? 1.5,
        envelope,
      }) as unknown as ToneNode;
    }
    default: {
      return new Tone.Synth({
        oscillator: { type: "sine" },
        envelope,
      }) as unknown as ToneNode;
    }
  }
}

function createFilter(preset: AudioPreset): Tone.Filter | undefined {
  if (!preset.filter) return undefined;
  const type = (preset.filter.type as BiquadFilterType) ?? "lowpass";
  const frequency = (preset.filter.frequency as number) ?? 800;
  return new Tone.Filter(frequency, type, -12);
}

function createEffects(preset: AudioPreset): ToneNode[] {
  const effects: ToneNode[] = [];
  if (!preset.effects) return effects;

  for (const fx of preset.effects) {
    const type = (fx.type as string) ?? "";
    switch (type) {
      case "reverb": {
        const decay = (fx.roomSize as number) ?? 0.8;
        const wet = (fx.wet as number) ?? 0.4;
        const reverb = new Tone.Reverb({ decay, preDelay: 0.01, wet });
        effects.push(reverb as unknown as ToneNode);
        break;
      }
      case "delay": {
        const time = (fx.time as number) ?? 0.5;
        const feedback = (fx.feedback as number) ?? 0.3;
        const wet = (fx.wet as number) ?? 0.2;
        const delay = new Tone.FeedbackDelay(time, feedback);
        delay.wet.value = wet;
        effects.push(delay as unknown as ToneNode);
        break;
      }
      case "distortion": {
        const amount = (fx.amount as number) ?? 0.3;
        effects.push(new Tone.Distortion(amount) as unknown as ToneNode);
        break;
      }
    }
  }

  return effects;
}

function createLfo(preset: AudioPreset): Tone.LFO | undefined {
  if (!preset.lfo) return undefined;
  const freq = (preset.lfo.frequency as number) ?? 0.1;
  const min = 400;
  const max = 1200;
  return new Tone.LFO(freq, min, max);
}

function parseEnvelope(env?: Record<string, unknown>): {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
} {
  return {
    attack: (env?.attack as number) ?? 0.01,
    decay: (env?.decay as number) ?? 0.3,
    sustain: (env?.sustain as number) ?? 0.7,
    release: (env?.release as number) ?? 1,
  };
}
