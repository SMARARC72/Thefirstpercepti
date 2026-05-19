import type { GameTab } from "../game";

interface TabNavProps {
  tabs: { id: GameTab; label: string }[];
  active: GameTab;
  onChange: (tab: GameTab) => void;
  position?: "bottom" | "top";
}

export class TabNav {
  private props: Required<TabNavProps>;
  private element: HTMLElement | null = null;
  private buttons: Map<string, HTMLButtonElement> = new Map();

  constructor(props: TabNavProps) {
    this.props = {
      tabs: props.tabs,
      active: props.active,
      onChange: props.onChange,
      position: props.position ?? "bottom",
    };
  }

  render(): HTMLElement {
    const nav = document.createElement("nav");
    nav.className = `tab-nav tab-nav--${this.props.position}`;
    nav.setAttribute("role", "tablist");
    nav.setAttribute("aria-label", "Gameplay panels");

    for (const tab of this.props.tabs) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", String(tab.id === this.props.active));
      btn.setAttribute("aria-controls", `panel-${tab.id}`);
      btn.dataset.tab = tab.id;
      btn.textContent = tab.label;
      btn.className = tab.id === this.props.active ? "active" : "";
      btn.addEventListener("click", () => this.props.onChange(tab.id));
      this.buttons.set(tab.id, btn);
      nav.appendChild(btn);
    }

    this.element = nav;
    return nav;
  }

  update(newProps: Partial<TabNavProps>): void {
    if (newProps.active !== undefined && newProps.active !== this.props.active) {
      this.props.active = newProps.active;
      for (const [id, btn] of this.buttons) {
        const isActive = id === this.props.active;
        btn.setAttribute("aria-selected", String(isActive));
        btn.className = isActive ? "active" : "";
      }
    }
  }

  destroy(): void {
    this.buttons.clear();
    this.element = null;
  }
}
