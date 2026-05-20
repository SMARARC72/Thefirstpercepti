import type { GameState, ActionResult } from "@first-perception/types";
import type { WorldEvent } from "@first-perception/persistence";
import { makeId } from "@first-perception/engine";

/**
 * WorldEvent builder. Lives at the orchestration layer (the web app)
 * because it bridges the engine's ActionResult and the persistence
 * package's wire types — neither of which should depend on the other.
 */

const DEFAULT_EVENT_TYPE_ID = "player_turn";

export interface BuildWorldEventInput {
  game: GameState;
  command: string;
  result: ActionResult;
  campaignId: string;
}

/**
 * Build a WorldEvent recording what just happened so future runs
 * (via the `recall(location_id)` Ink external) and the LLM context
 * assembler can refer to it.
 *
 * One event per turn. Importance is derived from the roll band plus
 * the tale tone; tags carry the dominant verb so downstream filters
 * are cheap. Returns null when the reducer produced no narrative.
 */
export function buildWorldEvent({
  game,
  command,
  result,
  campaignId,
}: BuildWorldEventInput): WorldEvent | null {
  const taleEntry = result.narrative[result.narrative.length - 1];
  if (!taleEntry) return null;

  const importance = clamp(
    Math.round(
      ((result.rolls?.[0]?.total ?? 12) - 8) / 2 +
        (taleEntry.tone === "danger" ? 5 : taleEntry.tone === "warning" ? 3 : 2),
    ),
    1,
    10,
  );

  const verb = command.trim().toLowerCase().split(/\s+/)[0] ?? "act";

  return {
    eventId: makeId("evt"),
    campaignId,
    eventTypeId: DEFAULT_EVENT_TYPE_ID,
    actorType: "player",
    actorId: game.player.id,
    actorName: game.player.name,
    verb,
    description: taleEntry.body,
    locationId: game.currentLocationId,
    isPublic: true,
    isPlayerFacing: true,
    importance,
    narrativeTags: [verb, taleEntry.tone, ...(taleEntry.tags ?? [])].filter(Boolean),
    rollResult: result.rolls?.[0]
      ? JSON.stringify({
          total: result.rolls[0].total,
          band: result.rolls[0].band,
          domain: result.rolls[0].domain,
        })
      : undefined,
    turnNumber: game.turnCount,
    timestamp: Date.now(),
  };
}

/**
 * Build a WorldEvent for an offstage faction movement (advancePlan
 * result). Powers the cross-run "things that happened while you were
 * away" loop.
 */
export interface BuildFactionWorldEventInput {
  game: GameState;
  factionId: string;
  factionName: string;
  pulse: { title: string; description: string; intensity: number };
  campaignId: string;
}

export function buildFactionWorldEvent({
  game,
  factionId,
  factionName,
  pulse,
  campaignId,
}: BuildFactionWorldEventInput): WorldEvent {
  return {
    eventId: makeId("evt"),
    campaignId,
    eventTypeId: "faction_pulse",
    actorType: "faction",
    actorId: factionId,
    actorName: factionName,
    verb: "moves",
    description: `${pulse.title}: ${pulse.description}`,
    locationId: game.currentLocationId,
    isPublic: true,
    isPlayerFacing: true,
    importance: clamp(pulse.intensity, 1, 10),
    narrativeTags: ["faction", factionId, "world_pulse"],
    turnNumber: game.turnCount,
    timestamp: Date.now(),
  };
}

/**
 * Stable campaignId derived from the player's seed. Cross-run memory
 * compounds within the same character; a new character with a new
 * seed gets a fresh scope.
 */
export function deriveCampaignId(game: GameState): string {
  return `camp-${game.seed.toString(36)}-${game.player.name.replace(/\s+/g, "_").toLowerCase()}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
