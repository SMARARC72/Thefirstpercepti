interface JournalPanelProps {
  entries: { label: string; detail: string; turn: number }[];
}

export class JournalPanel {
  private props: JournalPanelProps;
  private element: HTMLElement | null = null;

  constructor(props: JournalPanelProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const section = document.createElement("section");
    section.id = "panel-journal";
    section.className = "panel journal-panel";
    section.setAttribute("role", "tabpanel");
    section.setAttribute("aria-labelledby", "tab-journal");

    const heading = document.createElement("div");
    heading.className = "panel-heading";
    const titleGroup = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Personal record";
    const h2 = document.createElement("h2");
    h2.textContent = "Journal";
    titleGroup.appendChild(eyebrow);
    titleGroup.appendChild(h2);
    heading.appendChild(titleGroup);
    section.appendChild(heading);

    const list = document.createElement("div");
    list.className = "journal-list";
    if (this.props.entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-note";
      empty.textContent = "No journal entries yet.";
      list.appendChild(empty);
    } else {
      for (const entry of this.props.entries) {
        const article = document.createElement("article");
        article.className = "journal-entry";
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

  update(newProps: Partial<JournalPanelProps>): void {
    if (newProps.entries) {
      this.props.entries = newProps.entries;
      if (this.element) {
        const oldList = this.element.querySelector(".journal-list");
        if (oldList) {
          const list = document.createElement("div");
          list.className = "journal-list";
          if (this.props.entries.length === 0) {
            const empty = document.createElement("p");
            empty.className = "empty-note";
            empty.textContent = "No journal entries yet.";
            list.appendChild(empty);
          } else {
            for (const entry of this.props.entries) {
              const article = document.createElement("article");
              article.className = "journal-entry";
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
