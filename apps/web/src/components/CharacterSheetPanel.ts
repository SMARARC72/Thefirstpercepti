import type { Player } from "@first-perception/types";

export interface CharacterSheetPanelProps {
  player: Player;
  armorClass?: number;
  passivePerception?: number;
  // Optional overrides; default to the canonical Player fields.
  proficiencyBonus?: number;
  hitDiceCurrent?: number;
  hitDiceMax?: number;
  savingThrowProficiencies?: ReadonlyArray<keyof Player["stats"]>;
}

// Ordered to match types/CORE_STATS so the 3x3 grid reads predictably
// across runs and matches the rest of the UI.
const STAT_ORDER = [
  "body",
  "grace",
  "sense",
  "mind",
  "will",
  "presence",
  "authority",
  "ruin",
  "creation",
] as const;

type StatKey = (typeof STAT_ORDER)[number];

function modifier(stat: number): number {
  return Math.floor((stat - 10) / 2);
}

function formatModifier(mod: number): string {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

function titleCase(value: string): string {
  return value
    .split(/[_\s]+/)
    .map((p) => (p.length === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
    .join(" ");
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderIdentityStrip(player: Player): HTMLElement {
  const section = el("section", "csp-identity");
  section.setAttribute("aria-label", "Identity");

  const name = el("h2", "csp-identity-name", player.name || "Unnamed");
  section.appendChild(name);

  const dl = el("dl", "csp-identity-meta");
  const rows: Array<[string, string]> = [
    ["Form", player.formLabel || titleCase(player.form)],
    ["Posture", player.postureLabel || titleCase(player.posture)],
    ["Domain", titleCase(player.domain)],
  ];
  for (const [k, v] of rows) {
    const dt = el("dt", undefined, k);
    const dd = el("dd", undefined, v);
    dl.appendChild(dt);
    dl.appendChild(dd);
  }
  section.appendChild(dl);
  return section;
}

function renderAbilityScores(player: Player): HTMLElement {
  const section = el("section", "csp-abilities");
  section.setAttribute("aria-label", "Ability scores");

  const heading = el("h2", "csp-section-heading", "Ability Scores");
  section.appendChild(heading);

  const grid = el("ul", "csp-ability-grid");
  for (const key of STAT_ORDER) {
    const stat = player.stats[key as StatKey];
    const mod = modifier(stat);

    const tile = el("li", "csp-ability-tile");
    tile.setAttribute("data-stat", key);

    const name = el("span", "csp-ability-name", titleCase(key));
    const modBox = el("strong", "csp-ability-mod", formatModifier(mod));
    const score = el("span", "csp-ability-score", String(stat));

    tile.appendChild(name);
    tile.appendChild(modBox);
    tile.appendChild(score);
    grid.appendChild(tile);
  }
  section.appendChild(grid);
  return section;
}

function renderCombatCallouts(
  ac: number,
  passivePerception: number,
  proficiencyBonus: number,
  hitDiceCurrent: number,
  hitDiceMax: number,
  hitDie: string,
): HTMLElement {
  const section = el("section", "csp-callouts");
  section.setAttribute("aria-label", "Combat callouts");

  const dl = el("dl", "csp-callouts-row");
  const callouts: Array<[string, string]> = [
    ["Armor Class", String(ac)],
    ["Passive Perception", String(passivePerception)],
    ["Proficiency Bonus", formatModifier(proficiencyBonus)],
    ["Hit Dice", `${hitDiceCurrent}/${hitDiceMax} ${hitDie}`],
  ];
  for (const [label, value] of callouts) {
    const cell = el("div", "csp-callout");
    const dt = el("dt", undefined, label);
    const dd = el("dd", undefined, value);
    cell.appendChild(dt);
    cell.appendChild(dd);
    dl.appendChild(cell);
  }
  section.appendChild(dl);
  return section;
}

function renderSavingThrows(
  player: Player,
  proficiencies: ReadonlyArray<StatKey>,
  proficiencyBonus: number,
): HTMLElement {
  const section = el("section", "csp-saves");
  section.setAttribute("aria-label", "Saving throws");

  const heading = el("h2", "csp-section-heading", "Saving Throws");
  section.appendChild(heading);

  const profSet = new Set<StatKey>(proficiencies);
  const list = el("ul", "csp-save-list");
  for (const key of STAT_ORDER) {
    const isProf = profSet.has(key);
    const baseMod = modifier(player.stats[key as StatKey]);
    const total = isProf ? baseMod + proficiencyBonus : baseMod;

    const row = el("li", "csp-save-row");
    if (isProf) row.classList.add("is-proficient");
    row.setAttribute("data-stat", key);

    const sigil = el("span", "csp-save-sigil", isProf ? "◆" : "◇");
    sigil.setAttribute("aria-label", isProf ? "Proficient" : "Not proficient");

    const name = el("span", "csp-save-name", titleCase(key));
    const value = el("strong", "csp-save-value", formatModifier(total));

    row.appendChild(sigil);
    row.appendChild(name);
    row.appendChild(value);
    list.appendChild(row);
  }
  section.appendChild(list);
  return section;
}

function renderSpellSlots(player: Player): HTMLElement | null {
  if (!player.spellSlots) return null;
  const levels = Object.keys(player.spellSlots)
    .map((k) => Number(k))
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (levels.length === 0) return null;

  const section = el("section", "csp-spell-slots");
  section.setAttribute("aria-label", "Glimpses");

  const heading = el("h2", "csp-section-heading", "Glimpses");
  section.appendChild(heading);

  const list = el("ul", "csp-spell-slot-list");
  for (const level of levels) {
    const slot = player.spellSlots[level]!;
    const row = el("li", "csp-spell-slot-row");
    row.setAttribute("data-level", String(level));
    const label = el("span", "csp-spell-slot-label", `Level ${level}`);
    const value = el("strong", "csp-spell-slot-value", `${slot.current} / ${slot.max}`);
    row.appendChild(label);
    row.appendChild(value);
    list.appendChild(row);
  }
  section.appendChild(list);

  // Cast affordance: tells the player how to spend a slot. Without this
  // line a witness sees "2/2" and has no way to discover the verb.
  const hint = el(
    "p",
    "csp-spell-hint",
    'Cast with "glimpse" to reveal hidden things at this location. Each casting consumes one Level-1 slot.',
  );
  section.appendChild(hint);

  return section;
}

function renderStatusFooter(player: Player): HTMLElement {
  const section = el("section", "csp-status-footer");
  section.setAttribute("aria-label", "Vitality");

  const heading = el("h2", "csp-section-heading", "Vitality");
  section.appendChild(heading);

  const list = el("dl", "csp-status-meters");
  const meters: Array<[string, string]> = [
    ["Health", `${player.hp} / ${player.maxHp}`],
    ["Focus", `${player.focus} / ${player.maxFocus}`],
  ];
  for (const [label, value] of meters) {
    const cell = el("div", "csp-status-meter");
    const dt = el("dt", undefined, label);
    const dd = el("dd", undefined, value);
    cell.appendChild(dt);
    cell.appendChild(dd);
    list.appendChild(cell);
  }
  section.appendChild(list);
  return section;
}

export function createCharacterSheetPanel(props: CharacterSheetPanelProps): HTMLElement {
  const { player } = props;
  const proficiencyBonus = props.proficiencyBonus ?? player.proficiencyBonus;
  const hitDiceCurrent = props.hitDiceCurrent ?? player.hitDice.current;
  const hitDiceMax = props.hitDiceMax ?? player.hitDice.max;
  const hitDie = player.hitDice.die;
  const armorClass = props.armorClass ?? 10 + modifier(player.stats.grace);
  const passivePerception = props.passivePerception ?? 10 + modifier(player.stats.sense);
  const proficiencies = (props.savingThrowProficiencies ?? player.savingThrowProficiencies) as ReadonlyArray<StatKey>;

  const root = document.createElement("section");
  root.className = "character-sheet-panel";
  root.setAttribute("role", "region");
  root.setAttribute("aria-label", "Character sheet");

  root.appendChild(renderIdentityStrip(player));

  const body = document.createElement("div");
  body.className = "csp-body";

  const column = document.createElement("div");
  column.className = "csp-column csp-column-primary";
  column.appendChild(renderAbilityScores(player));
  column.appendChild(renderCombatCallouts(armorClass, passivePerception, proficiencyBonus, hitDiceCurrent, hitDiceMax, hitDie));

  const aside = document.createElement("div");
  aside.className = "csp-column csp-column-secondary";
  aside.appendChild(renderSavingThrows(player, proficiencies, proficiencyBonus));
  const slots = renderSpellSlots(player);
  if (slots) aside.appendChild(slots);
  aside.appendChild(renderStatusFooter(player));

  body.appendChild(column);
  body.appendChild(aside);
  root.appendChild(body);

  return root;
}
