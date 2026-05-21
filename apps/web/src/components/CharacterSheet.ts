/**
 * ============================================================================
 * CHARACTER SHEET v3 — UI-404
 * ============================================================================
 * Phase 20 / Wave J / UI-404. Wireframe sources: CHAR3_02.html (spells tab),
 * CHAR3_03.html / CHAR3_06.html (other tabs).
 *
 * Five tabs:
 *   1. Stats         — core stats + HP/Focus + hit dice + proficiency
 *   2. Inventory     — embeds InventoryPanel (UI-404 + TS-MIGRATE)
 *   3. Spells        — slots / hotbar / known-prepared / cost layer
 *   4. Conditions    — active conditions with glyph + recovery hints
 *   5. Path Ledger   — v0.6 path_ledger entries (domain + weight + phrase)
 *
 * Tabs are an aria-role="tablist" group; the active tab is selected via
 * arrow keys + Enter/Space. Per design discipline:
 *   - allowed ornaments only (◆ ❦ ↻ → ·)
 *   - no bounce; tab switch is an instant content swap (no slide)
 *   - cost layer (spells) is surfaced BEFORE commit; cantrips show cost = 0
 *
 * v0.6 ItemSchema discriminator narrowing — load-bearing per HANDOFF.md:
 * the inventory tab uses InventoryPanel.ts which narrows item.type to
 * weapons/armor/shields and surfaces the type-specific badge. The spells
 * tab does the analogous narrow on spell.cost_layer (cantrips have none).
 * ============================================================================
 */

import type { Player, Item, EquipSlot } from "@first-perception/types";
import type { PathLedgerEntry, Condition } from "@first-perception/types";
import { createInventoryPanel } from "./InventoryPanel.js";

export type CharacterSheetTab = "stats" | "inventory" | "spells" | "conditions" | "path";

export const CHARACTER_SHEET_TABS: readonly CharacterSheetTab[] = [
  "stats",
  "inventory",
  "spells",
  "conditions",
  "path",
] as const;

const TAB_LABEL: Record<CharacterSheetTab, string> = {
  stats: "Stats",
  inventory: "Inventory",
  spells: "Spells",
  conditions: "Conditions",
  path: "Path Ledger",
};

/**
 * Spell-tab data — Phase 20 doesn't add a spell system; it surfaces what's
 * already on the player. cost_layer is the R-51 universal canon-cost from
 * the v0.6 schema (Fatigue / Notice / Authority / Ruin / Creation). The
 * cost layer is OPTIONAL — cantrips (L0) don't carry it per R-51, and
 * absence renders as "free / cantrip".
 */
export interface SpellEntry {
  spell_id: string;
  name: string;
  level: number;
  prepared?: boolean;
  /** v0.6 imposed_spell discriminator. Tide-bloom border per CHAR3_02. */
  is_imposed?: boolean;
  cost_layer?: {
    fatigue?: number;
    notice?: number;
    authority?: number;
    ruin?: number;
    creation?: number;
    corruption?: number;
  };
}

export interface CharacterSheetProps {
  player: Player;
  activeTab?: CharacterSheetTab;
  /** Known spells (engine-provided; Phase 20 doesn't compute these). */
  spells?: readonly SpellEntry[];
  /** Spell slots remaining per level. */
  spellSlots?: Record<number, { max: number; current: number }>;
  /** Path Ledger entries (v0.6 PathLedgerEntry from generated.ts). */
  pathLedger?: readonly PathLedgerEntry[];
  /** Equipped slot → item_id map for InventoryPanel. */
  equippedSlots?: ReadonlyMap<EquipSlot, string>;
  onTabChange?: (tab: CharacterSheetTab) => void;
  onEquip?: (itemId: string) => void;
  onUnequip?: (slotId: string) => void;
  onCastSpell?: (spellId: string) => void;
}

