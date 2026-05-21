/**
 * @vitest-environment happy-dom
 */
// ============================================================================
// Character Sheet v3 tests — UI-404
// ============================================================================
// Phase 20 / Wave J. Five-tab character sheet with v0.6 ItemSchema
// discriminator narrowing in the inventory tab + R-51 cost-layer surfacing
// in the spells tab.
// ============================================================================

import { describe, it, expect, beforeEach } from "vitest";
import {
  createCharacterSheet,
  CHARACTER_SHEET_TABS,
  type CharacterSheetTab,
  type SpellEntry,
} from "../CharacterSheet.js";
import type { Item, Player, PathLedgerEntry, Condition } from "@first-perception/types";

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "player",
    name: "Khojen",
    form: "spirit_bound" as Player["form"],
    formLabel: "Indebted",
    posture: "witness" as Player["posture"],
    postureLabel: "Witness",
    domain: "lore" as Player["domain"],
    stats: { might: 10, grace: 11, wit: 12, presence: 13, will: 14, sense: 15 } as unknown as Player["stats"],
    hp: 18,
    maxHp: 22,
    focus: 4,
    maxFocus: 6,
    conditions: [],
    inventory: [],
    tags: [],
    proficiencyBonus: 2,
    hitDice: { d6: 0, d8: 2, d10: 0, d12: 0 } as unknown as Player["hitDice"],
    savingThrowProficiencies: [],
    attunementSlots: { used: 1, max: 3 },
    ...overrides,
  };
}

const weapon: Item = {
  item_id: "itm_dagger",
  name: "Dagger",
  type: "weapon",
  rarity: "common",
  weight_kg: 0.5,
  equip_slot: "main_hand",
  tinting_class: "vellum_mundane",
  subtype: "simple_melee",
  damage_dice: "1d4",
  damage_type: "piercing",
};

const armor: Item = {
  item_id: "itm_chain_shirt",
  name: "Chain Shirt",
  type: "armor",
  rarity: "common",
  weight_kg: 9,
  equip_slot: "armor",
  tinting_class: "vellum_mundane",
  subtype: "medium",
  armor_ac_base: 13,
};

describe("CharacterSheet — tablist + switching", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("renders all 5 tabs with the correct roles + labels", () => {
    const sheet = createCharacterSheet({ player: makePlayer() });
    const tablist = sheet.querySelector("[data-testid='character-sheet-tablist']");
    expect(tablist).not.toBeNull();
    expect(tablist?.getAttribute("role")).toBe("tablist");
    const tabs = sheet.querySelectorAll("button[role='tab']");
    expect(tabs).toHaveLength(5);
    expect(Array.from(tabs).map((t) => (t as HTMLElement).dataset.tab)).toEqual([
      "stats",
      "inventory",
      "spells",
      "conditions",
      "path",
    ]);
  });

  it("defaults to Stats tab when activeTab not given", () => {
    const sheet = createCharacterSheet({ player: makePlayer() });
    expect(sheet.dataset.activeTab).toBe("stats");
    expect(sheet.querySelector("[data-testid='character-sheet-panel-stats']")).not.toBeNull();
  });

  it("respects activeTab prop when given", () => {
    const sheet = createCharacterSheet({ player: makePlayer(), activeTab: "conditions" });
    expect(sheet.dataset.activeTab).toBe("conditions");
    expect(sheet.querySelector("[data-testid='character-sheet-panel-conditions']")).not.toBeNull();
    expect(sheet.querySelector("[data-testid='character-sheet-panel-stats']")).toBeNull();
  });

  it("clicking a tab swaps the panel and fires onTabChange", () => {
    const switched: CharacterSheetTab[] = [];
    const sheet = createCharacterSheet({
      player: makePlayer(),
      onTabChange: (tab) => switched.push(tab),
    });
    (sheet.querySelector("button[data-tab='spells']") as HTMLButtonElement).click();
    expect(sheet.dataset.activeTab).toBe("spells");
    expect(sheet.querySelector("[data-testid='character-sheet-panel-spells']")).not.toBeNull();
    expect(switched).toEqual(["spells"]);
  });

  it("clicking the already-active tab is a no-op", () => {
    const switched: CharacterSheetTab[] = [];
    const sheet = createCharacterSheet({
      player: makePlayer(),
      activeTab: "stats",
      onTabChange: (t) => switched.push(t),
    });
    (sheet.querySelector("button[data-tab='stats']") as HTMLButtonElement).click();
    expect(switched).toEqual([]);
  });

  it("arrow-right key on a tab moves to the next tab (with wrap)", () => {
    document.body.appendChild(createCharacterSheet({ player: makePlayer() }));
    const tab = document.querySelector("button[data-tab='path']") as HTMLButtonElement;
    tab.focus();
    tab.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
    expect((document.activeElement as HTMLElement).dataset.tab).toBe("stats");
  });

  it("arrow-left key wraps from stats back to path", () => {
    document.body.appendChild(createCharacterSheet({ player: makePlayer() }));
    const tab = document.querySelector("button[data-tab='stats']") as HTMLButtonElement;
    tab.focus();
    tab.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    expect((document.activeElement as HTMLElement).dataset.tab).toBe("path");
  });

  it("aria-selected and tabindex update on tab switch", () => {
    const sheet = createCharacterSheet({ player: makePlayer() });
    document.body.appendChild(sheet);
    (sheet.querySelector("button[data-tab='inventory']") as HTMLButtonElement).click();
    const inv = sheet.querySelector("button[data-tab='inventory']") as HTMLElement;
    const stats = sheet.querySelector("button[data-tab='stats']") as HTMLElement;
    expect(inv.getAttribute("aria-selected")).toBe("true");
    expect(inv.tabIndex).toBe(0);
    expect(stats.getAttribute("aria-selected")).toBe("false");
    expect(stats.tabIndex).toBe(-1);
  });
});

