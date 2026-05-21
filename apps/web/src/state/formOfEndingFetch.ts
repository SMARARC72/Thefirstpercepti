/**
 * Phase 22.6 / WIRING-405 — fetch the Form-of-Ending postcard from /api/llm.
 *
 * Builds the FormOfEndingContext from the runtime GameState, asks the throttle
 * middleware to dispatch the request via the `form_of_ending` agent (premium
 * tier per tier_policy.json), parses the response with the template's own
 * outputSchema, and returns the FormOfEndingOutput.
 *
 * Returns null on any failure (network, non-200, parse, missing fields). The
 * caller (DeathScreen) treats null as "don't surface the postcard" — the
 * legacy epitaph path still renders unchanged.
 *
 * Why this is browser-side: the template is pure TS (no Node deps), and the
 * /api/llm endpoint is the documented entry point for agent-tagged dispatch.
 */
import type { GameState } from "@first-perception/types";
import {
  formOfEndingTemplate,
  type EndingKind,
  type FormOfEndingContext,
  type FormOfEndingOutput,
} from "@first-perception/llm-client";

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

export function buildFormOfEndingContext(
  game: GameState,
  endingKind: EndingKind = "physical_death",
): FormOfEndingContext {
  const record = game.legacy?.deadCharacter;
  return {
    ending_kind: endingKind,
    player_identifier: record?.characterName ?? game.player.name,
    player_calling_or_form: `${game.player.formLabel} / ${game.player.postureLabel}`,
    region_name: game.world.region,
    day: record?.worldSnapshot?.day ?? game.day ?? 0,
    scene_index: game.turnCount ?? 0,
    triggering_event_summary:
      record?.epitaph ?? "The player's hit points reached zero in the current scene.",
    canon_progression_snapshot: {
      authority: clamp(game.player.stats?.authority ?? 0, 0, 10),
      ruin: clamp(game.player.stats?.ruin ?? 0, 0, 10),
      creation: clamp(game.player.stats?.creation ?? 0, 0, 10),
    },
    active_faiths: [],
    marked_conditions: (game.player.conditions ?? []).map((c) => c.name ?? c.typeId),
    bonded_items: (game.player.inventory ?? [])
      .filter((it) => (it as { bonded?: boolean }).bonded === true)
      .map((it) => it.name ?? it.item_id),
    bonded_npcs: [],
  };
}

export async function fetchFormOfEnding(
  game: GameState,
  endingKind: EndingKind = "physical_death",
  sessionId?: string,
): Promise<FormOfEndingOutput | null> {
  const ctx = buildFormOfEndingContext(game, endingKind);
  const userPrompt = formOfEndingTemplate.buildUserPrompt(ctx);

  try {
    const res = await fetch("/api/llm", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        agent: "form_of_ending",
        session_id: sessionId,
        request: {
          messages: [
            { role: "system", content: formOfEndingTemplate.systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: formOfEndingTemplate.maxTokens ?? 512,
          temperature: formOfEndingTemplate.temperature ?? 0.5,
          response_format: { type: "json_object" },
        },
      }),
    });
    if (!res.ok) return null;
    const envelope = (await res.json()) as {
      data?: { content?: string };
      content?: string;
    };
    const content = envelope.data?.content ?? envelope.content;
    if (!content) return null;
    return formOfEndingTemplate.outputSchema.parse(content);
  } catch {
    return null;
  }
}
