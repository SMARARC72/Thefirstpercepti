/**
 * ============================================================================
 * AUDIO ENGINE — The First Perception
 * ============================================================================
 * Main controller for the generative audio system.
 * Manages layered ambient audio, one-shot cues, and game-state reactivity.
 * ============================================================================
 */

import * as Tone from "tone";
import type { AudioCue, AudioLayer, GameState } from "@first-perception/types";
import type { AudioSystem, AudioPreset } from "./index.js";
import { buildChain, SynthChain, ToneNode } from "./PresetParser.js";

type LayerInstance = {
  chain: SynthChain;
  synth: ToneNode;
  isPlaying: boolean;
  polySynth?: Tone.PolySynth;
};

const HARMONY_BY_DANGER = {
  safe: ["C3", "E3", "G3", "B3"],       // major 7th
  tension: ["C3", "Eb3", "G3", "Bb3"],    // minor 7th
  dread: ["C3", "Eb3", "Gb3", "A3"],      // diminished
  horror: ["C3", "F#3", "C4", "F#4"],     // tritone cluster
};

function gainToDb(gain: number): number {
  return gain <= 0 ? -Infinity : 20 * Math.log10(gain);
}

/** Check if a node has start/stop methods (Tone.Source-like). */
function isSource(node: ToneNode): node is ToneNode & { start(time?: string | number): void; stop(time?: string | number): void } {
  return "start" in node && typeof (node as Record<string, unknown>).start === "function";
}

/** Check if a node has monophonic trigger methods. */
function isMonophonic(node: ToneNode): node is ToneNode & {
  triggerAttack(note: string | number, time?: string | number, velocity?: number): void;
  triggerRelease(time?: string | number): void;
  triggerAttackRelease(note: string | number, duration: string | number, time?: string | number, velocity?: number): void;
} {
  return "triggerAttack" in node && typeof (node as Record<string, unknown>).triggerAttack === "function";
}

export class AudioEngine implements AudioSystem {
  private layers: Map<AudioLayer, LayerInstance> = new Map();
  private presets: Map<string, AudioPreset> = new Map();
  private masterVolume: Tone.Volume;
  private isInitialized = false;
  private isMuted = false;
  private previousDanger = -1;
  private activeVoiceCount = 0;
  private readonly maxVoices = 8;

  constructor() {
    this.masterVolume = new Tone.Volume(0).toDestination();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;
    await Tone.start();
    this.isInitialized = true;
  }

  start(): void {
    if (!this.isInitialized) {
      void this.initialize();
    } else {
      void Tone.getContext().resume();
    }
  }

  stop(): void {
    const ctx = Tone.getContext().rawContext as AudioContext;
    void ctx.suspend();
  }

  async loadPresets(url: string): Promise<void> {
    const response = await fetch(url);
    const data = (await response.json()) as AudioPreset | AudioPreset[];
    const presets = Array.isArray(data) ? data : [data];
    for (const preset of presets) {
      this.presets.set(preset.name, preset);
    }
  }

  playCue(cue: AudioCue): void {
    if (!this.isInitialized || this.isMuted) return;
    if (cue.type === "stop") {
      this.stopLayer(cue.layer);
      return;
    }
    if (cue.type === "start" && cue.soundId) {
      this.startLayer(cue.layer, cue.soundId);
      return;
    }
    if (cue.type === "trigger" && cue.soundId) {
      this.triggerOneShot(cue.layer, cue.soundId, cue.params);
      return;
    }
    if (cue.type === "parameter" && cue.params) {
      for (const [key, value] of Object.entries(cue.params)) {
        this.setLayerParameter(cue.layer, key, value);
      }
    }
  }

