import type { GameState, NpcState } from "../game";

interface NpcsPanelProps {
  game: GameState;
}

export class NpcsPanel {
  private props: NpcsPanelProps;
  private element: HTMLElement | null = null;

  constructor(props: NpcsPanelProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const section = document.createElement("section");
    section.id = "panel-npcs";
    section.className = "panel npcs-panel";
    section.setAttribute("role", "tabpanel");
    section.setAttribute("aria-labelledby", "tab-npcs");

    const heading = document.createElement("div");
    heading.className = "panel-heading";
    const titleGroup = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Local actors";
    const h2 = document.createElement("h2");
    h2.textContent = "NPCs";
    titleGroup.appendChild(eyebrow);
    titleGroup.appendChild(h2);
    heading.appendChild(titleGroup);
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "npc-list";
    for (const npc of this.props.game.npcs) {
      list.appendChild(this.renderCard(npc));
    }
    section.appendChild(list);

    this.element = section;
    return section;
  }

  private renderCard(npc: NpcState): HTMLElement {
    const article = document.createElement("article");
    article.className = "npc-card";

    const h3 = document.createElement("h3");
    h3.textContent = npc.name;

    const role = document.createElement("p");
    role.textContent = `${npc.role} / ${npc.disposition}`;

    const dl = document.createElement("dl");
    const wantsDiv = document.createElement("div");
    const wantsDt = document.createElement("dt");
    wantsDt.textContent = "Wants";
    const wantsDd = document.createElement("dd");
    wantsDd.textContent = npc.wants;
    wantsDiv.appendChild(wantsDt);
    wantsDiv.appendChild(wantsDd);

    const seenDiv = document.createElement("div");
    const seenDt = document.createElement("dt");
    seenDt.textContent = "Last seen";
    const seenDd = document.createElement("dd");
    seenDd.textContent = npc.lastSeen;
    seenDiv.appendChild(seenDt);
    seenDiv.appendChild(seenDd);

    dl.appendChild(wantsDiv);
    dl.appendChild(seenDiv);

    article.appendChild(h3);
    article.appendChild(role);
    article.appendChild(dl);
    return article;
  }

  update(newProps: Partial<NpcsPanelProps>): void {
    if (newProps.game && newProps.game.npcs !== this.props.game.npcs) {
      this.props.game = newProps.game;
      if (this.element) {
        const oldList = this.element.querySelector(".npc-list");
        if (oldList) {
          const list = document.createElement("div");
          list.className = "npc-list";
          for (const npc of this.props.game.npcs) {
            list.appendChild(this.renderCard(npc));
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
