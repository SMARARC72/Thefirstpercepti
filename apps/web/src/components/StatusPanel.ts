import type { GameState } from "../game";
import { Meter } from "./Meter";

interface StatusPanelProps {
  game: GameState;
}

export class StatusPanel {
  private props: StatusPanelProps;
  private element: HTMLElement | null = null;
  private meters: Map<string, Meter> = new Map();

  constructor(props: StatusPanelProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const section = document.createElement("section");
    section.id = "panel-status";
    section.className = "panel status-panel";
    section.setAttribute("role", "tabpanel");
    section.setAttribute("aria-labelledby", "tab-status");

    const heading = document.createElement("div");
    heading.className = "panel-heading";
    const titleGroup = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "What you are made of";
    eyebrow.title = "Character";
    const h2 = document.createElement("h2");
    h2.textContent = "The Vessel";
    h2.title = "Status";
    titleGroup.appendChild(eyebrow);
    titleGroup.appendChild(h2);
    heading.appendChild(titleGroup);
    section.appendChild(heading);

    const hpMeter = new Meter({
      label: "Health",
      diegeticLabel: "Wax seal",
      kind: "hp",
      value: this.props.game.player.hp,
      max: this.props.game.player.maxHp,
      color: "crimson",
    });
    this.meters.set("hp", hpMeter);
    section.appendChild(hpMeter.render());

    const focusMeter = new Meter({
      label: "Focus",
      diegeticLabel: "Candle",
      kind: "focus",
      value: this.props.game.player.focus,
      max: this.props.game.player.maxFocus,
      color: "teal",
    });
    this.meters.set("focus", focusMeter);
    section.appendChild(focusMeter.render());

    const statGrid = document.createElement("ul");
    statGrid.className = "stat-grid";
    statGrid.setAttribute("aria-label", "Stats");
    for (const [stat, value] of Object.entries(this.props.game.player.stats)) {
      const li = document.createElement("li");
      const name = document.createElement("span");
      name.textContent = this.capitalize(stat);
      const num = document.createElement("strong");
      num.textContent = String(value);
      li.appendChild(name);
      li.appendChild(num);
      statGrid.appendChild(li);
    }
    section.appendChild(statGrid);

    const tags = document.createElement("div");
    tags.className = "tag-cloud";
    tags.setAttribute("aria-label", "Conditions and tags");
    for (const tag of this.props.game.player.tags) {
      const span = document.createElement("span");
      span.textContent = tag;
      tags.appendChild(span);
    }
    for (const condition of this.props.game.player.conditions) {
      const span = document.createElement("span");
      span.textContent = condition.name;
      tags.appendChild(span);
    }
    section.appendChild(tags);

    const inventory = document.createElement("div");
    inventory.className = "inventory";
    const invTitle = document.createElement("h3");
    invTitle.textContent = "Inventory";
    inventory.appendChild(invTitle);
    const invList = document.createElement("ul");
    for (const item of this.props.game.player.inventory) {
      const li = document.createElement("li");
      li.textContent = item.name;
      invList.appendChild(li);
    }
    inventory.appendChild(invList);
    section.appendChild(inventory);

    const journal = document.createElement("div");
    journal.className = "inventory";
    const journalTitle = document.createElement("h3");
    journalTitle.textContent = "Journal";
    journal.appendChild(journalTitle);
    const journalList = document.createElement("ul");
    for (const entry of this.props.game.journal) {
      const li = document.createElement("li");
      const strong = document.createElement("strong");
      strong.textContent = `${entry.label}:`;
      li.appendChild(strong);
      li.appendChild(document.createTextNode(` ${entry.detail}`));
      journalList.appendChild(li);
    }
    journal.appendChild(journalList);
    section.appendChild(journal);

    this.element = section;
    return section;
  }

  update(newProps: Partial<StatusPanelProps>): void {
    if (!newProps.game) return;
    this.props.game = newProps.game;
    this.meters.get("hp")?.update({ value: this.props.game.player.hp, max: this.props.game.player.maxHp });
    this.meters.get("focus")?.update({ value: this.props.game.player.focus, max: this.props.game.player.maxFocus });
    // For simplicity, full re-render of tags/inventory on update
    if (this.element) {
      const tags = this.element.querySelector(".tag-cloud");
      if (tags) {
        tags.innerHTML = "";
        for (const tag of this.props.game.player.tags) {
          const span = document.createElement("span");
          span.textContent = tag;
          tags.appendChild(span);
        }
        for (const condition of this.props.game.player.conditions) {
          const span = document.createElement("span");
          span.textContent = condition.name;
          tags.appendChild(span);
        }
      }
    }
  }

  private capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, " ");
  }

  destroy(): void {
    for (const m of this.meters.values()) m.destroy();
    this.meters.clear();
    this.element = null;
  }
}
