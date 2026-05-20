# STORY_ENGINE_AUDIT — Phase 8b / 8c / 8d punch list

> Three known story-engine issues, the evidence in the source, and the
> proposed fix for each. This document is the punch list a foundation
> worker reads before starting Phase 8b, 8c, or 8d. *LLM fallback
> aggressiveness is not in scope.* The decision in `RESTRUCTURE_PLAN.md`
> §"Decisions locked" was that it is fine as-is.

---

## Issue A — command parser misroutes (Phase 8b)

### What we know

The orchestrator routes free-text commands through
`IntentClassifier.classify()` (LLM-first, with a regex fallback below
0.55 confidence). The classifier returns a `reducer: ReducerKind`
that the engine then dispatches to. When the classification is wrong,
the player's command runs through a reducer that does not match
their intent, and the resulting tale entry feels disconnected.

### File path of the classifier

- `packages/llm-client/src/IntentClassifier.ts`
  - Regex map at line 70 (`REDUCER_VERBS`)
  - Domain hints at line 80 (`DOMAIN_HINTS`)
  - LLM system prompt at line 61 (`DEFAULT_SYSTEM_PROMPT`)
  - The regex-only fallback at line 227 (`regexClassify`)

A secondary, simpler parser lives in
`packages/narrative/src/NarrativeEngine.ts:142` (`_commandToPath`)
which selects an Ink path from a few keywords — that one is in scope
for Issue B, not here.

### Reproduction cases

Each row is a free-text command, the *expected* reducer, and the
*observed* reducer. Observations are reasoned from the regex map; any
case where the LLM might successfully classify is marked
**suspected; needs runtime verification**.

| # | Player command | Expected reducer | Observed reducer | Cause |
| --- | --- | --- | --- | --- |
| 1 | `take the matches` | `item` | `item` | OK on regex path (`take` is in `REDUCER_VERBS.item`). |
| 2 | `grab the matches` | `item` | `item` | OK. |
| 3 | `pick up the matches` | `item` | `narrative_only` | `pick` is not in any verb list. Regex falls through to `narrative_only`. **Suspected** — the LLM may catch this when configured. |
| 4 | `pocket the iron token` | `item` | `narrative_only` | Same root cause as #3. `pocket` is not in any verb list. |
| 5 | `read the testimony scrap` | `investigation` | `investigation` | OK (`read` is in `REDUCER_VERBS.investigation`). |
| 6 | `read the brass lens` (i.e. inspect, not investigate) | `item` (inspect) | `investigation` | Verb `read` belongs to investigation in the regex map, but the *target* is an inventory item. The classifier has no target awareness. **Suspected** — the LLM may guess `item` from context; the regex never will. |
| 7 | `cut the violet thread` | `item` (use) | `narrative_only` | `cut` is not in any verb list. |
| 8 | `flee fountain` | `move` | `move` | OK. |
| 9 | `run` (no target) | `move` | `move` | OK on regex; LLM may second-guess and emit `narrative_only`. **Suspected.** |
| 10 | `bind the reed to my teeth` | `item` (attunement, post-Phase-7) | `narrative_only` | `bind` is not in any verb list. Even post-Phase-7, the classifier needs a new verb-to-reducer route for attunement. |
| 11 | `pay the iron token to fennick` | `dialogue` | `item` | First verb is `pay` (not in any list, so regex falls through). The LLM may classify as `dialogue`; the regex picks the first verb-matching word and there is none. **Suspected** — depends on LLM. |
| 12 | `whisper to the foundling` | `dialogue` | `narrative_only` | `whisper` is not in `REDUCER_VERBS.dialogue` (which has `speak`, `ask`, `bargain`, `threaten`, `lie`, `talk`, `tell`). |

The pattern: the regex map is a small set of canonical verbs. Any
synonym the player reaches for (`pick up`, `grab`, `pocket`, `cut`,
`pay`, `whisper`, `bind`) routes to `narrative_only` and the engine
never runs a reducer. The LLM may save some of these — but only if
the LLM is configured *and* its `confidence` clears 0.55. When the
LLM is off (offline mode) or under-confident, every synonym misroutes.

### Proposed approach

1. **Expand the regex map** to cover the synonyms above. Aim for ~30
   verbs per `ReducerKind`, not 8. Build the synonym list from a
   single command log replay (the worker should add lightweight
   logging in `IntentClassifier` and run a 50-turn scripted session
   to harvest the actual vocabulary players reach for).
2. **Add minimal target-awareness** to the regex path: if the verb is
   ambiguous (`read`, `use`, `take`) *and* the command's noun phrase
   matches an inventory item by substring, prefer the `item`
   reducer. Cost: one inventory scan per misrouted command. Worth it.
