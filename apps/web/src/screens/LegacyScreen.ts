import type { Legacy } from "@first-perception/types";

interface LegacyScreenProps {
  history: Legacy[];
  onBack: () => void;
}

export class LegacyScreen {
  private props: LegacyScreenProps;
  private element: HTMLElement | null = null;

  constructor(props: LegacyScreenProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const main = document.createElement("main");
    main.className = "legacy-screen";
    main.setAttribute("aria-labelledby", "legacy-heading");

    const header = document.createElement("header");
    header.className = "legacy-header";

    const h1 = document.createElement("h1");
    h1.id = "legacy-heading";
    h1.textContent = "The Chain of Lives";

    const sub = document.createElement("p");
    sub.className = "legacy-subtitle";
    sub.textContent = `${this.props.history.length} character${this.props.history.length === 1 ? "" : "s"} have walked this world.`;

    header.appendChild(h1);
    header.appendChild(sub);
    main.appendChild(header);

    const list = document.createElement("div");
    list.className = "legacy-list-container";

    for (const legacy of this.props.history) {
      const card = document.createElement("article");
      card.className = "legacy-card";

      const name = document.createElement("h2");
      name.textContent = legacy.deadCharacter.characterName;

      const meta = document.createElement("p");
      meta.className = "legacy-meta";
      meta.textContent = `${legacy.deadCharacter.turnsSurvived} turns \u2014 ${legacy.deadCharacter.vector} \u2014 Day ${legacy.deadCharacter.worldSnapshot.day}`;

      const epitaph = document.createElement("blockquote");
      epitaph.className = "legacy-epitaph";
      epitaph.textContent = legacy.deadCharacter.epitaph;

      card.appendChild(name);
      card.appendChild(meta);
      card.appendChild(epitaph);

      if (legacy.inheritance.item) {
        const inherit = document.createElement("p");
        inherit.className = "legacy-inheritance";
        inherit.textContent = `Passed down: ${legacy.inheritance.item.name}`;
        card.appendChild(inherit);
      }

      list.appendChild(card);
    }

    main.appendChild(list);

    const actions = document.createElement("nav");
    actions.className = "legacy-actions";

    const backBtn = document.createElement("button");
    backBtn.className = "primary-action";
    backBtn.type = "button";
    backBtn.textContent = "Return to Title";
    backBtn.addEventListener("click", () => this.props.onBack());

    actions.appendChild(backBtn);
    main.appendChild(actions);

    this.element = main;
    return main;
  }

  destroy(): void {
    this.element = null;
  }
}
