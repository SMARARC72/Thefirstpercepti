interface OnboardingOverlayProps {
  onDismiss: () => void;
}

export class OnboardingOverlay {
  private props: OnboardingOverlayProps;
  private element: HTMLElement | null = null;

  constructor(props: OnboardingOverlayProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const div = document.createElement("div");
    div.className = "onboarding-overlay";
    div.setAttribute("role", "region");
    div.setAttribute("aria-labelledby", "onboarding-title");

    const content = document.createElement("div");
    content.className = "onboarding-content";

    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "First turn";

    const title = document.createElement("h2");
    title.id = "onboarding-title";
    title.textContent = "Choose a suggested action or type your own.";

    const body = document.createElement("p");
    body.textContent =
      "The command line accepts plain language. Start with a verb: look, listen, speak, approach, rest, wait, flee, or attack.";

    const dismiss = document.createElement("button");
    dismiss.type = "button";
    dismiss.className = "primary-action";
    dismiss.textContent = "Dismiss";
    dismiss.addEventListener("click", () => this.props.onDismiss());

    content.appendChild(eyebrow);
    content.appendChild(title);
    content.appendChild(body);
    content.appendChild(dismiss);
    div.appendChild(content);

    this.element = div;
    return div;
  }

  destroy(): void {
    this.element = null;
  }
}
