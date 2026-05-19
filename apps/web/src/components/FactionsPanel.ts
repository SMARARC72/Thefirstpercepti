import type { GameState, FactionState } from "../game";
import { Meter } from "./Meter";

interface FactionsPanelProps {
  game: GameState;
}

export class FactionsPanel {
  private props: FactionsPanelProps;
  private element: HTMLElement | null = null;

  constructor(props: FactionsPanelProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const section = document.createElement("section");
    section.id = "panel-factions";
    section.className = "panel factions-panel";
    section.setAttribute("role", "tabpanel");
    section.setAttribute("aria-labelledby", "tab-factions");

    const heading = document.createElement("div");
    heading.className = "panel-heading";
    const titleGroup = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Political pressure";
    const h2 = document.createElement("h2");
    h2.textContent = "Factions";
    titleGroup.appendChild(eyebrow);
    titleGroup.appendChild(h2);
    heading.appendChild(titleGroup);
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "faction-list";
    for (const faction of this.props.game.factions) {
      list.appendChild(this.renderCard(faction));
    }
    section.appendChild(list);

    this.element = section;
    return section;
  }

  private renderCard(faction: FactionState): HTMLElement {
    const article = document.createElement("article");
    article.className = `faction-card ${faction.stance}`;

    const header = document.createElement("div");
    const h3 = document.createElement("h3");
    h3.textContent = faction.name;
    const stance = document.createElement("span");
    stance.textContent = faction.stance;
    header.appendChild(h3);
    header.appendChild(stance);

    const need = document.createElement("p");
    need.textContent = faction.need;

    const trustMeter = new Meter({ label: "Trust", value: faction.trust + 50, max: 100, color: "teal" });
    const fearMeter = new Meter({ label: "Fear", value: faction.fear, max: 100, color: "crimson" });

    const plan = document.createElement("small");
    plan.textContent = `Current plan: ${faction.plan}`;

    article.appendChild(header);
    article.appendChild(need);
    article.appendChild(trustMeter.render());
    article.appendChild(fearMeter.render());
    article.appendChild(plan);
    return article;
  }

  update(newProps: Partial<FactionsPanelProps>): void {
    if (newProps.game && newProps.game.factions !== this.props.game.factions) {
      this.props.game = newProps.game;
      if (this.element) {
        const oldList = this.element.querySelector(".faction-list");
        if (oldList) {
          const list = document.createElement("div");
          list.className = "faction-list";
          for (const faction of this.props.game.factions) {
            list.appendChild(this.renderCard(faction));
          }
          oldList.replaceWith(list);
        }
      }
    }
  }

  destroy(): void {
    this.element = null;
  }
}