export function createCharacterSheet(props: CharacterSheetProps): HTMLElement {
  const activeTab: CharacterSheetTab = props.activeTab ?? "stats";

  const root = document.createElement("section");
  root.className = "character-sheet panel grimoire-grain";
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Character sheet");
  root.dataset.testid = "character-sheet";
  root.dataset.activeTab = activeTab;

  // ── tablist
  const tablist = document.createElement("div");
  tablist.className = "character-sheet-tabs";
  tablist.setAttribute("role", "tablist");
  tablist.setAttribute("aria-label", "Character sheet sections");
  tablist.dataset.testid = "character-sheet-tablist";

  const tabButtons = new Map<CharacterSheetTab, HTMLButtonElement>();
  for (const tab of CHARACTER_SHEET_TABS) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "character-sheet-tab";
    btn.dataset.tab = tab;
    btn.setAttribute("role", "tab");
    btn.setAttribute("aria-controls", `character-sheet-panel-${tab}`);
    btn.id = `character-sheet-tab-${tab}`;
    btn.setAttribute("aria-selected", tab === activeTab ? "true" : "false");
    btn.tabIndex = tab === activeTab ? 0 : -1;
    btn.textContent = TAB_LABEL[tab];
    btn.addEventListener("click", () => switchTab(tab));
    btn.addEventListener("keydown", (e) => {
      if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        e.preventDefault();
        const idx = CHARACTER_SHEET_TABS.indexOf(tab);
        const nextIdx =
          e.key === "ArrowRight"
            ? (idx + 1) % CHARACTER_SHEET_TABS.length
            : (idx - 1 + CHARACTER_SHEET_TABS.length) % CHARACTER_SHEET_TABS.length;
        switchTab(CHARACTER_SHEET_TABS[nextIdx]);
        tabButtons.get(CHARACTER_SHEET_TABS[nextIdx])?.focus();
      }
    });
    tabButtons.set(tab, btn);
    tablist.appendChild(btn);
  }
  root.appendChild(tablist);

  // ── panel host (single panel slot; content is rebuilt per active tab to
  // avoid stale references after props change.)
  const panelHost = document.createElement("div");
  panelHost.className = "character-sheet-panel-host";
  panelHost.dataset.testid = "character-sheet-panel-host";
  root.appendChild(panelHost);

  function switchTab(tab: CharacterSheetTab): void {
    if (tab === root.dataset.activeTab) return;
    root.dataset.activeTab = tab;
    for (const [t, btn] of tabButtons) {
      btn.setAttribute("aria-selected", t === tab ? "true" : "false");
      btn.tabIndex = t === tab ? 0 : -1;
    }
    renderActive(tab);
    props.onTabChange?.(tab);
  }

  function renderActive(tab: CharacterSheetTab): void {
    panelHost.innerHTML = "";
    panelHost.appendChild(renderTab(tab, props));
  }

  renderActive(activeTab);

  return root;
}

// ----------------------------------------------------------------------------
// Per-tab renderers — each returns a panel element with id and role="tabpanel".
// Kept module-private; tests verify behaviour through createCharacterSheet.
// ----------------------------------------------------------------------------

function renderTab(tab: CharacterSheetTab, props: CharacterSheetProps): HTMLElement {
  switch (tab) {
    case "stats":
      return renderStatsTab(props);
    case "inventory":
      return renderInventoryTab(props);
    case "spells":
      return renderSpellsTab(props);
    case "conditions":
      return renderConditionsTab(props);
    case "path":
      return renderPathTab(props);
  }
}

function wrapPanel(tab: CharacterSheetTab, body: HTMLElement): HTMLElement {
  const panel = document.createElement("div");
  panel.className = `character-sheet-panel character-sheet-panel-${tab}`;
  panel.id = `character-sheet-panel-${tab}`;
  panel.setAttribute("role", "tabpanel");
  panel.setAttribute("aria-labelledby", `character-sheet-tab-${tab}`);
  panel.dataset.testid = `character-sheet-panel-${tab}`;
  panel.appendChild(body);
  return panel;
}

