# Database Schema Notes

## Smoke validation

Run the local schema smoke test from the workspace root:

```powershell
Set-Location .\scripts\schema
npm ci
npm run smoke
```

The smoke test uses an in-memory SQLite engine through `sql.js`; it does not require
an external database service. It applies `database/schema.sql`, enables foreign
keys, runs `PRAGMA foreign_key_check`, queries every view, verifies seeded
condition enum references, checks key seed row counts, and exercises the NPC
death cascade trigger.

## Repaired risks

- `v_player_summary` now reads `current_turn` from `campaign`, not `player`.
- Seeded `condition` rows for `debt_bound` and `exhausted` are covered by smoke
  checks against `enum_condition_type`.
- `trg_npc_death_cascade` now writes the NPC location's `region_id` to
  `world_pulse.source_region_id` instead of writing a location id into a region
  foreign key.

## Remaining SQL risks

- Several columns store JSON arrays of ids, such as connected locations,
  neighboring regions, NPC presence, and item presence. SQLite foreign keys do
  not validate ids inside those JSON blobs.
- Polymorphic ownership columns such as `item.held_by_type` and `item.held_by_id`
  cannot be fully enforced by declarative foreign keys.
- The schema is currently seeded as a large monolithic script. Runtime migrations,
  rollback behavior, and idempotent seed updates still need a separate migration
  strategy before this becomes production persistence.
- The TypeScript engine and SQL schema are still not proven to share a canonical
  model or mapper layer; this smoke test only validates the SQL surface.
