import gsap from "gsap";
import type { GameState } from "../game";
import { domainLabel } from "../game";
import { ParticleCanvas } from "../components/ParticleCanvas";
import { createFormOfEndingPostcard } from "../components/FormOfEndingPostcard";
import { fetchFormOfEnding } from "../state/formOfEndingFetch";

interface DeathScreenProps {
  game: GameState;
  onNewRun: () => void;
  onTitle: () => void;
  /** Optional hook the orchestrator wires up so audio decays with the
   * death-screen ceremony. The fade resolves after ~2.5 s; we don't
   * await it — the visual sequence runs in parallel. */
  onMount?: () => void;
}

export class DeathScreen {
  private props: DeathScreenProps;
  private element: HTMLElement | null = null;
  private particles: ParticleCanvas | null = null;

  constructor(props: DeathScreenProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const game = this.props.game;
    const legacy = game.legacy;
    const record = legacy?.deadCharacter;

    const main = document.createElement("main");
    main.className = "death-screen";
    main.setAttribute("aria-labelledby", "death-heading");

    // Ash drift particles — the world is letting go of the player.
    // ParticleCanvas already has an "ash" mode; we crank density a bit
    // beyond the title so the death feels heavier.
    this.particles = new ParticleCanvas({ density: 5, mode: "ash" });
    main.appendChild(this.particles.render());

    const header = document.createElement("header");
    header.className = "death-header";

    const h1 = document.createElement("h1");
    h1.id = "death-heading";
    const heading = "The Record Closes";
    h1.setAttribute("aria-label", heading);
    h1.classList.add("death-heading-coalesce");
    for (const ch of heading) {
      const span = document.createElement("span");
      span.className = ch === " " ? "title-space" : "title-letter";
      span.textContent = ch;
      span.setAttribute("aria-hidden", "true");
      h1.appendChild(span);
    }

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

    // Epitaph types in letter-by-letter — short enough that the
    // sequence finishes well inside the ceremony budget. aria-label
    // preserves the readable string; per-letter spans are hidden.
    const epitaphText = record?.epitaph ?? "The world remembers what you were.";
    const epitaphEl = document.createElement("blockquote");
    epitaphEl.className = "epitaph epitaph-coalesce";
    epitaphEl.setAttribute("aria-label", epitaphText);
    for (const ch of epitaphText) {
      const span = document.createElement("span");
      span.className = ch === " " ? "title-space" : "title-letter";
      span.textContent = ch;
      span.setAttribute("aria-hidden", "true");
      epitaphEl.appendChild(span);
    }
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

    // Form-of-Ending postcard — async-mounted. The throttle dispatches via
    // the form_of_ending agent (premium tier). On any failure (network /
    // parse / missing fields) the slot stays empty and the legacy epitaph
    // path above remains the player's final narration.
    const postcardSlot = document.createElement("div");
    postcardSlot.className = "form-of-ending-slot";
    main.appendChild(postcardSlot);
    void fetchFormOfEnding(game).then((output) => {
      if (!output || !output.text || !postcardSlot.isConnected) return;
      const postcard = createFormOfEndingPostcard({
        ending_kind: "physical_death",
        output,
        day: record?.worldSnapshot?.day ?? game.day ?? 0,
        scene_index: game.turnCount ?? 0,
        player_identifier: record?.characterName ?? game.player.name,
        legacy_stream_field: output.legacy_artifact_id || undefined,
      });
      postcardSlot.appendChild(postcard);
    });

    const actions = document.createElement("nav");
    actions.className = "death-actions";
    actions.setAttribute("aria-label", "Death screen actions");

    const newRunBtn = document.createElement("button");
    newRunBtn.className = "primary-action";
    newRunBtn.type = "button";
    newRunBtn.textContent = "Awaken again";
    newRunBtn.title = "Begin a new run";
    newRunBtn.addEventListener("click", () => this.props.onNewRun());

    const titleBtn = document.createElement("button");
    titleBtn.type = "button";
    titleBtn.textContent = "Close the volume";
    titleBtn.title = "Return to the title screen";
    titleBtn.addEventListener("click", () => this.props.onTitle());

    actions.appendChild(newRunBtn);
    actions.appendChild(titleBtn);
    main.appendChild(actions);

    this.element = main;

    // Choreograph the ceremony. Reduced-motion users land on the final
    // state immediately; everyone else watches the title coalesce, the
    // subtitle and detail card fade in behind, the epitaph types
    // letter-by-letter, and the actions become available last.
    const reduced =
      document.documentElement.dataset.reducedMotion === "true" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;

    if (!reduced) {
      const headingLetters = Array.from(h1.querySelectorAll(".title-letter"));
      gsap.set(headingLetters, {
        opacity: 0,
        y: 14,
        filter: "blur(6px)",
      });
      gsap.to(headingLetters, {
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
        duration: 0.9,
        stagger: { each: 0.05, from: "start" },
        ease: "power3.out",
        delay: 0.1,
      });

      const epitaphLetters = Array.from(epitaphEl.querySelectorAll(".title-letter"));
      gsap.set([sub, ...card.querySelectorAll("dl"), ...epitaphLetters], { opacity: 0 });
      gsap.set(epitaphLetters, { y: 6 });

      gsap.to(sub, { opacity: 1, duration: 0.8, delay: 1.2, ease: "power1.out" });
      gsap.to(card.querySelectorAll("dl"), { opacity: 1, duration: 0.8, delay: 1.6, ease: "power1.out" });
      gsap.to(epitaphLetters, {
        opacity: 1,
        y: 0,
        duration: 0.6,
        stagger: 0.015,
        delay: 2.0,
        ease: "power1.out",
      });

      gsap.fromTo(
        actions,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.8, delay: 3.6, ease: "power2.out" },
      );
    }

    // Hand back to the orchestrator so it can fade master audio in
    // parallel with the visual ceremony. The audio engine handles
    // suspend itself; we just trigger it.
    this.props.onMount?.();

    return main;
  }

  destroy(): void {
    this.particles?.destroy();
    this.particles = null;
    this.element = null;
  }
}