3. **Tighten the LLM JSON-mode prompt** in `DEFAULT_SYSTEM_PROMPT`.
   The current prompt does not show an example. Add 3–5 worked
   examples in the system prompt and require the model to emit
   `reducer` *only* from the closed set — the model occasionally
   emits prose like `"reducer": "narrative"` which `sanitizeReducer`
   maps to `narrative_only`, silently dropping the player's intent.
4. **Add a regression spec set** at
   `packages/llm-client/src/IntentClassifier.regression.test.ts`
   containing every row in the table above as a regex-only test
   (LLM-off path). The LLM-on path remains best-effort. New
   misroutes get added to the spec on discovery.
5. **Lower the `acceptThreshold`** from 0.55 to a value the worker
   picks empirically. The current default is conservative; if the
   LLM is configured and reliable, accepting at 0.45 yields fewer
   `narrative_only` fall-throughs. Phase 8b's regression set tells
   the worker whether the threshold drop is safe.

---

## Issue B — Ink scene routing (Phase 8c)

### What we know

The narrative engine routes scene jumps through
`InkBridge.choosePath(path)` (`packages/narrative/src/InkBridge.ts:57`).
The path is either:

- A scene id passed to `enterScene()`
  (`packages/narrative/src/NarrativeEngine.ts:42`)
- A path computed by `_commandToPath()` for keyword-driven scene
  jumps (`packages/narrative/src/NarrativeEngine.ts:142`)
- A synthetic path like `combat_${encounterId}`, `dialogue_${npcId}`,
  `consequence_${consequenceId}`, or the literal `legacy_death`
  (`NarrativeEngine.ts:111`, `:118`, `:125`, `:132`).

Ink will *silently fail* if the path does not resolve to a knot. The
player sees an empty `NarrativeResult` and the tale stalls. There is
no runtime warning today.

### Scene files

All Ink content lives under `content/narrative/`:

- `main.ink` (the entrypoint, includes every scene)
- `scenes/arrival.ink`
- `scenes/fountain.ink`
- `scenes/archive.ink`
- `scenes/combat.ink`
- `scenes/dialogue.ink`
- `scenes/market.ink`
- `scenes/breach.ink`
- `scenes/dialogue_fennick.ink`
- `scenes/dialogue_foundling.ink`
- `scenes/dreams.ink`
- `systems/faction_reactions.ink`
- `systems/consequences.ink`
- `systems/legacy.ink`

### Knots vs jumps inventory

A static-pass walk of every `=== knot ===` and every `-> target`
across the tree, performed for this audit, returns:

- **64 knots defined** (e.g. `arrival`, `arrival_look`, `fountain`,
  `combat_attack`, `dialogue_sister_mourn`, `legacy_death`,
  `legacy_begin_again`).
- **54 distinct jump targets**.
- **Static-pass dead jumps: zero.** Every `-> name` target the
  regex pulled out exists as an `=== name ===` knot somewhere in the
  tree.

That sounds clean, but it is not the whole story. The *runtime* jump
points are also synthetic:

- `combat_${encounterId}` — the existing combat scenes define
  `combat_threat_emerges`, `combat_attack`, `combat_defend`,
  `combat_flee`, `combat_speak`. Any `encounterId` that does not
  match one of those five suffixes will silently miss.
- `dialogue_${npcId}` — defined: `dialogue_sister_mourn`,
  `dialogue_fennick`, `dialogue_foundling`. Any NPC id whose suffix
  does not match those three is a dead jump.
- `consequence_${consequenceId}` — defined: `consequence_danger_rise`,
  `consequence_faction_shift`, `consequence_wounded`. Any
  `consequenceId` outside those three suffixes is a dead jump.

There is no test that ensures the `encounterId` / `npcId` /
`consequenceId` values the engine generates at runtime correspond to
defined Ink knots. **This is the actual punch list** — synthetic
jumps that pass the static lint and still fail at runtime.

### Reproduction punch list

| # | Surface | Trigger | Expected | Observed |
| --- | --- | --- | --- | --- |
| 1 | `enterDialogue` | NPC id `npc-fennick` | jump to `dialogue_fennick` | OK (suffix matches). |
| 2 | `enterDialogue` | NPC id `npc-foundling-of-the-archive` | jump to `dialogue_foundling-of-the-archive` | **Dead jump.** Ink defines `dialogue_foundling`, not the full kebab. |
| 3 | `enterDialogue` | Any new NPC added to `content/world-data/npcs.json` | jump to `dialogue_<id>` | **Dead jump.** New NPCs do not get matching Ink knots automatically; the engine and the content drift. |
| 4 | `enterCombat` | encounter id `threat_emerges` | jump to `combat_threat_emerges` | OK. |
| 5 | `enterCombat` | encounter id `ambush-debt-court` | jump to `combat_ambush-debt-court` | **Dead jump.** Only five suffixes exist. |
| 6 | `triggerConsequence` | consequence id outside the three known suffixes | jump to `consequence_<id>` | **Dead jump.** |

