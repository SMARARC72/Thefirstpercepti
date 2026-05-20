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

    // The title coalesces letter-by-letter from scattered positions, so
    // each glyph gets its own span. aria-label preserves the readable
    // string for screen readers; the spans are aria-hidden.
    const h1 = document.createElement("h1");
    h1.id = "title-heading";
    const titleText = "The First Perception";
    h1.setAttribute("aria-label", titleText);
    h1.classList.add("title-coalesce");
    for (const ch of titleText) {
      const span = document.createElement("span");
      span.className = ch === " " ? "title-space" : "title-letter";
      span.textContent = ch;
      span.setAttribute("aria-hidden", "true");
      h1.appendChild(span);
    }

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
    beginBtn.textContent = "Awaken";
    beginBtn.title = "Begin a new run";
    beginBtn.addEventListener("click", () => this.props.onBegin());

    const continueBtn = document.createElement("button");
    continueBtn.type = "button";
    continueBtn.textContent = "Resume the watch";
    continueBtn.title = "Continue the last save";
    continueBtn.disabled = !this.props.hasSave;
    continueBtn.addEventListener("click", () => this.props.onContinue());

    const settingsBtn = document.createElement("button");
    settingsBtn.type = "button";
    settingsBtn.textContent = "The Lens";
    settingsBtn.title = "Settings";
    settingsBtn.addEventListener("click", () => this.props.onSettings());

    const legacyBtn = document.createElement("button");
    legacyBtn.type = "button";
    legacyBtn.textContent = "The Register";
    legacyBtn.title = "Legacy — past lives";
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

    // Coalesce: each title letter arrives from a scattered offset with
    // a slight rotation and lands together. Eyebrow / lede / nav fade
    // in behind. Particles keep drifting throughout — they look like
    // they're settling into the title, not framing it.
    if (document.documentElement.dataset.reducedMotion !== "true") {
      const letters = Array.from(h1.querySelectorAll(".title-letter"));
      gsap.set(letters, {
        opacity: 0,
        x: () => (Math.random() - 0.5) * 90,
        y: () => (Math.random() - 0.5) * 70,
        rotate: () => (Math.random() - 0.5) * 24,
        filter: "blur(8px)",
      });
      gsap.to(letters, {
        opacity: 1,
        x: 0,
        y: 0,
        rotate: 0,
        filter: "blur(0px)",
        duration: 1.0,
        stagger: { each: 0.045, from: "random" },
        ease: "power3.out",
        delay: 0.2,
      });

      gsap.fromTo(
        [eyebrow, lede, nav],
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.14,
          ease: "power2.out",
          delay: 0.9,
        },
      );
    }

    return main;
  }

  destroy(): void {
    this.particles?.destroy();
    this.element = null;
  }
}
