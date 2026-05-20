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
  // Per-session command history ring. Newest-first. ArrowUp walks back
  // through prior submissions; ArrowDown walks forward. Typing exits
  // history mode and resets the cursor.
  private static readonly HISTORY_MAX = 16;
  private history: string[] = [];
  private historyCursor = -1;
  private draftBeforeHistory: string | null = null;

  constructor(props: CommandDockProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const form = document.createElement("form");
    form.className = "command-dock";
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const value = this.input?.value.trim() ?? "";
      if (value) {
        this.pushHistory(value);
        this.props.onSubmit(value);
      }
    });

    const label = document.createElement("label");
    label.htmlFor = "command-input";
    label.textContent = "Speak";
    label.title = "Command";

    const row = document.createElement("div");
    row.className = "command-row";

    this.input = document.createElement("input");
    this.input.id = "command-input";
    this.input.type = "text";
    this.input.autocomplete = "off";
    this.input.placeholder = "Speak. The world is listening.";
    this.input.value = this.props.draft;
    this.input.addEventListener("input", (e) => {
      // Manual typing exits history-walk mode so the player can edit
      // freely after pulling a prior command back.
      this.historyCursor = -1;
      this.draftBeforeHistory = null;
      this.props.onDraftChange((e.target as HTMLInputElement).value);
    });
    this.input.addEventListener("keydown", (e) => this.handleKey(e));

    const submit = document.createElement("button");
    submit.type = "submit";
    submit.className = "primary-action";
    submit.textContent = "Speak it";
    submit.title = "Submit command";

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

  /**
   * Prepend a command to the history ring. De-dupes against the most
   * recent entry so spamming the same verb doesn't fill the buffer.
   */
  private pushHistory(value: string): void {
    if (this.history[0] === value) {
      this.historyCursor = -1;
      this.draftBeforeHistory = null;
      return;
    }
    this.history.unshift(value);
    if (this.history.length > CommandDock.HISTORY_MAX) {
      this.history.length = CommandDock.HISTORY_MAX;
    }
    this.historyCursor = -1;
    this.draftBeforeHistory = null;
  }

  /**
   * ArrowUp walks back through history (older); ArrowDown walks
   * forward (newer). At cursor=-1 the input shows the live draft.
   * At cursor=history.length-1 the input shows the oldest entry.
   * Pressing ArrowDown from -1 is a no-op.
   */
  private handleKey(e: KeyboardEvent): void {
    if (!this.input || this.history.length === 0) return;
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (this.historyCursor === -1) {
        // Stash the current draft so ArrowDown back to the live row
        // restores it instead of clearing.
        this.draftBeforeHistory = this.input.value;
      }
      if (this.historyCursor < this.history.length - 1) {
        this.historyCursor++;
        this.input.value = this.history[this.historyCursor];
        this.input.setSelectionRange(this.input.value.length, this.input.value.length);
        this.props.onDraftChange(this.input.value);
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      if (this.historyCursor === -1) return;
      this.historyCursor--;
      if (this.historyCursor === -1) {
        this.input.value = this.draftBeforeHistory ?? "";
        this.draftBeforeHistory = null;
      } else {
        this.input.value = this.history[this.historyCursor];
      }
      this.input.setSelectionRange(this.input.value.length, this.input.value.length);
      this.props.onDraftChange(this.input.value);
    }
  }

  destroy(): void {
    this.element = null;
    this.input = null;
    this.feedbackEl = null;
  }
}