function renderStatsTab(props: CharacterSheetProps): HTMLElement {
  const { player } = props;
  const wrap = document.createElement("div");
  wrap.className = "stats-tab";

  const ident = document.createElement("header");
  ident.className = "stats-identity";
  const nameEl = document.createElement("h3");
  nameEl.className = "stats-name";
  nameEl.textContent = player.name;
  ident.appendChild(nameEl);
  const formEl = document.createElement("p");
  formEl.className = "stats-form";
  formEl.textContent = `${player.formLabel} · ${player.postureLabel}`;
  ident.appendChild(formEl);
  wrap.appendChild(ident);

  const grid = document.createElement("dl");
  grid.className = "stats-grid";
  grid.dataset.testid = "stats-grid";
  const statEntries: Array<[string, string]> = [
    ["HP", `${player.hp} / ${player.maxHp}`],
    ["Focus", `${player.focus} / ${player.maxFocus}`],
    ["Proficiency", `+${player.proficiencyBonus}`],
  ];
  for (const [key, value] of Object.entries(player.stats)) {
    statEntries.push([key, String(value)]);
  }
  for (const [k, v] of statEntries) {
    const dt = document.createElement("dt");
    dt.className = "stats-key";
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.className = "stats-value";
    dd.textContent = v;
    grid.appendChild(dt);
    grid.appendChild(dd);
  }
  wrap.appendChild(grid);

  return wrapPanel("stats", wrap);
}

function renderInventoryTab(props: CharacterSheetProps): HTMLElement {
  const inv = createInventoryPanel({
    player: props.player,
    equippedSlots: props.equippedSlots,
    onEquip: props.onEquip,
    onUnequip: props.onUnequip,
  });
  return wrapPanel("inventory", inv);
}

function renderSpellsTab(props: CharacterSheetProps): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "spells-tab";

  // ── slots
  if (props.spellSlots) {
    const slotRow = document.createElement("div");
    slotRow.className = "spell-slots";
    slotRow.dataset.testid = "spell-slots";
    for (const level of Object.keys(props.spellSlots).sort((a, b) => Number(a) - Number(b))) {
      const slot = props.spellSlots[Number(level)];
      const lbl = document.createElement("span");
      lbl.className = "spell-slot-level";
      lbl.textContent = `L${level}`;
      slotRow.appendChild(lbl);
      for (let i = 0; i < slot.max; i++) {
        const dot = document.createElement("span");
        dot.className = i < slot.current ? "slot-dot" : "slot-dot spent";
        dot.setAttribute("aria-hidden", "true");
        slotRow.appendChild(dot);
      }
    }
    wrap.appendChild(slotRow);
  }

  // ── known + cost-layer surface
  const list = document.createElement("ul");
  list.className = "spell-list";
  list.dataset.testid = "spell-list";
  list.setAttribute("role", "list");
  const spells = props.spells ?? [];
  if (spells.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-note";
    empty.textContent = "No spells known.";
    list.appendChild(empty);
  } else {
    for (const spell of spells) {
      const row = document.createElement("li");
      row.className = `spell-row${spell.is_imposed ? " imp" : ""}`;
      row.dataset.spellId = spell.spell_id;
      if (spell.is_imposed) row.dataset.imposed = "true";

      const bullet = document.createElement("span");
      bullet.className = "spell-row-bullet";
      bullet.textContent = spell.prepared ? "●" : "○";
      bullet.setAttribute("aria-hidden", "true");
      row.appendChild(bullet);

      const name = document.createElement("span");
      name.className = "spell-row-name";
      name.textContent = `${spell.name} · L${spell.level}`;
      row.appendChild(name);

      // Cost-layer surface BEFORE commit (per CHAR3_02 wireframe + R-51).
      const cost = document.createElement("span");
      cost.className = "spell-row-cost";
      cost.dataset.testid = `spell-cost-${spell.spell_id}`;
      cost.textContent = formatCostLayer(spell);
      row.appendChild(cost);

      if (props.onCastSpell) {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "spell-row-cast";
        btn.textContent = "Cast";
        btn.addEventListener("click", () => props.onCastSpell!(spell.spell_id));
        row.appendChild(btn);
      }

      list.appendChild(row);
    }
  }
  wrap.appendChild(list);

  return wrapPanel("spells", wrap);
}

