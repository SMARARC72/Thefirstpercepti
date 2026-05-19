import type { GameState } from "../game";
import { MapCanvas } from "./MapCanvas";

interface WorldPanelProps {
  game: GameState;
}

export class WorldPanel {
  private props: WorldPanelProps;
  private element: HTMLElement | null = null;
  private mapCanvas: MapCanvas | null = null;

  constructor(props: WorldPanelProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const section = document.createElement("section");
    section.id = "panel-world";
    section.className = "panel world-panel";
    section.setAttribute("role", "tabpanel");
    section.setAttribute("aria-labelledby", "tab-world");

    const heading = document.createElement("div");
    heading.className = "panel-heading";
    const titleGroup = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Perceived";
    const h2 = document.createElement("h2");
    h2.textContent = this.props.game.world.location;
    titleGroup.appendChild(eyebrow);
    titleGroup.appendChild(h2);

    const danger = document.createElement("span");
    danger.className = "danger-pill";
    danger.textContent = `Danger ${this.props.game.world.danger}`;

    heading.appendChild(titleGroup);
    heading.appendChild(danger);
    section.appendChild(heading);

    this.mapCanvas = new MapCanvas({ points: this.props.game.world.map });
    section.appendChild(this.mapCanvas.render());

    const facts = document.createElement("dl");
    facts.className = "world-facts";
    const items: [string, string][] = [
      ["Region", this.props.game.world.region],
      ["Weather", this.props.game.world.weather],
      ["Pulse", this.props.game.world.pulse],
      ["Crisis", this.props.game.world.crisis],
    ];
    for (const [dt, dd] of items) {
      const div = document.createElement("div");
      const dTerm = document.createElement("dt");
      dTerm.textContent = dt;
      const dDesc = document.createElement("dd");
      dDesc.textContent = dd;
      div.appendChild(dTerm);
      div.appendChild(dDesc);
      facts.appendChild(div);
    }
    section.appendChild(facts);

    this.element = section;
    return section;
  }

  update(newProps: Partial<WorldPanelProps>): void {
    if (newProps.game) {
      this.props.game = newProps.game;
      this.mapCanvas?.update({ points: this.props.game.world.map });
      if (this.element) {
        const h2 = this.element.querySelector("h2");
        if (h2) h2.textContent = this.props.game.world.location;
        const danger = this.element.querySelector(".danger-pill");
        if (danger) danger.textContent = `Danger ${this.props.game.world.danger}`;
        const dds = this.element.querySelectorAll(".world-facts dd");
        const values = [this.props.game.world.region, this.props.game.world.weather, this.props.game.world.pulse, this.props.game.world.crisis];
        dds.forEach((dd, i) => {
          if (values[i] !== undefined) dd.textContent = values[i];
        });
      }
    }
  }

  destroy(): void {
    this.mapCanvas?.destroy();
    this.element = null;
  }
}
