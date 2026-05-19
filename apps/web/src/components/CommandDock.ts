import type { SuggestedAction } from "../game";

interface CommandDockProps {
  draft: string;
  feedback: string;
  suggestions: SuggestedAction[];
  onSubmit: (command: string) => void;
  onDraftChange: (value: string) => void;
}

export class CommandDock {
  private props: CommandDockProps;
  private element: HTMLElement | null = null;
  private input: HTMLInputElement | null = null;
  private feedbackEl: HTMLElement | null = null;

  constructor(props: CommandDockProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const form = document.createElement("form");
    form.className = "command-dock";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = this.input?.value.trim() ?? "";
      if (value) this.props.onSubmit(value);
    });

    const label = document.createElement("label");
    label.htmlFor = "command-input";
    label.textContent = "Command";

    const row = document.createElement("div");
    row.className = "command-row";

    this.input = document.createElement("input");
    this.input.id = "command-input";
    this.input.type = "text";
    this.input.autocomplete = "off";
    this.input.placeholder = "Type what you do next...";
    this.input.value = this.props.draft;
    this.input.addEventListener("input", (e) => {
      this.props.onDraftChange((e.target as HTMLInputElement).value);
    });

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "primary-action";
    submit.textContent = "Submit";

    row.appendChild(this.input);
    row.appendChild(submit);

    this.feedbackEl = document.createElement("p");
    this.feedbackEl.className = "command-feedback";
    this.feedbackEl.setAttribute("role", "status");
    this.feedbackEl.setAttribute("aria-live", "polite");
    this.feedbackEl.textContent = this.props.feedback;

    const quickActions = document.createElement("div");
    quickActions.className = "quick-actions";
    quickActions.setAttribute("aria-label", "Suggested actions");
    for (const action of this.props.suggestions) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = action.label;
      btn.addEventListener("click", () => this.props.onSubmit(action.command));
      quickActions.appendChild(btn);
    }

    form.appendChild(label);
    form.appendChild(row);
    form.appendChild(this.feedbackEl);
    form.appendChild(quickActions);

    this.element = form;
    return form;
  }

  update(newProps: Partial<CommandDockProps>): void {
    if (newProps.draft !== undefined && this.input && this.input.value !== newProps.draft) {
      this.props.draft = newProps.draft;
      this.input.value = newProps.draft;
    }
    if (newProps.feedback !== undefined && this.feedbackEl) {
      this.props.feedback = newProps.feedback;
      this.feedbackEl.textContent = newProps.feedback;
    }
    if (newProps.suggestions !== undefined) {
      this.props.suggestions = newProps.suggestions;
      // Rebuild quick actions
      if (this.element) {
        const oldQuick = this.element.querySelector(".quick-actions");
        if (oldQuick) {
          const quickActions = document.createElement("div");
          quickActions.className = "quick-actions";
          quickActions.setAttribute("aria-label", "Suggested actions");
          for (const action of newProps.suggestions) {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.textContent = action.label;
            btn.addEventListener("click", () => this.props.onSubmit(action.command));
            quickActions.appendChild(btn);
          }
          oldQuick.replaceWith(quickActions);
        }
      }
    }
  }

  focus(): void {
    this.input?.focus();
  }

  destroy(): void {
    this.element = null;
    this.input = null;
    this.feedbackEl = null;
  }
}
