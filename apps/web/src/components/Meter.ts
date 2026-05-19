interface MeterProps {
  label: string;
  value: number;
  max: number;
  color?: "teal" | "gold" | "crimson";
}

export class Meter {
  private props: MeterProps;
  private element: HTMLElement | null = null;
  private track: HTMLSpanElement | null = null;
  private valueText: HTMLElement | null = null;

  constructor(props: MeterProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const percent = Math.max(0, Math.min(100, Math.round((this.props.value / this.props.max) * 100)));
    const colorClass = this.props.color ?? "teal";

    const root = document.createElement("div");
    root.className = "meter";
    root.setAttribute("aria-label", `${this.props.label}: ${this.props.value} of ${this.props.max}`);
    root.setAttribute("role", "meter");
    root.setAttribute("aria-valuenow", String(this.props.value));
    root.setAttribute("aria-valuemax", String(this.props.max));

    const header = document.createElement("div");
    const label = document.createElement("span");
    label.textContent = this.props.label;
    this.valueText = document.createElement("strong");
    this.valueText.textContent = `${this.props.value}/${this.props.max}`;
    header.appendChild(label);
    header.appendChild(this.valueText);

    const track = document.createElement("span");
    track.className = "meter-track";
    this.track = document.createElement("span");
    this.track.style.width = `${percent}%`;
    this.track.dataset.color = colorClass;
    track.appendChild(this.track);

    root.appendChild(header);
    root.appendChild(track);
    this.element = root;
    return root;
  }

  update(newProps: Partial<MeterProps>): void {
    if (newProps.value !== undefined) this.props.value = newProps.value;
    if (newProps.max !== undefined) this.props.max = newProps.max;
    if (newProps.label !== undefined) this.props.label = newProps.label;
    if (newProps.color !== undefined) this.props.color = newProps.color;

    const percent = Math.max(0, Math.min(100, Math.round((this.props.value / this.props.max) * 100)));
    if (this.track) {
      this.track.style.width = `${percent}%`;
      if (this.props.color) this.track.dataset.color = this.props.color;
    }
    if (this.valueText) {
      this.valueText.textContent = `${this.props.value}/${this.props.max}`;
    }
    if (this.element) {
      this.element.setAttribute("aria-label", `${this.props.label}: ${this.props.value} of ${this.props.max}`);
      this.element.setAttribute("aria-valuenow", String(this.props.value));
      this.element.setAttribute("aria-valuemax", String(this.props.max));
    }
  }

  destroy(): void {
    this.element = null;
    this.track = null;
    this.valueText = null;
  }
}
