interface OnboardingOverlayProps {
  onDismiss: () => void;
}

/**
 * Witness Briefing — the first-run overlay shown on turn 0 of a new
 * character. Grounds the player in the cosmic-horror premise (the
 * Shattering, the Witness role, the reincarnation/legacy loop) AND
 * the input mechanics (plain-language verbs) in a single scannable
 * screen. Dismiss flips game.onboardingDismissed so it never re-shows
 * for this character.
 */
export class OnboardingOverlay {
  private props: OnboardingOverlayProps;
  private element: HTMLElement | null = null;

  constructor(props: OnboardingOverlayProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const div = document.createElement("div");
    div.className = "onboarding-overlay";
    div.setAttribute("role", "dialog");
    div.setAttribute("aria-modal", "true");
    div.setAttribute("aria-labelledby", "onboarding-title");

    const content = document.createElement("div");
    content.className = "onboarding-content";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "The First Glimpse";

    const title = document.createElement("h2");
    title.id = "onboarding-title";
    title.textContent = "You have crossed into a world that should not exist.";

    const premise = document.createElement("p");
    premise.textContent =
      "The Shattering broke the membrane between what is and what was. You are a Witness — drawn here for reasons not yet your own. The world will kill you. Each death is a passage; what you learn becomes the inheritance of the next who arrives.";

    const mechanics = document.createElement("p");
    mechanics.textContent =
      "Type plain language to act. Verbs like look, listen, speak, approach, rest, and attack open the doors. The tabs at the bottom hold your sheet, your trove, and your reckoning with the world.";

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "primary-action";
    dismiss.textContent = "I bear witness.";
    dismiss.setAttribute("aria-label", "Acknowledge the briefing and begin");
    dismiss.addEventListener("click", () => this.props.onDismiss());

    content.appendChild(eyebrow);
    content.appendChild(title);
    content.appendChild(premise);
    content.appendChild(mechanics);
    content.appendChild(dismiss);
    div.appendChild(content);

    this.element = div;
    return div;
  }

  destroy(): void {
    this.element = null;
  }
}