  startLayer(layer: AudioLayer, presetName: string): void {
    if (!this.isInitialized) return;
    if (this.activeVoiceCount >= this.maxVoices) return;

    this.stopLayer(layer);

    const preset = this.presets.get(presetName);
    if (!preset) {
      console.warn(`[AudioEngine] Preset not found: ${presetName}`);
      return;
    }

    const chain = buildChain(preset);
    chain.volume.connect(this.masterVolume);

    let polySynth: Tone.PolySynth | undefined;

    // For ambient/location layers with scales, use a poly synth
    if (preset.scale && preset.scale.length > 0) {
      const voiceType = this.getPolyVoiceType(preset);
      polySynth = new Tone.PolySynth(voiceType, {
        volume: preset.volume ?? -12,
        envelope: {
          attack: (preset.envelope?.attack as number) ?? 2,
          decay: (preset.envelope?.decay as number) ?? 1,
          sustain: (preset.envelope?.sustain as number) ?? 0.7,
          release: (preset.envelope?.release as number) ?? 4,
        },
      });
      if (chain.filter) {
        polySynth.connect(chain.filter);
      } else {
        polySynth.connect(chain.volume);
      }
    }

    const instance: LayerInstance = {
      chain,
      synth: chain.synth,
      isPlaying: true,
      polySynth,
    };

    this.layers.set(layer, instance);
    this.activeVoiceCount++;

    // Start the sound
    if (polySynth && preset.scale) {
      polySynth.triggerAttack(preset.scale);
    } else if (isSource(chain.synth)) {
      chain.synth.start();
    } else if (isMonophonic(chain.synth)) {
      const note = preset.scale?.[0] ?? "C3";
      chain.synth.triggerAttack(note);
    }
  }

  stopLayer(layer: AudioLayer): void {
    const instance = this.layers.get(layer);
    if (!instance) return;

    const preset = this.presets.get(layer);
    const releaseTime = (preset?.envelope?.release as number) ?? 1;

    if (instance.polySynth) {
      instance.polySynth.releaseAll();
    } else if (isMonophonic(instance.synth)) {
      instance.synth.triggerRelease("+" + releaseTime);
    } else if (isSource(instance.synth)) {
      instance.synth.stop("+" + releaseTime);
    }

    // Fade out volume before disposal
    instance.chain.volume.volume.rampTo(-Infinity, releaseTime);

    setTimeout(() => {
      this.disposeLayerInstance(instance);
      this.layers.delete(layer);
      this.activeVoiceCount = Math.max(0, this.activeVoiceCount - 1);
    }, releaseTime * 1000 + 100);
  }

  setLayerParameter(layer: AudioLayer, param: string, value: number): void {
    const instance = this.layers.get(layer);
    if (!instance) return;

    switch (param) {
      case "volume": {
        instance.chain.volume.volume.rampTo(gainToDb(value), 0.5);
        break;
      }
      case "filter.frequency": {
        if (instance.chain.filter) {
          instance.chain.filter.frequency.rampTo(value, 1);
        }
        break;
      }
      case "filter.resonance": {
        if (instance.chain.filter) {
          instance.chain.filter.Q.rampTo(value, 1);
        }
        break;
      }
    }
  }

  updateFromGameState(state: GameState): void {
    if (!this.isInitialized) return;

    const currentLocation = state.locations.find((l) => l.id === state.currentLocationId);
    const danger = currentLocation?.dangerBase ?? 0;
    const hasHarmfulCondition = state.player.conditions.some((c) => c.isHarmful);
    const effectiveDanger = hasHarmfulCondition ? Math.max(danger, 60) : danger;

    // Location layer: harmony changes based on danger
    if (this.previousDanger !== effectiveDanger) {
      this.previousDanger = effectiveDanger;
      this.updateLocationHarmony(effectiveDanger);
    }

    // Weather layer: start if weather is harsh
    const currentRegion = state.regions.find((r) =>
      state.locations.some((l) => l.id === state.currentLocationId && l.regionId === r.id)
    );
    const weather = currentRegion?.weatherPatterns?.[0]?.type ?? "";
    const isHarshWeather = /storm|blizzard|hurricane|ash|toxic/i.test(weather);
    const weatherRunning = this.layers.has("weather");

    if (isHarshWeather && !weatherRunning) {
      this.startWeatherLayer();
    } else if (!isHarshWeather && weatherRunning) {
      this.stopLayer("weather");
    }
  }

  setMasterVolume(volume: number): void {
    this.masterVolume.volume.rampTo(gainToDb(volume), 0.3);
  }

  setMuted(muted: boolean): void {
    this.isMuted = muted;
    this.masterVolume.mute = muted;
  }

  dispose(): void {
    for (const [layer, instance] of this.layers) {
      this.disposeLayerInstance(instance);
      this.layers.delete(layer);
    }
    this.layers.clear();
    this.presets.clear();
    this.activeVoiceCount = 0;
    this.masterVolume.dispose();
  }

  // ---------------------------------------------------------------------------
  // Private helpers
  // ---------------------------------------------------------------------------

