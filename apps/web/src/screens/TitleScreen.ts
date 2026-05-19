import gsap from "gsap";
import { ParticleCanvas } from "../components/ParticleCanvas";

interface TitleScreenProps {
  hasSave: boolean;
  version: string;
  onBegin: () => void;
  onContinue: () => void;
  onSettings: () => void;
  onLegacy: () => void;
}

export class TitleScreen {
  private props: TitleScreenProps;
  private element: HTMLElement | null = null;
  private particles: ParticleCanvas | null = null;

  constructor(props: TitleScreenProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const main = document.createElement("main");
    main.className = "title-screen";
    main.setAttribute("aria-labelledby", "title-heading");

    this.particles = new ParticleCanvas({ density: 3, mode: "ash" });
    main.appendChild(this.particles.render());

    const copy = document.createElement("section");
    copy.className = "title-copy";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Solo living-world RPG";

    const h1 = document.createElement("h1");
    h1.id = "title-heading";
    h1.textContent = "The First Perception";

    const lede = document.createElement("p");
    lede.className = "lede";
    lede.textContent =
      "Wake into a world that notices you first. Name what you are, decide what you know, then survive the consequences.";

    copy.appendChild(eyebrow);
    copy.appendChild(h1);
    copy.appendChild(lede);
    main.appendChild(copy);

    const nav = document.createElement("nav");
    nav.className = "title-actions";
    nav.setAttribute("aria-label", "Main menu");

    const beginBtn = document.createElement("button");
    beginBtn.className = "primary-action";
    beginBtn.type = "button";
    beginBtn.textContent = "Begin";
    beginBtn.addEventListener("click", () => this.props.onBegin());

    const continueBtn = document.createElement("button");
    continueBtn.type = "button";
    continueBtn.textContent = "Continue";
    continueBtn.disabled = !this.props.hasSave;
    continueBtn.addEventListener("click", () => this.props.onContinue());

    const settingsBtn = document.createElement("button");
    settingsBtn.type = "button";
    settingsBtn.textContent = "Settings";
    settingsBtn.addEventListener("click", () => this.props.onSettings());

    const legacyBtn = document.createElement("button");
    legacyBtn.type = "button";
    legacyBtn.textContent = "Legacy";
    legacyBtn.addEventListener("click", () => this.props.onLegacy());

    nav.appendChild(beginBtn);
    nav.appendChild(continueBtn);
    nav.appendChild(settingsBtn);
    nav.appendChild(legacyBtn);
    main.appendChild(nav);

    const version = document.createElement("p");
    version.className = "version-corner";
    version.textContent = this.props.version;
    main.appendChild(version);

    this.element = main;

    // Staggered fade-in
    if (document.documentElement.dataset.reducedMotion !== "true") {
      gsap.fromTo(
        [eyebrow, h1, lede, nav],
        { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.12, ease: "power2.out", delay: 0.15 },
      );
    }

    return main;
  }

  destroy(): void {
    this.particles?.destroy();
    this.element = null;
  }
}
