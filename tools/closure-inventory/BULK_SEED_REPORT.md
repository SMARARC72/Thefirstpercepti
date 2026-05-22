# Phase 24d / 6a.5 commit 2 — Bulk-seed spot-check report

**Generated:** 2026-05-22T17:16:22.357Z
**Discipline:** Q-CLOSURE-5 pre-commit spot-check (Discipline 9 spirit)
**Stop threshold:** >25% broken-row rate on any catalog → STOP + surface

## Summary

| catalog | total | clean | broken | broken_% | status |
|---|---|---|---|---|---|
| conditions | 4 | 4 | 0 | 0% | OK |
| litanies | 20 | 20 | 0 | 0% | OK |
| marginalia | 25 | 25 | 0 | 0% | OK |
| imposed_spells | 5 | 5 | 0 | 0% | OK |
| recipes | 12 | 0 | 12 | 100% | deferred (Q-CLOSURE-2) |

**Overall:** OK — all catalogs below threshold; safe to proceed with candidate seed sets

### Broken rows — recipes

- `salt_iron_dagger` — produces_item_id=item_salt_iron_dagger not in closure; materials[].material_id=mat_salt_iron (no materials in closure; v0.9 defer); materials[].material_id=mat_salt_reagent (no materials in closure; v0.9 defer)
- `vial_of_practicing_water` — produces_item_id=item_vial_practiced_name_water not in closure; materials[].material_id=mat_salt_reagent (no materials in closure; v0.9 defer); materials[].material_id=mat_practicing_water (no materials in closure; v0.9 defer)
- `bell_marked_charm` — materials[].material_id=mat_bell_tin (no materials in closure; v0.9 defer); materials[].material_id=item_vial_practiced_name_water (no materials in closure; v0.9 defer)
- `drowned_bronze_buckler` — produces_item_id=item_drowned_bronze_buckler not in closure; materials[].material_id=mat_drowned_bronze (no materials in closure; v0.9 defer); materials[].material_id=mat_salt_reagent (no materials in closure; v0.9 defer)
- `potion_of_salt_sleep` — produces_item_id=item_potion_salt_sleep not in closure; materials[].material_id=mat_salt_reagent (no materials in closure; v0.9 defer); materials[].material_id=mat_butchers_salt (no materials in closure; v0.9 defer); materials[].material_id=mat_oil_reagent (no materials in closure; v0.9 defer)
- `purgative_tincture` — produces_item_id=item_purgative_tincture not in closure; materials[].material_id=mat_lime_reagent (no materials in closure; v0.9 defer); materials[].material_id=mat_fountain_water (no materials in closure; v0.9 defer); materials[].material_id=mat_marrow_wax_trace (no materials in closure; v0.9 defer)
- `unrecorded_ink` — produces_item_id=item_unrecorded_ink not in closure; materials[].material_id=mat_unrecorded_ink_base (no materials in closure; v0.9 defer); materials[].material_id=mat_practicing_water (no materials in closure; v0.9 defer); materials[].material_id=mat_butchers_salt (no materials in closure; v0.9 defer)
- `recipe_drowned_amber_pendant` — materials[].material_id=mat_drowned_amber (no materials in closure; v0.9 defer); materials[].material_id=mat_leather_cord_salt_cured (no materials in closure; v0.9 defer); materials[].material_id=mat_small_relic_fragment (no materials in closure; v0.9 defer)
- `recipe_marrow_wax_candle_minor` — produces_item_id=item_marrow_wax_candle_minor not in closure; materials[].material_id=mat_marrow_rendered (no materials in closure; v0.9 defer); materials[].material_id=mat_beeswax_pure (no materials in closure; v0.9 defer); materials[].material_id=mat_wick_linen (no materials in closure; v0.9 defer); materials[].material_id=mat_salt_rime_shard (no materials in closure; v0.9 defer)
- `recipe_iron_witness_token` — produces_item_id=item_iron_witness_token not in closure; materials[].material_id=mat_iron_pure (no materials in closure; v0.9 defer); materials[].material_id=mat_meteoric_iron_pinch (no materials in closure; v0.9 defer); materials[].material_id=mat_bell_court_seal_wax (no materials in closure; v0.9 defer)
- `recipe_salt_rime_amulet` — produces_item_id=item_salt_rime_amulet not in closure; materials[].material_id=mat_salt_rime_shard (no materials in closure; v0.9 defer); materials[].material_id=mat_silver_wire_thin (no materials in closure; v0.9 defer); materials[].material_id=mat_vial_of_practiced_name_water (no materials in closure; v0.9 defer)
- `recipe_drowned_cathedral_fishskin_prayer` — produces_item_id=item_fishskin_prayer_slip not in closure; materials[].material_id=mat_dried_fishskin_small (no materials in closure; v0.9 defer); materials[].material_id=mat_drowned_red_ink_vial (no materials in closure; v0.9 defer); materials[].material_id=mat_marrow_wax_drop (no materials in closure; v0.9 defer)

## Candidate seed sets

Clean rows written to `tools/closure-inventory/.candidate/` (one JSON per catalog).
Use these as the source for 6a.5 commit 2c seed migrations.