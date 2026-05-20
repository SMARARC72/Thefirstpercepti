/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import type { Player, Stats } from "@first-perception/types";
import { createCharacterSheetPanel } from "../src/components/CharacterSheetPanel";

function makeStats(overrides: Partial<Stats> = {}): Stats {
  return {
    body: 10,
    grace: 10,
    sense: 10,
    mind: 10,
    will: 10,
    presence: 10,
    authority: 10,
    ruin: 10,
    creation: 10,
    ...overrides,
  };
}

function makePlayer(overrides: Partial<Player> = {}): Player {
  return {
    id: "player-1",
    name: "The Witness",
    form: "human",
    formLabel: "Sun-bleached human",
    posture: "seeker",
    postureLabel: "Quiet seeker",
    domain: "lore",
    stats: makeStats(),
    hp: 8,
    maxHp: 10,
    focus: 4,
    maxFocus: 6,
    conditions: [],
    inventory: [],
    tags: [],
    proficiencyBonus: 2,
    hitDice: { current: 1, max: 1, die: "d8" },
    savingThrowProficiencies: [],
    attunementSlots: { used: 0, max: 3 },
    ...overrides,
  };
}

describe("createCharacterSheetPanel", () => {
  it("returns an HTMLElement", () => {
    const node = createCharacterSheetPanel({ player: makePlayer() });
    expect(node).toBeInstanceOf(HTMLElement);
    expect(node.tagName).toBe("SECTION");
  });

  it("renders modifiers with the 5e formula floor((stat - 10) / 2)", () => {
    const player = makePlayer({
      stats: makeStats({ body: 14, grace: 8, sense: 10, mind: 18, will: 9 }),
    });
    const node = createCharacterSheetPanel({ player });

    const modText = (key: string): string | null => {
      const tile = node.querySelector(`.csp-ability-tile[data-stat="${key}"]`);
      return tile?.querySelector(".csp-ability-mod")?.textContent ?? null;
    };

    expect(modText("body")).toBe("+2");
    expect(modText("grace")).toBe("-1");
    expect(modText("sense")).toBe("+0");
    expect(modText("mind")).toBe("+4");
    expect(modText("will")).toBe("-1");
  });

  it("renders all nine ability score names", () => {
    const node = createCharacterSheetPanel({ player: makePlayer() });
    const text = (node.textContent ?? "").toLowerCase();
    for (const name of [
      "body",
      "grace",
      "sense",
      "mind",
      "will",
      "presence",
      "authority",
      "ruin",
      "creation",
    ]) {
      expect(text).toContain(name);
    }
  });

  it("shows default combat callouts (AC, Passive Perception, Proficiency, Hit Dice)", () => {
    // Defaults from Player: pb=2, hitDice=1/1 d8. With all 10s: AC=10,
    // passive=10, pb=+2, hd=1/1 d8.
    const node = createCharacterSheetPanel({ player: makePlayer() });
    const map = new Map<string, string>();
    for (const c of node.querySelectorAll(".csp-callout")) {
      const dt = c.querySelector("dt")?.textContent;
      const dd = c.querySelector("dd")?.textContent;
      if (dt && dd) map.set(dt, dd);
    }
    expect(map.get("Armor Class")).toBe("10");
    expect(map.get("Passive Perception")).toBe("10");
    expect(map.get("Proficiency Bonus")).toBe("+2");
    expect(map.get("Hit Dice")).toBe("1/1 d8");
  });

  it("reads hit-die from Player.hitDice rather than assuming d8", () => {
    const node = createCharacterSheetPanel({
      player: makePlayer({ hitDice: { current: 3, max: 5, die: "d12" } }),
    });
    const callouts = new Map<string, string>();
    for (const c of node.querySelectorAll(".csp-callout")) {
      const dt = c.querySelector("dt")?.textContent;
      const dd = c.querySelector("dd")?.textContent;
      if (dt && dd) callouts.set(dt, dd);
    }
    expect(callouts.get("Hit Dice")).toBe("3/5 d12");
  });

  it("returns a fresh element on each call (no shared state)", () => {
    const a = createCharacterSheetPanel({ player: makePlayer({ name: "First" }) });
    const b = createCharacterSheetPanel({ player: makePlayer({ name: "Second" }) });

    expect(a).not.toBe(b);
    expect((a.textContent ?? "")).toContain("First");
    expect((b.textContent ?? "")).toContain("Second");
    expect((a.textContent ?? "")).not.toContain("Second");
    expect((b.textContent ?? "")).not.toContain("First");
  });

  it("marks proficient saves with the ◆ sigil and applies proficiency bonus", () => {
    const player = makePlayer({
      stats: makeStats({ body: 14, mind: 14 }),
      proficiencyBonus: 3,
      savingThrowProficiencies: ["body"],
    });
    const node = createCharacterSheetPanel({ player });

    const bodyRow = node.querySelector('.csp-save-row[data-stat="body"]');
    const mindRow = node.querySelector('.csp-save-row[data-stat="mind"]');
    if (!bodyRow || !mindRow) throw new Error("save rows missing");

    expect(bodyRow.classList.contains("is-proficient")).toBe(true);
    expect(mindRow.classList.contains("is-proficient")).toBe(false);

    // body mod (+2) + pb (3) = +5
    expect(bodyRow.querySelector(".csp-save-value")?.textContent).toBe("+5");
    // mind mod alone is +2
    expect(mindRow.querySelector(".csp-save-value")?.textContent).toBe("+2");

    expect(bodyRow.querySelector(".csp-save-sigil")?.textContent).toBe("◆");
  });

  it("reads savingThrowProficiencies from Player when no prop override is passed", () => {
    const player = makePlayer({ savingThrowProficiencies: ["mind", "will"] });
    const node = createCharacterSheetPanel({ player });
    const mindRow = node.querySelector('.csp-save-row[data-stat="mind"]');
    const willRow = node.querySelector('.csp-save-row[data-stat="will"]');
    const bodyRow = node.querySelector('.csp-save-row[data-stat="body"]');
    expect(mindRow?.classList.contains("is-proficient")).toBe(true);
    expect(willRow?.classList.contains("is-proficient")).toBe(true);
    expect(bodyRow?.classList.contains("is-proficient")).toBe(false);
  });

  it("omits the Glimpses section when Player has no spellSlots (default)", () => {
    const node = createCharacterSheetPanel({ player: makePlayer() });
    expect(node.querySelector(".csp-spell-slots")).toBeNull();
  });

  it("renders the Glimpses section with level rows when Player has spellSlots", () => {
    const player = makePlayer({
      spellSlots: { 1: { current: 2, max: 2 } },
    });
    const node = createCharacterSheetPanel({ player });
    const section = node.querySelector(".csp-spell-slots");
    expect(section).not.toBeNull();
    const row = section!.querySelector('.csp-spell-slot-row[data-level="1"]');
    expect(row).not.toBeNull();
    expect(row!.querySelector(".csp-spell-slot-label")?.textContent).toBe("Level 1");
    expect(row!.querySelector(".csp-spell-slot-value")?.textContent).toBe("2 / 2");
  });
});
