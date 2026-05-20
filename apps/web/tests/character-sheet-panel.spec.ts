import { beforeAll, describe, expect, it } from "vitest";
import type { Player, Stats } from "@first-perception/types";

/*
 * Minimal DOM shim. vitest defaults to a node environment and the web
 * app does not yet declare happy-dom/jsdom as a dependency. Wave 1
 * Unit 4 is the first component test in this package, so we polyfill
 * the small surface CharacterSheetPanel touches (createElement,
 * className, textContent, dataset, classList, setAttribute,
 * appendChild, querySelector/All) and avoid adding a runtime dep.
 *
 * Phase 8a will replace this shim with a real DOM environment when
 * the wider component-test pattern lands. Keep this file self-
 * contained until then.
 */

interface ShimNode {
  nodeType: number;
  parentNode: ShimElement | null;
  textContent: string;
}

interface ShimText extends ShimNode {
  nodeType: 3;
  data: string;
}

interface ShimElement extends ShimNode {
  nodeType: 1;
  tagName: string;
  childNodes: ShimNode[];
  children: ShimElement[];
  attributes: Map<string, string>;
  classList: ShimClassList;
  dataset: Record<string, string>;
  className: string;
  style: Record<string, string>;
  appendChild(child: ShimNode): ShimNode;
  setAttribute(name: string, value: string): void;
  getAttribute(name: string): string | null;
  hasAttribute(name: string): boolean;
  querySelector(selector: string): ShimElement | null;
  querySelectorAll(selector: string): ShimElement[];
}

interface ShimClassList {
  _set: Set<string>;
  add(token: string): void;
  remove(token: string): void;
  contains(token: string): boolean;
  toString(): string;
}

function descendants(el: ShimElement): ShimElement[] {
  const out: ShimElement[] = [];
  for (const child of el.children) {
    out.push(child);
    out.push(...descendants(child));
  }
  return out;
}

function matchSimpleSelector(el: ShimElement, selector: string): boolean {
  // Supports tag, .class, #id, [attr], [attr="value"], and a single
  // descendant combinator (space). That covers everything our spec
  // queries below need; we intentionally do not implement the full
  // selector grammar.
  const trimmed = selector.trim();
  if (trimmed === "*" || trimmed === "") return true;
  if (trimmed.startsWith(".")) {
    return el.classList.contains(trimmed.slice(1));
  }
  if (trimmed.startsWith("#")) {
    return el.getAttribute("id") === trimmed.slice(1);
  }
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    const inner = trimmed.slice(1, -1);
    const eq = inner.indexOf("=");
    if (eq === -1) return el.hasAttribute(inner);
    const name = inner.slice(0, eq);
    const raw = inner.slice(eq + 1);
    const value = raw.replace(/^['"]|['"]$/g, "");
    return el.getAttribute(name) === value;
  }
  return el.tagName.toLowerCase() === trimmed.toLowerCase();
}

function makeClassList(initial: string): ShimClassList {
  const set = new Set(initial.split(/\s+/).filter(Boolean));
  return {
    _set: set,
    add(token) {
      set.add(token);
    },
    remove(token) {
      set.delete(token);
    },
    contains(token) {
      return set.has(token);
    },
    toString() {
      return [...set].join(" ");
    },
  };
}

function createElement(tag: string): ShimElement {
  const attributes = new Map<string, string>();
  let className = "";
  let classList = makeClassList("");
  const node: ShimElement = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    parentNode: null,
    childNodes: [],
    children: [],
    attributes,
    get className() {
      return className;
    },
    set className(value: string) {
      className = value;
      classList = makeClassList(value);
      (node as unknown as { classList: ShimClassList }).classList = classList;
    },
    classList,
    dataset: {},
    style: {},
    get textContent() {
      let out = "";
      for (const child of node.childNodes) {
        if (child.nodeType === 1) out += (child as ShimElement).textContent;
        else if (child.nodeType === 3) out += (child as ShimText).data;
      }
      return out;
    },
    set textContent(value: string) {
      node.childNodes = [];
      node.children = [];
      if (value !== "") {
        const text: ShimText = {
          nodeType: 3,
          data: value,
          parentNode: node,
          textContent: value,
        };
        node.childNodes.push(text);
      }
    },
    appendChild(child) {
      child.parentNode = node;
      node.childNodes.push(child);
      if (child.nodeType === 1) node.children.push(child as ShimElement);
      return child;
    },
    setAttribute(name, value) {
      attributes.set(name, value);
      if (name === "class") {
        node.className = value;
      }
    },
    getAttribute(name) {
      return attributes.has(name) ? (attributes.get(name) as string) : null;
    },
    hasAttribute(name) {
      return attributes.has(name);
    },
    querySelector(selector) {
      const found = node.querySelectorAll(selector);
      return found[0] ?? null;
    },
    querySelectorAll(selector) {
      const parts = selector.split(/\s+/).filter(Boolean);
      let candidates: ShimElement[] = descendants(node);
      if (parts.length === 1) {
        return candidates.filter((c) => matchSimpleSelector(c, parts[0]));
      }
      for (const part of parts) {
        const next: ShimElement[] = [];
        for (const cand of candidates) {
          if (matchSimpleSelector(cand, part)) next.push(cand);
        }
        candidates = [];
        for (const n of next) {
          candidates.push(...descendants(n));
        }
        candidates = next.concat(candidates);
      }
      // Final filter on last part
      return candidates.filter((c) => matchSimpleSelector(c, parts[parts.length - 1]));
    },
  };
  return node;
}