describe("CharacterSheet — Stats tab", () => {
  it("shows name, form+posture, HP, Focus, proficiency, and each ability stat", () => {
    const sheet = createCharacterSheet({ player: makePlayer() });
    const grid = sheet.querySelector("[data-testid='stats-grid']") as HTMLElement;
    expect(grid.textContent).toContain("HP");
    expect(grid.textContent).toContain("18 / 22");
    expect(grid.textContent).toContain("Focus");
    expect(grid.textContent).toContain("4 / 6");
    expect(grid.textContent).toContain("+2");
    expect(grid.textContent).toContain("might");
    expect(grid.textContent).toContain("sense");
    expect(sheet.querySelector(".stats-name")?.textContent).toBe("Khojen");
    expect(sheet.querySelector(".stats-form")?.textContent).toBe("Indebted · Witness");
  });
});

describe("CharacterSheet — Inventory tab (v0.6 discriminator narrowing)", () => {
  it("embeds InventoryPanel with discriminator-narrowed badges", () => {
    const sheet = createCharacterSheet({
      player: makePlayer({ inventory: [weapon, armor] }),
      activeTab: "inventory",
    });
    // Discriminator narrowing surfaces type-specific data:
    expect(sheet.querySelector("[data-testid='inventory-badge-itm_dagger']")?.textContent).toBe(
      "1d4 piercing",
    );
    expect(sheet.querySelector("[data-testid='inventory-badge-itm_chain_shirt']")?.textContent).toBe(
      "AC 13 · medium",
    );
  });
});

describe("CharacterSheet — Spells tab (R-51 cost layer)", () => {
  const cantrip: SpellEntry = {
    spell_id: "spl_eldritch_blast",
    name: "Eldritch Blast",
    level: 0,
    prepared: true,
  };

  const hex: SpellEntry = {
    spell_id: "spl_hex",
    name: "Hex",
    level: 1,
    prepared: true,
    cost_layer: { fatigue: 1, notice: 1 },
  };

  const imposed: SpellEntry = {
    spell_id: "spl_hear_the_fountain",
    name: "Hear the Fountain",
    level: 1,
    prepared: true,
    is_imposed: true,
    cost_layer: { fatigue: 1, notice: 2, authority: 1 },
  };

  it("renders one row per spell and an empty marker when no spells known", () => {
    const noSpells = createCharacterSheet({ player: makePlayer(), activeTab: "spells" });
    expect(noSpells.querySelector(".empty-note")?.textContent).toBe("No spells known.");

    const sheet = createCharacterSheet({
      player: makePlayer(),
      activeTab: "spells",
      spells: [cantrip, hex, imposed],
    });
    expect(sheet.querySelectorAll(".spell-row")).toHaveLength(3);
  });

  it("cantrip surfaces cost = 'free · cantrip' (R-51 skips L0)", () => {
    const sheet = createCharacterSheet({
      player: makePlayer(),
      activeTab: "spells",
      spells: [cantrip],
    });
    expect(sheet.querySelector("[data-testid='spell-cost-spl_eldritch_blast']")?.textContent).toBe(
      "free · cantrip",
    );
  });

  it("L1+ spell surfaces full cost layer (fatigue + notice)", () => {
    const sheet = createCharacterSheet({
      player: makePlayer(),
      activeTab: "spells",
      spells: [hex],
    });
    expect(sheet.querySelector("[data-testid='spell-cost-spl_hex']")?.textContent).toBe(
      "fat +1 · ntc +1",
    );
  });

  it("imposed spell carries the imposed tag for the tide-bloom border style", () => {
    const sheet = createCharacterSheet({
      player: makePlayer(),
      activeTab: "spells",
      spells: [imposed],
    });
    const row = sheet.querySelector(".spell-row") as HTMLElement;
    expect(row.dataset.imposed).toBe("true");
    expect(row.classList.contains("imp")).toBe(true);
    // Authority cost appears alongside fatigue/notice for the imposed spell.
    expect(
      sheet.querySelector("[data-testid='spell-cost-spl_hear_the_fountain']")?.textContent,
    ).toBe("fat +1 · ntc +2 · auth +1");
  });

  it("spell slots row renders N dots per level with spent/active styling", () => {
    const sheet = createCharacterSheet({
      player: makePlayer(),
      activeTab: "spells",
      spellSlots: { 1: { max: 3, current: 1 } },
    });
    const dots = sheet.querySelectorAll("[data-testid='spell-slots'] .slot-dot");
    expect(dots).toHaveLength(3);
    // First 1 is "live" (current); next 2 are "spent".
    expect(dots[0].classList.contains("spent")).toBe(false);
    expect(dots[1].classList.contains("spent")).toBe(true);
    expect(dots[2].classList.contains("spent")).toBe(true);
  });

  it("clicking Cast fires onCastSpell with the spell_id", () => {
    const cast: string[] = [];
    const sheet = createCharacterSheet({
      player: makePlayer(),
      activeTab: "spells",
      spells: [hex],
      onCastSpell: (id) => cast.push(id),
    });
    (sheet.querySelector(".spell-row-cast") as HTMLButtonElement).click();
    expect(cast).toEqual(["spl_hex"]);
  });
});

