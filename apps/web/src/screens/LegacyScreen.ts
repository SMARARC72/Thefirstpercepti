import type { Legacy } from "@first-perception/types";

interface LegacyScreenProps {
  history: Legacy[];
  onBack: () => void;
}

/**
 * The Register — a stone-tablet layout, one slab per past life. Each
 * slab shows name + meta + epitaph by default; hover or focus reveals
 * the detail tray (turns, vector, inherited item, faction influence).
 * `tabindex=0` makes the slabs reachable via keyboard, and the
 * `:focus-within` CSS sibling matches the hover reveal so keyboard
 * users get parity.
 */
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
    h1.textContent = "The Register";
    h1.title = "Past lives";

    const sub = document.createElement("p");
    sub.className = "legacy-subtitle";
    const count = this.props.history.length;
    sub.textContent =
      count === 0
        ? "The page is blank. Nothing has died here yet."
        : `${count} name${count === 1 ? "" : "s"} have closed.`;

    header.appendChild(h1);
    header.appendChild(sub);
    main.appendChild(header);

    const list = document.createElement("div");
    list.className = "legacy-list-container register";

    for (const legacy of this.props.history) {
      list.appendChild(this.buildSlab(legacy));
    }

    main.appendChild(list);

    const actions = document.createElement("nav");
    actions.className = "legacy-actions";

    const backBtn = document.createElement("button");
    backBtn.className = "primary-action";
    backBtn.type = "button";
    backBtn.textContent = "Close the volume";
    backBtn.title = "Return to title";
    backBtn.addEventListener("click", () => this.props.onBack());

    actions.appendChild(backBtn);
    main.appendChild(actions);

    this.element = main;
    return main;
  }

  private buildSlab(legacy: Legacy): HTMLElement {
    const slab = document.createElement("article");
    slab.className = "legacy-slab";
    slab.tabIndex = 0;
    slab.setAttribute("aria-label", `${legacy.deadCharacter.characterName}, ${legacy.deadCharacter.turnsSurvived} turns survived`);

    const name = document.createElement("h2");
    name.textContent = legacy.deadCharacter.characterName;
    slab.appendChild(name);

    const meta = document.createElement("p");
    meta.className = "slab-meta";
    const vector = legacy.deadCharacter.vector || "unknown";
    meta.textContent = `${legacy.deadCharacter.turnsSurvived} turns · ${vector} · Day ${legacy.deadCharacter.worldSnapshot.day}`;
    slab.appendChild(meta);

    const epitaph = document.createElement("blockquote");
    epitaph.className = "slab-epitaph";
    epitaph.textContent = legacy.deadCharacter.epitaph;
    slab.appendChild(epitaph);

    // Hover/focus reveal — uses a <dl> for the parsed detail tray.
    const detail = document.createElement("dl");
    detail.className = "slab-detail";

    const addDetail = (term: string, def: string) => {
      const dt = document.createElement("dt");
      dt.textContent = term;
      const dd = document.createElement("dd");
      dd.textContent = def;
      detail.appendChild(dt);
      detail.appendChild(dd);
    };

    addDetail("Final location", legacy.deadCharacter.finalLocationId ?? "unknown");
    addDetail("Region danger at death", String(legacy.deadCharacter.worldSnapshot.danger));
    if (legacy.inheritance.item) {
      addDetail("Inheritance", legacy.inheritance.item.name);
    }
    if (legacy.inheritance.startingAdvantage) {
      addDetail("Advantage", String(legacy.inheritance.startingAdvantage));
    }
    if (legacy.inheritance.alteredFactions && legacy.inheritance.alteredFactions.length > 0) {
      addDetail("Altered factions", String(legacy.inheritance.alteredFactions.length));
    }

    slab.appendChild(detail);

    return slab;
  }

  destroy(): void {
    this.element = null;
  }
}
