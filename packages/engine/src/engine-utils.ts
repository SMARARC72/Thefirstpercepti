/**
 * Engine utilities for deterministic operations.
 */
import type {
  GameState,
  Player,
  LocationNode,
  NpcState,
  RollResult,
  StatePatch,
  ActionResult,
  TaleEntry,
  SuggestedAction,
  ConsequenceState,
  Domain,
  CoreStat,
  ResultBand,
  RollBand,
} from '@first-perception/types';
import { RESULT_BANDS, resultBandToRollBand } from '@first-perception/types';
import { SeededRNG } from './engine/DiceEngine';

let _idCounter = 0;
export function resetIdCounter(): void {
  _idCounter = 0;
}

export function makeId(prefix = 'id'): string {
  _idCounter++;
  return `${prefix}_${_idCounter}`;
}

export function getCurrentLocation(game: GameState): LocationNode | undefined {
  return game.locations.find((l) => l.id === game.currentLocationId);
}

export function getNpcsAtLocation(game: GameState, locationId: string): NpcState[] {
  return game.npcs.filter((n) => n.locationId === locationId && n.alive);
}

export function rollD20(
  game: GameState,
  stat: CoreStat,
  dc: number,
  command: string,
  rng: SeededRNG,
  domain: Domain = 'physical',
  options: { proficient?: boolean } = {}
): RollResult {
  const raw = rng.rollDie(20);
  const statMod = game.player.stats[stat] ?? 0;
  // Callers that pass `proficient: true` get +PB on top of the stat modifier.
  const profBonus = options.proficient ? game.player.proficiencyBonus ?? 0 : 0;
  const modifier = statMod + profBonus;
  const total = raw + modifier;
  const margin = total - dc;

  let band: ResultBand;
  if (margin <= -10) band = RESULT_BANDS[0];
  else if (margin <= -5) band = RESULT_BANDS[1];
  else if (margin < 0) band = RESULT_BANDS[2];
  else if (margin === 0) band = RESULT_BANDS[3];
  else if (margin <= 4) band = RESULT_BANDS[4];
  else if (margin <= 9) band = RESULT_BANDS[5];
  else band = RESULT_BANDS[6];

  const profDetail = profBonus !== 0 ? ` (incl. PB +${profBonus})` : '';

  return {
    id: makeId('roll'),
    turn: game.turnCount,
    command,
    domain,
    dice: [raw],
    modifier,
    total,
    band,
    detail: `Rolled ${raw} + ${modifier}${profDetail} = ${total} vs DC ${dc}`,
    seed: game.seed,
  };
}

/**
 * Companion to `rollD20` that also returns the coarse 4-band `RollBand`
 * (disaster | failure | success | triumph). Combat is the only reducer
 * that branches on RollBand; the others still consume the 7-band
 * ResultBand directly, which is why this is a sibling helper.
 */
export function rollD20WithBand(
  game: GameState,
  stat: CoreStat,
  dc: number,
  command: string,
  rng: SeededRNG,
  domain: Domain = 'physical',
  options: { proficient?: boolean } = {}
): { roll: RollResult; band: RollBand } {
  const roll = rollD20(game, stat, dc, command, rng, domain, options);
  return { roll, band: resultBandToRollBand(roll.band) };
}

export function makePatch(path: string, op: StatePatch['op'], value?: unknown, amount?: number, item?: unknown): StatePatch {
  return { path, op: op as StatePatch['op'], value, amount, item };
}

export function patchReplace(path: string, value: unknown): StatePatch {
  return makePatch(path, 'replace', value);
}

export function patchIncrement(path: string, amount: number): StatePatch {
  return makePatch(path, 'increment', undefined, amount);
}

export function patchAppend(path: string, item: unknown): StatePatch {
  return makePatch(path, 'append', undefined, undefined, item);
}

export function patchAdd(path: string, value: unknown): StatePatch {
  return makePatch(path, 'add', value);
}

export function patchRemove(path: string): StatePatch {
  return makePatch(path, 'remove');
}

export function buildActionResult(params: {
  patches?: StatePatch[];
  rolls?: RollResult[];
  narrative?: TaleEntry[];
  consequences?: ConsequenceState[];
  feedback?: string;
  suggestions?: SuggestedAction[];
  journal?: { id: string; turn: number; label: string; detail: string; category: 'perception' | 'evidence' | 'rumor' | 'world' | 'npc' | 'faction' | 'legacy' };
}): ActionResult {
  return {
    patches: params.patches ?? [],
    rolls: params.rolls ?? [],
    narrative: params.narrative ?? [],
    consequences: params.consequences ?? [],
    feedback: params.feedback ?? '',
    suggestions: params.suggestions ?? [],
    journal: params.journal,
  };
}

export function makeTaleEntry(game: GameState, title: string, body: string, tone: TaleEntry['tone'] = 'quiet'): TaleEntry {
  return {
    id: makeId('tale'),
    turn: game.turnCount,
    title,
    body,
    tone,
    tags: [],
  };
}

export function makeSuggestion(label: string, command: string, domain: Domain, riskHint?: string): SuggestedAction {
  return { label, command, domain, riskHint };
}

export function parseCommand(command: string): { verb: string; target: string } {
  const parts = command.trim().toLowerCase().split(/\s+/);
  const verb = parts[0] ?? '';
  const target = parts.slice(1).join(' ');
  return { verb, target };
}

export function cloneState(game: GameState): GameState {
  return structuredClone(game);
}
