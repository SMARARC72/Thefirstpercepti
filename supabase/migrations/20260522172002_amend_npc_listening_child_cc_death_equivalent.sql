-- ============================================================================
-- Phase 24d / 6a hygiene — Listening Child CC death-equivalent amend
-- ============================================================================
-- Per Q-LISTENING-CHILD-CC-HYGIENE ratification (commit 1 surface, ratified
-- alongside Q-CLOSURE-1..5 greenlight). Audit found neither of LC's 2 CC
-- entries carried death-equivalent semantic per Death's binding rule:
--   - special_state: LC gifts pebble + REMAINS at fountain (continuity)
--   - passover_state: substrate re-anchors LC ELSEWHERE (substrate-elsewhere
--     displacement; entity continues at another location)
--
-- Remedy (ratified): add a 3rd CC entry with kind='death_state',
-- player_reachable=false, semantic = constraint-dissolution. Same shape as
-- Butcher's death_state (catastrophic Bell Court ledger-tampering dissolves
-- the substrate-anchor that holds LC at the fountain; she does NOT re-anchor
-- elsewhere — the substrate naming process disperses without an anchor;
-- the Listening Child as a continuous entity ENDS).
--
-- Low-priority verification note (per ratification): tagged
-- non_orphan_in: "v0.9" — no v0.8 plot or consequence-chain consumer triggers
-- Bell Court ledger-tampering against Listening Child in slice content.
-- Re-evaluate when v0.9 plot expansion lands.
-- ============================================================================

UPDATE "public"."npc"
SET closing_conditions = closing_conditions || '[
  {
    "kind": "death_state",
    "description": "Catastrophic Bell Court ledger-tampering (sustained doctrinal-civic ledger naming of the dry fountain'' s substrate process AS a Bell Court asset) dissolves the substrate-anchor constraint that holds the Listening Child at the fountain. She does NOT re-anchor elsewhere — the substrate naming process disperses without an anchor; the Listening Child as a continuous entity ENDS.",
    "player_reachable": false,
    "consequence_summary": "Listening Child permanently absent from the dry fountain and from all substrate-naming-significant locations; pebble path permanently closed; substrate-aware-utterance recognition mechanism dissolves regionally; Bell Court schism (the ledger-tampering faction loses internal legitimacy); Drowned Church marks the dissolution as a doctrinal incident requiring response; canon-event-emergent NPCs may stop emerging in the region for a recovery period.",
    "non_orphan_in": "v0.9"
  }
]'::jsonb
WHERE npc_id = 'npc-the-listening-child';