### Proposed approach

1. **Add `npm run content:validate`** as a real script. It already
   exists in `package.json` as a stub script entry that points to
   `scripts/validate-content.mjs`; the file does not exist in
   `scripts/`. Build it. It must:
   - Parse every `.ink` file in `content/narrative/`.
   - Collect every `=== knot ===` (the supply side).
   - Collect every `-> target` (the static demand side).
   - **Also** read `content/world-data/npcs.json`,
     `content/world-data/factions.json`, and any reducer that
     synthesises a path (Phase 8c worker greps the codebase for
     `choosePath(\``) and verify that *every* synthetic jump's
     possible suffixes resolve to a defined knot.
   - Exit non-zero with a clear list of the dead jumps and which
     content row produced each.
2. **Wire `content:validate` into `npm run verify`** so the build
   refuses to ship with a dead jump.
3. **Fix the existing dead jumps** identified above by either
   (a) renaming the runtime suffix to match an existing knot, or
   (b) adding the missing knot in the appropriate scene file. Prefer
   (b) — the world content grows by adding knots, not by hiding
   missing ones.
4. **Document the synthetic-jump conventions** in `AGENTS.md` (or a
   new `docs/INK_AUTHORING.md`) so new NPCs / encounters /
   consequences land their knots in the same commit as the JSON row.

---

## Issue C — narrative / mechanics desync (Phase 8d)

### What we know

Every reducer emits one or more `TaleEntry` rows via
`makeTaleEntry()` (`packages/engine/src/engine-utils.ts`). The body
text is hard-coded per band. When the band classification and the
narrative do not match, the player reads a tale entry that lies about
what happened mechanically — e.g. "you strike true" on a miss.

The seven result bands are defined in `packages/types/src/index.ts:17`
as `RESULT_BANDS`:

```
critical_failure | failure | partial_failure | success_with_cost |
clean_success    | strong_success | critical_success
```

A roll is classified into a band by `rollD20()`
(`packages/engine/src/engine-utils.ts:40`) using margin = total − DC.
Reducers then **switch on the band string** to decide what tale
entry to emit, and they sometimes get the mapping wrong.

### Reducers needing audit

Five reducers emit tale entries. Each is listed with the cases I see
today that desync.

1. **`combatReducer.ts`** (`packages/engine/src/reducers/combatReducer.ts`)
   - Line 50: on `failure`, the tale says *"You fail to connect."* —
     accurate — *but then on line 53 the reducer also deals
     retaliation damage to the player*. The tale does not mention the
     retaliation. The player loses HP with no narrative explanation.
     **Desync.**
   - Line 57: on `partial_failure`, the tale says *"A glancing blow"*
     — implies damage was dealt — but the patch (line 60) decrements
     the NPC's `body` stat by 1, not HP. The tale's implication does
     not match the mechanical change. **Desync.**
   - Line 67–88: on any "hit" band (`success_with_cost`,
     `clean_success`, `strong_success`, `critical_success`), the
     reducer collapses to a single damage formula and a single tale
     line. Critical successes feel identical to clean successes.
     **Flavour-bug, not strictly a desync, but on the audit list.**

2. **`moveReducer.ts`** (`packages/engine/src/reducers/moveReducer.ts`)
   - Line 92: `if (isSneak && roll.band === 'clean_success' || roll.band === 'strong_success' || roll.band === 'critical_success')`
     — **operator-precedence bug.** Reads as `(isSneak && clean_success) OR strong_success OR critical_success`,
     so the *Silent Passage* tale fires for any strong/critical
     success even when the player did not sneak. **Hard desync.**
   - Line 69: `critical_failure` and `failure` are merged into one
     tale, but only `flee` triggers the `frightened` condition. A
     non-flee `failure` and a `critical_failure` produce identical
     tale text despite very different mechanical severity. **Desync.**

3. **`restReducer.ts`** (`packages/engine/src/reducers/restReducer.ts`)
   - Line 28: on `critical_failure`, tale is *"Nightmare … Something
     watches"* and HP drops by 1. Accurate.
   - Line 33–47: on any success band, tale is *"You recover N
     vitality"* — accurate — but the **band itself is never named**
     in the tale, so the player cannot tell *why* the heal value was
     2 vs 4 vs 6. Soft desync (the mechanics are honest, but the
     surface hides the band). **Audit, but lower priority.**
   - Line 50: the *Intrusion* danger-vulnerability tale fires
     independently of the band on a probability roll. When it fires
     alongside a `clean_success` rest, the tale order reads
     contradictorily ("rest, then intrusion"). **Desync.**

