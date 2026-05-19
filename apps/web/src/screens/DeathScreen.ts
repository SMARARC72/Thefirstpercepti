import type { GameState } from "../game";
import { domainLabel } from "../game";

interface DeathScreenProps {
  game: GameState;
  onNewRun: () => void;
  onTitle: () => void;
}

export class DeathScreen {
  private props: DeathScreenProps;
  private element: HTMLElement | null = null;

  constructor(props: DeathScreenProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const game = this.props.game;
    const death = game.player.hp <= 0 || game.gameOver ? true : false;
    const legacy = game.legacy;
    const record = legacy?.deadCharacter;

    const main = document.createElement("main");
    main.className = "death-screen";
    main.setAttribute("aria-labelledby", "death-heading");

    const header = document.createElement("header");
    header.className = "death-header";

    const h1 = document.createElement("h1");
    h1.id = "death-heading";
    h1.textContent = "The Record Closes";

    const sub = document.createElement("p");
    sub.className = "death-subtitle";
    sub.textContent = record
      ? `${record.characterName} \u2014 ${record.turnsSurvived} turns survived`
      : `${game.player.name} \u2014 ${game.turnCount} turns survived`;

    header.appendChild(h1);
    header.appendChild(sub);
    main.appendChild(header);

    const card = document.createElement("section");
    card.className = "death-card";

    const epitaphEl = document.createElement("blockquote");
    epitaphEl.className = "epitaph";
    epitaphEl.textContent = record?.epitaph ?? "The world remembers what you were.";
    card.appendChild(epitaphEl);

    const details = document.createElement("dl");
    details.className = "death-details";

    const addDetail = (term: string, def: string) => {
      const dt = document.createElement("dt");
      dt.textContent = term;
      const dd = document.createElement("dd");
      dd.textContent = def;
      details.appendChild(dt);
      details.appendChild(dd);
    };

    addDetail("Form", game.player.formLabel ?? game.player.form);
    addDetail("Domain", domainLabel(game.player.domain));
    addDetail("Posture", game.player.postureLabel ?? game.player.posture);
    addDetail("Final location", game.world.location);
    addDetail("Vector", record?.vector ?? "unknown");
    addDetail("Day", String(record?.worldSnapshot.day ?? game.day));

    card.appendChild(details);

    if (legacy) {
      const legacySection = document.createElement("div");
      legacySection.className = "legacy-section";

      const legacyTitle = document.createElement("h2");
      legacyTitle.textContent = "What Remains";
      legacySection.appendChild(legacyTitle);

      const inheritance = legacy.inheritance;
      if (inheritance) {
        const inheritList = document.createElement("ul");
        inheritList.className = "legacy-list";

        if (inheritance.item) {
          const li = document.createElement("li");
          li.textContent = `Inheritance: ${inheritance.item.name}`;
          inheritList.appendChild(li);
        }
        if (inheritance.startingAdvantage) {
          const li = document.createElement("li");
          li.textContent = `Advantage: ${inheritance.startingAdvantage}`;
          inheritList.appendChild(li);
        }
        if (inheritance.alteredFactions && inheritance.alteredFactions.length > 0) {
          const li = document.createElement("li");
          li.textContent = `Altered factions: ${inheritance.alteredFactions.length}`;
          inheritList.appendChild(li);
        }
        legacySection.appendChild(inheritList);
      }

      card.appendChild(legacySection);
    }

    main.appendChild(card);

    const actions = document.createElement("nav");
    actions.className = "death-actions";
    actions.setAttribute("aria-label", "Death screen actions");

    const newRunBtn = document.createElement("button");
    newRunBtn.className = "primary-action";
    newRunBtn.type = "button";
    newRunBtn.textContent = "Begin New Run";
    newRunBtn.addEventListener("click", () => this.props.onNewRun());

    const titleBtn = document.createElement("button");
    titleBtn.type = "button";
    titleBtn.textContent = "Return to Title";
    titleBtn.addEventListener("click", () => this.props.onTitle());

    actions.appendChild(newRunBtn);
    actions.appendChild(titleBtn);
    main.appendChild(actions);

    this.element = main;
    return main;
  }

  destroy(): void {
    this.element = null;
  }
}