beforeAll(() => {
  if (typeof (globalThis as { document?: unknown }).document === "undefined") {
    const shimDocument = {
      createElement: (tag: string) => createElement(tag),
    };
    (globalThis as unknown as { document: typeof shimDocument }).document = shimDocument;
    (globalThis as unknown as { HTMLElement: unknown }).HTMLElement = Object;
  }
});

// Import AFTER the shim is installed so the module sees document.
async function loadComponent() {
  return import("../src/components/CharacterSheetPanel");
}

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
  it("returns an HTMLElement", async () => {
    const { createCharacterSheetPanel } = await loadComponent();
    const node = createCharacterSheetPanel({ player: makePlayer() });
    expect(node).toBeTruthy();
    expect(typeof node).toBe("object");
    expect((node as unknown as ShimElement).tagName).toBe("SECTION");
  });

  it("renders modifiers with the 5e formula floor((stat - 10) / 2)", async () => {
    const { createCharacterSheetPanel } = await loadComponent();
    const player = makePlayer({
      stats: makeStats({ body: 14, grace: 8, sense: 10, mind: 18, will: 9 }),
    });
    const node = createCharacterSheetPanel({ player }) as unknown as ShimElement;

    const tiles = node.querySelectorAll(".csp-ability-tile");
    const byStat = new Map<string, ShimElement>();
    for (const t of tiles) {
      const stat = t.getAttribute("data-stat");
      if (stat) byStat.set(stat, t);
    }

    const modText = (key: string): string => {
      const tile = byStat.get(key);
      if (!tile) throw new Error(`tile missing for ${key}`);
      const mod = tile.querySelector(".csp-ability-mod");
      return mod ? mod.textContent : "";
    };

    expect(modText("body")).toBe("+2");
    expect(modText("grace")).toBe("-1");
    expect(modText("sense")).toBe("+0");
    expect(modText("mind")).toBe("+4");
    expect(modText("will")).toBe("-1");
  });

  it("renders all nine ability score names", async () => {
    const { createCharacterSheetPanel } = await loadComponent();
    const node = createCharacterSheetPanel({ player: makePlayer() }) as unknown as ShimElement;
    const text = node.textContent.toLowerCase();
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

  it("shows default combat callouts (AC, Passive Perception, Proficiency, Hit Dice)", async () => {
    const { createCharacterSheetPanel } = await loadComponent();
    // Defaults: pb=2, hitDiceCurrent=1, hitDiceMax=1, AC=10+grace_mod,
    // passive=10+sense_mod. With all 10s: AC=10, passive=10, pb=+2,
    // hd=1/1 d8.
    const node = createCharacterSheetPanel({ player: makePlayer() }) as unknown as ShimElement;
    const callouts = node.querySelectorAll(".csp-callout");
    const map = new Map<string, string>();
    for (const c of callouts) {
      const dt = c.querySelector("dt");
      const dd = c.querySelector("dd");
      if (dt && dd) map.set(dt.textContent, dd.textContent);
    }
    expect(map.get("Armor Class")).toBe("10");
    expect(map.get("Passive Perception")).toBe("10");
    expect(map.get("Proficiency Bonus")).toBe("+2");
    expect(map.get("Hit Dice")).toBe("1/1 d8");
  });

  it("returns a fresh element on each call (no shared state)", async () => {
    const { createCharacterSheetPanel } = await loadComponent();
    const a = createCharacterSheetPanel({ player: makePlayer({ name: "First" }) });
    const b = createCharacterSheetPanel({ player: makePlayer({ name: "Second" }) });

    expect(a).not.toBe(b);
    const aEl = a as unknown as ShimElement;
    const bEl = b as unknown as ShimElement;
    expect(aEl.textContent).toContain("First");
    expect(bEl.textContent).toContain("Second");
    expect(aEl.textContent).not.toContain("Second");
    expect(bEl.textContent).not.toContain("First");
  });

  it("marks proficient saves with the ◆ sigil and applies proficiency bonus", async () => {
    const { createCharacterSheetPanel } = await loadComponent();
    const player = makePlayer({ stats: makeStats({ body: 14, mind: 14 }) });
    const node = createCharacterSheetPanel({
      player,
      proficiencyBonus: 3,
      savingThrowProficiencies: ["body"],
    }) as unknown as ShimElement;

    const rows = node.querySelectorAll(".csp-save-row");
    const byStat = new Map<string, ShimElement>();
    for (const r of rows) {
      const stat = r.getAttribute("data-stat");
      if (stat) byStat.set(stat, r);
    }
    const bodyRow = byStat.get("body");
    const mindRow = byStat.get("mind");
    if (!bodyRow || !mindRow) throw new Error("save rows missing");

    expect(bodyRow.classList.contains("is-proficient")).toBe(true);
    expect(mindRow.classList.contains("is-proficient")).toBe(false);

    // body mod (+2) + pb (3) = +5
    const bodyValue = bodyRow.querySelector(".csp-save-value");
    expect(bodyValue?.textContent).toBe("+5");
    // mind mod alone is +2
    const mindValue = mindRow.querySelector(".csp-save-value");
    expect(mindValue?.textContent).toBe("+2");

    const bodySigil = bodyRow.querySelector(".csp-save-sigil");
    expect(bodySigil?.textContent).toBe("◆");
  });
});