/**
 * Format a spell's R-51 cost layer for the pre-commit display. Cantrips
 * (L0) correctly lack cost_layer and render as "free" per R-51. Returns
 * "free" for any spell with no cost_layer set.
 */
function formatCostLayer(spell: SpellEntry): string {
  if (!spell.cost_layer) return spell.level === 0 ? "free · cantrip" : "free";
  const parts: string[] = [];
  if (spell.cost_layer.fatigue) parts.push(`fat +${spell.cost_layer.fatigue}`);
  if (spell.cost_layer.notice) parts.push(`ntc +${spell.cost_layer.notice}`);
  if (spell.cost_layer.authority) parts.push(`auth +${spell.cost_layer.authority}`);
  if (spell.cost_layer.ruin) parts.push(`ruin +${spell.cost_layer.ruin}`);
  if (spell.cost_layer.creation) parts.push(`crt +${spell.cost_layer.creation}`);
  if (spell.cost_layer.corruption) parts.push(`crp +${spell.cost_layer.corruption}`);
  return parts.length ? parts.join(" · ") : "free";
}

function renderConditionsTab(props: CharacterSheetProps): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "conditions-tab";
  const list = document.createElement("ul");
  list.className = "conditions-list";
  list.dataset.testid = "conditions-list";
  list.setAttribute("role", "list");

  const conditions: Condition[] = props.player.conditions ?? [];
  if (conditions.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-note";
    empty.textContent = "No active conditions.";
    list.appendChild(empty);
  } else {
    for (const condition of conditions) {
      const row = document.createElement("li");
      row.className = "condition-row";
      row.dataset.conditionId = condition.id;

      const glyph = document.createElement("span");
      glyph.className = "condition-glyph";
      glyph.textContent = (condition.name ?? condition.id).slice(0, 3).toUpperCase();
      row.appendChild(glyph);

      const name = document.createElement("span");
      name.className = "condition-name";
      name.textContent = condition.name;
      row.appendChild(name);

      const remaining = document.createElement("span");
      remaining.className = "condition-remaining";
      remaining.textContent =
        condition.turnsRemaining === null
          ? "until canon-event"
          : `${condition.turnsRemaining} turns`;
      row.appendChild(remaining);

      list.appendChild(row);
    }
  }
  wrap.appendChild(list);
  return wrapPanel("conditions", wrap);
}

function renderPathTab(props: CharacterSheetProps): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "path-tab";
  const list = document.createElement("ol");
  list.className = "path-ledger";
  list.dataset.testid = "path-ledger";

  const entries = props.pathLedger ?? [];
  if (entries.length === 0) {
    const empty = document.createElement("li");
    empty.className = "empty-note";
    empty.textContent = "No path entries yet. Choices accumulate here.";
    list.appendChild(empty);
  } else {
    for (const entry of entries) {
      const li = document.createElement("li");
      li.className = "path-entry";
      li.dataset.entryId = entry.entry_id;
      li.dataset.domain = entry.domain;

      const dom = document.createElement("span");
      dom.className = "path-entry-domain";
      dom.textContent = entry.domain.toUpperCase();
      li.appendChild(dom);

      const weight = document.createElement("span");
      weight.className = "path-entry-weight";
      weight.textContent = entry.weight > 0 ? `+${entry.weight}` : String(entry.weight);
      li.appendChild(weight);

      if (entry.narrative_phrase) {
        const phrase = document.createElement("p");
        phrase.className = "path-entry-phrase";
        phrase.textContent = entry.narrative_phrase;
        li.appendChild(phrase);
      }

      list.appendChild(li);
    }
  }
  wrap.appendChild(list);
  return wrapPanel("path", wrap);
}

// ----------------------------------------------------------------------------
// Re-export Item for caller convenience — the inventory tab consumes Item[]
// via player.inventory; surfacing the type alias here keeps imports tight.
// ----------------------------------------------------------------------------
export type { Item };
