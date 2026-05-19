import type { GameState, FateRecord } from "../game";

interface FatePanelProps {
  game: GameState;
}

export class FatePanel {
  private props: FatePanelProps;
  private element: HTMLElement | null = null;

  constructor(props: FatePanelProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const section = document.createElement("section");
    section.id = "panel-fate";
    section.className = "panel fate-panel";
    section.setAttribute("role", "tabpanel");
    section.setAttribute("aria-labelledby", "tab-fate");

    const heading = document.createElement("div");
    heading.className = "panel-heading";
    const titleGroup = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Dice and consequences";
    const h2 = document.createElement("h2");
    h2.textContent = "Fate";
    titleGroup.appendChild(eyebrow);
    titleGroup.appendChild(h2);
    heading.appendChild(titleGroup);
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "record-list";
    if (this.props.game.fate.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-note";
      empty.textContent = "No fate records yet. Submit your first command.";
      list.appendChild(empty);
    } else {
      for (const record of this.props.game.fate) {
        list.appendChild(this.renderRecord(record));
      }
    }
    section.appendChild(list);

    this.element = section;
    return section;
  }

  private renderRecord(record: FateRecord): HTMLElement {
    const article = document.createElement("article");
    article.className = "record";

    const meta = document.createElement("span");
    meta.textContent = `Turn ${record.turn} / ${record.band}`;

    const h3 = document.createElement("h3");
    h3.textContent = record.command;

    const detail = document.createElement("p");
    detail.textContent = `${record.detail}. Total ${record.total}.`;

    article.appendChild(meta);
    article.appendChild(h3);
    article.appendChild(detail);
    return article;
  }

  update(newProps: Partial<FatePanelProps>): void {
    if (newProps.game && newProps.game.fate !== this.props.game.fate) {
      this.props.game = newProps.game;
      // Rebuild list
      if (this.element) {
        const oldList = this.element.querySelector(".record-list");
        if (oldList) {
          const list = document.createElement("div");
          list.className = "record-list";
          if (this.props.game.fate.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-note";
            empty.textContent = "No fate records yet. Submit your first command.";
            list.appendChild(empty);
          } else {
            for (const record of this.props.game.fate) {
              list.appendChild(this.renderRecord(record));
            }
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