describe("CharacterSheet — Conditions tab", () => {
  const marked: Condition = {
    id: "cnd_marked",
    typeId: "marked_by_attention",
    name: "Marked by Attention",
    description: "Disadvantage on Stealth vs aware factions.",
    category: "social",
    isHarmful: true,
    turnsRemaining: null,
    stacks: 1,
    maxStacks: 1,
    effects: [],
  };

  it("renders empty marker when no conditions active", () => {
    const sheet = createCharacterSheet({ player: makePlayer(), activeTab: "conditions" });
    expect(sheet.querySelector(".empty-note")?.textContent).toBe("No active conditions.");
  });

  it("renders one row per condition with 3-letter glyph and remaining-turns", () => {
    const sheet = createCharacterSheet({
      player: makePlayer({ conditions: [marked] }),
      activeTab: "conditions",
    });
    const row = sheet.querySelector(".condition-row") as HTMLElement;
    expect(row.dataset.conditionId).toBe("cnd_marked");
    expect(row.querySelector(".condition-glyph")?.textContent).toBe("MAR");
    expect(row.querySelector(".condition-name")?.textContent).toBe("Marked by Attention");
    expect(row.querySelector(".condition-remaining")?.textContent).toBe("until canon-event");
  });
});

describe("CharacterSheet — Path Ledger tab", () => {
  const entry: PathLedgerEntry = {
    entry_id: "pth_1",
    domain: "promise",
    weight: 2,
    source_event_id: "evt_42",
    timestamp: { day: 14, phase: 3 } as unknown as PathLedgerEntry["timestamp"],
    narrative_phrase: "You kept the bell-marked charm.",
  };

  it("renders empty marker when no entries", () => {
    const sheet = createCharacterSheet({ player: makePlayer(), activeTab: "path" });
    expect(sheet.querySelector(".empty-note")?.textContent).toBe(
      "No path entries yet. Choices accumulate here.",
    );
  });

  it("renders one entry per PathLedgerEntry with domain, weight, phrase", () => {
    const sheet = createCharacterSheet({
      player: makePlayer(),
      activeTab: "path",
      pathLedger: [entry, { ...entry, entry_id: "pth_2", domain: "ruin", weight: -1, narrative_phrase: undefined }],
    });
    const items = sheet.querySelectorAll(".path-entry");
    expect(items).toHaveLength(2);
    const first = items[0] as HTMLElement;
    expect(first.dataset.domain).toBe("promise");
    expect(first.querySelector(".path-entry-domain")?.textContent).toBe("PROMISE");
    expect(first.querySelector(".path-entry-weight")?.textContent).toBe("+2");
    expect(first.querySelector(".path-entry-phrase")?.textContent).toBe("You kept the bell-marked charm.");
    const second = items[1] as HTMLElement;
    expect(second.querySelector(".path-entry-weight")?.textContent).toBe("-1");
    expect(second.querySelector(".path-entry-phrase")).toBeNull();
  });
});

describe("CharacterSheet — tab metadata", () => {
  it("CHARACTER_SHEET_TABS lists exactly the 5 tabs in the canonical order", () => {
    expect(CHARACTER_SHEET_TABS).toEqual(["stats", "inventory", "spells", "conditions", "path"]);
  });
});