4. **`dialogueReducer.ts`** (`packages/engine/src/reducers/dialogueReducer.ts`)
   - Line 44: on `critical_failure`, tale says NPC is *"deeply
     offended"* and the NPC flips to `hostile`. Accurate.
   - Line 51–62: any band ≥ `success_with_cost` collapses to *"NPC
     listens"*, regardless of whether the player threatened, lied,
     or asked. A successful threat reads the same as a successful
     bargain. **Desync — the verb is lost.**

5. **`investigationReducer.ts`** (`packages/engine/src/reducers/investigationReducer.ts`)
   - Line 38–39: on `failure`, tale is *"You find nothing of note."*
     Accurate.
   - Line 64–66: when no POI was discovered on a success roll, the
     fallback tale is *"You sense something hidden here"* — but that
     fires *because the DC outran the POI gating*, not because
     anything was actually hidden. The tale is wishful. **Desync.**

The same audit covers `itemReducer.ts`, `deathReducer.ts`, and
`conditionReducer.ts` — they are on the list, but the worst desyncs
sit in combat / move / dialogue.

### Proposed approach

1. **Introduce a `RollBand` enum** in `packages/types/src/index.ts`:

   ```ts
   export type RollBand =
     | "critical-fail"
     | "miss"
     | "partial"
     | "success"
     | "critical-success";
   ```

   Map the existing seven `ResultBand` strings into this five-band
   surface for tale-entry classification (the seven-band granularity
   is fine for *mechanical* effects; the five-band surface is
   sufficient for *narrative* honesty). The mapping is one-way and
   stable: `critical_failure → critical-fail`, `failure → miss`,
   `partial_failure → partial`, `success_with_cost → success`,
   `clean_success → success`, `strong_success → success`,
   `critical_success → critical-success`.
2. **Every reducer must classify its outcome into a `RollBand`** and
   then look up the tale entry from a per-reducer table keyed by
   `RollBand`. No more inline tale strings inside `if` branches —
   the classification is explicit and tabular.
3. **Add a tale-narrative consistency test set** at
   `packages/engine/tests/tale-band-consistency.spec.ts`. For every
   reducer × every `RollBand`, run the reducer with a forced roll
   and assert:
   - The tale entry's `tone` matches the band's expected tone
     (success / quiet / warning / danger / cosmic).
   - The tale's body does **not** contain banned phrasing for the
     band — e.g. a `miss` tale must not contain "strike", "hit",
     "wound"; a `success` tale must not contain "miss", "fumble".
   - The mechanical patches match the band — e.g. a `miss` tale
     paired with HP-loss patches must declare the HP loss in the
     tale body.
4. **Fix the operator-precedence bug at `moveReducer.ts:92`.** Parens
   it correctly. Add a regression test.
5. **Surface the verb in dialogue success tales.** A successful
   `threaten` should read differently from a successful `bargain`
   even if the band is the same. Phase 8d adds a `verb` axis to the
   dialogue tale table.
6. **Order rest reducer narratives correctly.** When the *Intrusion*
   rolls fires, push its tale entry *before* the *Rest* tale entry
   so the order is "intrusion, then rest" not "rest, then intrusion."

---

## 4. Out of scope for Phase 8b–d

To prevent scope creep, the following are **not** part of the Phase
8b–d work even though they touch the story engine:

- **LLM fallback aggressiveness.** The decision in
  `RESTRUCTURE_PLAN.md` was that the current 0.55 threshold and the
  fallback-on-error behaviour are correct. Phase 8b *may* tune the
  threshold inside that envelope, but does not change the fallback
  policy.
- **The Living World orchestrator** (`TurnOrchestrator`,
  `NPCSubagent`, `FactionSubagent`, `GMNarrator`). Cross-run NPC
  memory and faction pulse are orthogonal to the three issues above
  and ship as-is.
- **Ink runtime upgrades** (`inkjs` version, new Ink syntax,
  external function bindings). Phase 8c only walks the existing
  graph; it does not add new Ink features.
- **Combat action economy** (action + bonus + reaction). That is
  Phase 9.
- **Spell-slot recharge model.** Phase 10.
- **Performance work on the classifier** (warm-up, batched LLM
  calls). Out of scope; orthogonal.
- **Streaming LLM token output.** Phase 11.

A worker arriving at any of the rows in this document and finding
the world has drifted (a misroute the row didn't anticipate, an Ink
knot now defined, a desync now corrected) should **edit this file in
place** and remove or update the row. The audit's value is that it
stays current.
