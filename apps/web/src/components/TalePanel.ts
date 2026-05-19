import type { GameState, TaleEntry } from "../game";
import { CommandDock } from "./CommandDock";
import { OnboardingOverlay } from "./OnboardingOverlay";

interface TalePanelProps {
  game: GameState;
  commandDraft: string;
  onCommand: (command: string) => void;
  onDraftChange: (value: string) => void;
}

export class TalePanel {
  private props: TalePanelProps;
  private element: HTMLElement | null = null;
  private list: HTMLElement | null = null;
  private commandDock: CommandDock | null = null;
  private onboarding: OnboardingOverlay | null = null;

  constructor(props: TalePanelProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const section = document.createElement("section");
    section.id = "panel-tale";
    section.className = "panel tale-panel active-panel";
    section.setAttribute("role", "tabpanel");
    section.setAttribute("aria-labelledby", "tab-tale");

    // Onboarding
    if (!this.props.game.onboardingDismissed && this.props.game.turnCount === 0) {
      this.onboarding = new OnboardingOverlay({
        onDismiss: () => {
          this.props.game.onboardingDismissed = true;
          this.onboarding?.destroy();
          this.onboarding = null;
          section.querySelector(".onboarding-overlay")?.remove();
        },
      });
      section.appendChild(this.onboarding.render());
    }

    const heading = document.createElement("div");
    heading.className = "panel-heading";
    const titleGroup = document.createElement("div");
    const eyebrow = document.createElement("p");
    eyebrow.className = "eyebrow";
    eyebrow.textContent = "Narrative log";
    const h2 = document.createElement("h2");
    h2.textContent = "The Tale";
    titleGroup.appendChild(eyebrow);
    titleGroup.appendChild(h2);

    const turnPill = document.createElement("span");
    turnPill.className = "turn-pill";
    turnPill.textContent = `Turn ${this.props.game.turnCount}`;

    heading.appendChild(titleGroup);
    heading.appendChild(turnPill);
    section.appendChild(heading);

    this.list = document.createElement("div");
    this.list.className = "tale-list";
    this.list.setAttribute("aria-label", "Recent narrative events");
    this.list.setAttribute("aria-live", "polite");
    this.renderEntries(this.props.game.tale);
    section.appendChild(this.list);

    this.commandDock = new CommandDock({
      draft: this.props.commandDraft,
      feedback: this.props.game.lastFeedback,
      suggestions: this.props.game.suggestedActions,
      onSubmit: this.props.onCommand,
      onDraftChange: this.props.onDraftChange,
    });
    section.appendChild(this.commandDock.render());

    this.element = section;
    return section;
  }

  private renderEntries(entries: TaleEntry[]): void {
    if (!this.list) return;
    this.list.innerHTML = "";
    for (const entry of entries) {
      const article = document.createElement("article");
      article.className = `tale-entry ${entry.tone}`;

      const turn = document.createElement("span");
      turn.textContent = `Turn ${entry.turn}`;

      const h3 = document.createElement("h3");
      h3.textContent = entry.title;

      const body = document.createElement("p");
      body.textContent = entry.body;

      article.appendChild(turn);
      article.appendChild(h3);
      article.appendChild(body);
      this.list.appendChild(article);
    }
  }

  update(newProps: Partial<TalePanelProps>): void {
    if (newProps.game) {
      const oldTurn = this.props.game.turnCount;
      const oldTaleLength = this.props.game.tale.length;
      this.props.game = newProps.game;
      if (this.list && (newProps.game.tale.length !== oldTaleLength || oldTurn !== newProps.game.turnCount)) {
        this.renderEntries(newProps.game.tale);
      }
      if (this.commandDock) {
        this.commandDock.update({
          feedback: newProps.game.lastFeedback,
          suggestions: newProps.game.suggestedActions,
        });
      }
      const turnPill = this.element?.querySelector(".turn-pill");
      if (turnPill) turnPill.textContent = `Turn ${newProps.game.turnCount}`;
    }
    if (newProps.commandDraft !== undefined && this.commandDock) {
      this.commandDock.update({ draft: newProps.commandDraft });
    }
  }

  destroy(): void {
    this.commandDock?.destroy();
    this.onboarding?.destroy();
    this.element = null;
  }
}
