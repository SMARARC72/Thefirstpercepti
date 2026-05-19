interface CodexPanelProps {
  entries: { label: string; detail: string; turn: number }[];
}

export class CodexPanel {
  private props: CodexPanelProps;
  private element: HTMLElement | null = null;

  constructor(props: CodexPanelProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const section = document.createElement("section");
    section.id = "panel-codex";
    section.className = "panel codex-panel";
    section.setAttribute("role", "tabpanel");
    section.setAttribute("aria-labelledby", "tab-codex");

    const heading = document.createElement("div");
    heading.className = "panel-heading";
    const titleGroup = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Discovered lore";
    const h2 = document.createElement("h2");
    h2.textContent = "Codex";
    titleGroup.appendChild(eyebrow);
    titleGroup.appendChild(h2);
    heading.appendChild(titleGroup);
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "codex-list";
    if (this.props.entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-note";
      empty.textContent = "No lore discovered yet. Explore the world to fill these pages.";
      list.appendChild(empty);
    } else {
      for (const entry of this.props.entries) {
        const article = document.createElement("article");
        article.className = "codex-entry";
        const label = document.createElement("h3");
        label.textContent = entry.label;
        const detail = document.createElement("p");
        detail.textContent = entry.detail;
        const turn = document.createElement("span");
        turn.textContent = `Turn ${entry.turn}`;
        article.appendChild(turn);
        article.appendChild(label);
        article.appendChild(detail);
        list.appendChild(article);
      }
    }
    section.appendChild(list);

    this.element = section;
    return section;
  }

  update(newProps: Partial<CodexPanelProps>): void {
    if (newProps.entries) {
      this.props.entries = newProps.entries;
      if (this.element) {
        const oldList = this.element.querySelector(".codex-list");
        if (oldList) {
          const list = document.createElement("div");
          list.className = "codex-list";
          if (this.props.entries.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-note";
            empty.textContent = "No lore discovered yet. Explore the world to fill these pages.";
            list.appendChild(empty);
          } else {
            for (const entry of this.props.entries) {
              const article = document.createElement("article");
              article.className = "codex-entry";
              const label = document.createElement("h3");
              label.textContent = entry.label;
              const detail = document.createElement("p");
              detail.textContent = entry.detail;
              const turn = document.createElement("span");
              turn.textContent = `Turn ${entry.turn}`;
              article.appendChild(turn);
              article.appendChild(label);
              article.appendChild(detail);
              list.appendChild(article);
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