  private getPolyVoiceType(preset: AudioPreset): typeof Tone.Synth {
    const synthType = (preset.synth?.type as string)?.toLowerCase() ?? "synth";
    switch (synthType) {
      case "fm":
        return Tone.FMSynth as unknown as typeof Tone.Synth;
      case "am":
        return Tone.AMSynth as unknown as typeof Tone.Synth;
      case "membrane":
        return Tone.MembraneSynth as unknown as typeof Tone.Synth;
      case "metal":
        return Tone.MetalSynth as unknown as typeof Tone.Synth;
      default:
        return Tone.Synth;
    }
  }

  private triggerOneShot(layer: AudioLayer, soundId: string, params?: Record<string, number>): void {
    if (this.activeVoiceCount >= this.maxVoices) return;

    const preset = this.presets.get(soundId);
    if (!preset) {
      // Fallback for UI / combat one-shots without presets
      this.triggerFallbackOneShot(layer, params);
      return;
    }

    const chain = buildChain(preset);
    chain.volume.connect(this.masterVolume);

    if (isMonophonic(chain.synth)) {
      const note = preset.scale?.[0] ?? params?.note ?? "C4";
      const duration = params?.duration ?? 0.5;
      chain.synth.triggerAttackRelease(note, duration);
    }

    // Auto-dispose after sound finishes
    const release = (preset.envelope?.release as number) ?? 1;
    const totalTime = ((params?.duration as number) ?? 0.5) + release;
    setTimeout(() => {
      this.disposeChain(chain);
    }, totalTime * 1000 + 200);
  }

  private triggerFallbackOneShot(layer: AudioLayer, params?: Record<string, number>): void {
    switch (layer) {
      case "combat": {
        const synth = new Tone.MembraneSynth().connect(this.masterVolume);
        synth.triggerAttackRelease(params?.note ?? "C2", params?.duration ?? 0.3);
        setTimeout(() => synth.dispose(), 1000);
        break;
      }
      case "ui": {
        const synth = new Tone.Synth({
          oscillator: { type: "sine" },
          envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.05 },
        }).connect(this.masterVolume);
        synth.triggerAttackRelease(params?.note ?? "C6", params?.duration ?? 0.05);
        setTimeout(() => synth.dispose(), 300);
        break;
      }
      case "pulse": {
        const synth = new Tone.MetalSynth({
          harmonicity: 3.1,
          modulationIndex: 16,
          resonance: 4000,
          envelope: { attack: 0.001, decay: 1.4, sustain: 0, release: 2 },
        }).connect(this.masterVolume);
        synth.triggerAttackRelease(params?.note ?? "C5", params?.duration ?? 1.5);
        setTimeout(() => synth.dispose(), 3000);
        break;
      }
    }
  }

  private updateLocationHarmony(danger: number): void {
    const instance = this.layers.get("location");
    if (!instance || !instance.polySynth) return;

    let harmony: string[];
    if (danger < 20) {
      harmony = HARMONY_BY_DANGER.safe;
    } else if (danger < 50) {
      harmony = HARMONY_BY_DANGER.tension;
    } else if (danger < 80) {
      harmony = HARMONY_BY_DANGER.dread;
    } else {
      harmony = HARMONY_BY_DANGER.horror;
    }

    // Smooth transition: release old, attack new
    instance.polySynth.releaseAll("+0.1");
    instance.polySynth.triggerAttack(harmony, "+0.5");
  }

  private startWeatherLayer(): void {
    const noise = new Tone.Noise("pink").start();
    const filter = new Tone.AutoFilter({
      frequency: 0.1,
      baseFrequency: 200,
      octaves: 4,
    }).start();
    const volume = new Tone.Volume(-24).connect(this.masterVolume);

    noise.connect(filter);
    filter.connect(volume);

    const chain: SynthChain = {
      entry: noise as unknown as ToneNode,
      synth: noise as unknown as ToneNode,
      effects: [filter as unknown as ToneNode],
      volume,
    };

    const instance: LayerInstance = {
      chain,
      synth: noise as unknown as ToneNode,
      isPlaying: true,
    };

    this.layers.set("weather", instance);
    this.activeVoiceCount++;
  }

  private disposeLayerInstance(instance: LayerInstance): void {
    if (instance.polySynth) {
      instance.polySynth.releaseAll();
      instance.polySynth.dispose();
    }
    this.disposeChain(instance.chain);
  }

  private disposeChain(chain: SynthChain): void {
    chain.lfo?.stop();
    chain.lfo?.dispose();
    for (const effect of chain.effects) {
      effect.dispose();
    }
    chain.filter?.dispose();
    chain.volume.dispose();
    chain.synth.dispose();
  }
}
