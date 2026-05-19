interface TypewriterProps {
  text: string;
  speed?: number; // ms per char, 0 = instant
  onComplete?: () => void;
  className?: string;
}

export class TypewriterText {
  private props: TypewriterProps;
  private element: HTMLElement | null = null;
  private timer = 0;
  private index = 0;

  constructor(props: TypewriterProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const span = document.createElement("span");
    span.className = this.props.className ?? "typewriter-text";
    this.element = span;
    this.start();
    return span;
  }

  private start(): void {
    if (!this.element) return;
    const speed = this.props.speed ?? 16;
    if (speed <= 0 || document.documentElement.dataset.reducedMotion === "true") {
      if (this.element) this.element.textContent = this.props.text;
      this.props.onComplete?.();
      return;
    }
    this.index = 0;
    this.element.textContent = "";
    this.tick();
  }

  private tick = (): void => {
    if (!this.element) return;
    if (this.index >= this.props.text.length) {
      this.props.onComplete?.();
      return;
    }
    this.element.textContent += this.props.text.charAt(this.index);
    this.index++;
    const speed = this.props.speed ?? 16;
    this.timer = window.setTimeout(this.tick, speed);
  };

  update(newProps: Partial<TypewriterProps>): void {
    if (newProps.text !== undefined && newProps.text !== this.props.text) {
      this.props.text = newProps.text;
      clearTimeout(this.timer);
      this.start();
    }
    if (newProps.speed !== undefined) this.props.speed = newProps.speed;
  }

  destroy(): void {
    clearTimeout(this.timer);
    this.element = null;
  }
}
