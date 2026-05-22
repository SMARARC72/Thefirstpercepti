-- ============================================================================
-- Phase 24d / 6a.5 follow-up — Restore Bell-Marked Charm → harden_contradiction link
-- ============================================================================
-- Pre-6a.6 two-verification gate (Finding 4): item_bell_marked_charm originally
-- referenced spell_id='spell_harden_contradiction' (with prefix typo). The
-- spell ACTUALLY exists in catalog as 'harden_contradiction' (no prefix) in
-- public.imposed_spell — seeded in 6a.5 commit 2 (afa7fc0).
--
-- Q-CLOSURE-1 patched effects_on_use_structured to NULL (defer-to-v0.9) before
-- knowing imposed_spells would seed in same commit. Now that harden_contradiction
-- IS live, restoring the link with the corrected (no-prefix) spell_id closes
-- the loop. Item tags lose 'v0_9_on_use_effect_pending' (link restored) but
-- retain 'v0_9_crafting_graph_pending' (recipes still deferred per Q-CLOSURE-2).
--
-- Note: spell_id on effects_*_structured is resolved by engine at runtime —
-- can reference public.spell OR public.imposed_spell rows (both keyed by spell_id).
-- ============================================================================

UPDATE "public"."item"
SET
  effects_on_use_structured = '[
    {
      "effect_kind": "spell_cast",
      "spell_id": "harden_contradiction",
      "charges_per_use": 1,
      "magnitude_int": null
    }
  ]'::jsonb,
  tags = (
    SELECT jsonb_agg(t)
    FROM jsonb_array_elements_text(tags) AS t
    WHERE t != 'v0_9_on_use_effect_pending'
  )
WHERE item_id = 'item_bell_marked_charm';
