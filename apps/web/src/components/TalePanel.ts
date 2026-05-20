import gsap from "gsap";
import type { GameState, TaleEntry } from "../game";
import { CommandDock } from "./CommandDock";
import { OnboardingOverlay } from "./OnboardingOverlay";
import { TypewriterText } from "./TypewriterText";

/** Map a 0..100 danger score to a CSS-friendly tier. Drives the
 * turn-pill ember-breathe animation (see styles.css). */
function dangerTier(danger: number): "low" | "mid" | "high" | "extreme" {
  if (danger >= 80) return "extreme";
  if (danger >= 55) return "high";
  if (danger >= 30) return "mid";
  return "low";
}

interface TalePanelProps {
  game: GameState;
  commandDraft: string;
  onCommand: (command: string) => void;
  onDraftChange: (value: string) => void;
}

/**
 * Renders the unfolding tale. New entries slide in from below; if the
 * reader has scrolled back when an entry arrives, a "↓ new" pill drops
 * down and snaps focus to the bottom on click. The slow-reveal
 * animation respects `prefers-reduced-motion`.
 *
 * The render pipeline is incremental: we track which entry ids are
 * already in the DOM, render only new ones, and let CSS handle the
 * styling. This keeps gsap targets stable (no full re-render per
 * turn) so the animation reads cleanly.
 */
export class TalePanel {
  private props: TalePanelProps;
  private element: HTMLElement | null = null;
  private list: HTMLElement | null = null;
  private commandDock: CommandDock | null = null;
  private onboarding: OnboardingOverlay | null = null;
  private renderedIds = new Set<string>();
  private recallPill: HTMLButtonElement | null = null;
  // Single in-flight progressive renderer for the newest tale entry.
  // Old entries are rendered statically (they've already been "seen").
  // If a new entry arrives mid-type, the previous typewriter is destroyed
  // and its body backfilled to the full text.
  private activeTypewriter: TypewriterText | null = null;
  private activeTypewriterEntryId: string | null = null;

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
    eyebrow.textContent = "The Witness records";
    eyebrow.title = "Narrative log";
    const h2 = document.createElement("h2");
    h2.textContent = "The Unfolding";
    h2.title = "Tale";
    titleGroup.appendChild(eyebrow);
    titleGroup.appendChild(h2);

    // Turn pill carries a danger-tier dataset so CSS can pulse it as the
    // world becomes more hostile.
    const turnPill = document.createElement("span");
    turnPill.className = "turn-pill";
    turnPill.textContent = `Turn ${this.props.game.turnCount} · the world still notices`;
    turnPill.title = `Turn ${this.props.game.turnCount}`;
    turnPill.dataset.danger = dangerTier(this.props.game.world.danger);

    heading.appendChild(titleGroup);
    heading.appendChild(turnPill);
    section.appendChild(heading);

    this.list = document.createElement("div");
    this.list.className = "tale-list";
    this.list.setAttribute("aria-label", "Recent narrative events");
    this.list.setAttribute("aria-live", "polite");
    section.appendChild(this.list);

    // Recall pill — visible only when the reader is scrolled back and
    // new entries arrive. Click snaps the list to the bottom.
    this.recallPill = document.createElement("button");
    this.recallPill.type = "button";
    this.recallPill.className = "tale-recall-pill";
    this.recallPill.textContent = "Something just happened";
    this.recallPill.title = "Jump to the newest entry";
    this.recallPill.addEventListener("click", () => this.scrollToBottom());
    section.appendChild(this.recallPill);

    // First render — show every entry without animation since this is
    // the player's first look at the panel.
    this.renderInitial(this.props.game.tale);

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

  private renderInitial(entries: TaleEntry[]): void {
    if (!this.list) return;
    this.list.innerHTML = "";
    this.renderedIds.clear();
    // Tale entries arrive newest-first (the store unshifts). For the
    // reading direction we want oldest at the top and the newest near
    // the dock, so we render reversed.
    const ordered = entries.slice().reverse();
    for (const entry of ordered) {
      this.list.appendChild(this.buildEntry(entry));
      this.renderedIds.add(entry.id);
    }
    // Land at the bottom on first paint.
    requestAnimationFrame(() => this.scrollToBottom());
  }

  private buildEntry(entry: TaleEntry, options: { progressive?: boolean } = {}): HTMLElement {
    const article = document.createElement("article");
    article.className = `tale-entry ${entry.tone}`;
    article.dataset.entryId = entry.id;

    const turn = document.createElement("span");
    turn.textContent = `Turn ${entry.turn}`;

    const h3 = document.createElement("h3");
    h3.textContent = entry.title;

    const body = document.createElement("p");
    if (options.progressive && entry.body.length > 0) {
      // Cancel any prior typewriter — the new entry takes the spotlight.
      this.finishActiveTypewriter();
      const writer = new TypewriterText({
        text: entry.body,
        speed: this.textSpeed(),
        className: "tale-entry-body",
        onComplete: () => {
          if (this.activeTypewriterEntryId === entry.id) {
            this.activeTypewriter = null;
            this.activeTypewriterEntryId = null;
          }
        },
      });
      body.appendChild(writer.render());
      this.activeTypewriter = writer;
      this.activeTypewriterEntryId = entry.id;
    } else {
      body.textContent = entry.body;
    }

    article.appendChild(turn);
    article.appendChild(h3);
    article.appendChild(body);
    return article;
  }

  /**
   * Read the textSpeed setting from the DOM dataset main.ts maintains.
   * Falls back to the default if absent or invalid; 0 → instant render.
   */
  private textSpeed(): number {
    const raw = document.documentElement.dataset.textSpeed;
    if (raw === undefined || raw === "") return 16;
    const n = Number(raw);
    return Number.isFinite(n) && n >= 0 ? n : 16;
  }

  /**
   * If a typewriter is mid-flight, end it immediately and show the full
   * text. Called when a new entry arrives or the panel is destroyed.
   */
  private finishActiveTypewriter(): void {
    if (!this.activeTypewriter || !this.activeTypewriterEntryId) return;
    const article = this.list?.querySelector<HTMLElement>(
      `article[data-entry-id="${this.activeTypewriterEntryId}"]`
    );
    if (article) {
      const fullText = this.props.game.tale.find((e) => e.id === this.activeTypewriterEntryId)?.body;
      const body = article.querySelector("p");
      if (body && fullText !== undefined) body.textContent = fullText;
    }
    this.activeTypewriter.destroy();
    this.activeTypewriter = null;
    this.activeTypewriterEntryId = null;
  }

  /** True if the reader is within ~80 px of the bottom — close enough
   * that auto-scroll is non-disruptive. */
  private isAtBottom(): boolean {
    if (!this.list) return true;
    const slack = 80;
    return this.list.scrollTop + this.list.clientHeight + slack >= this.list.scrollHeight;
  }

  private scrollToBottom(behavior: ScrollBehavior = "smooth"): void {
    if (!this.list) return;
    this.list.scrollTo({ top: this.list.scrollHeight, behavior });
    this.recallPill?.classList.remove("visible");
  }

  private reducedMotion(): boolean {
    return (
      document.documentElement.dataset.reducedMotion === "true" ||
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
    );
  }

  /** Append entries that haven't been rendered yet, animate them in,
   * and either auto-scroll (if the reader was at the bottom) or flash
   * the recall pill (if they were reading older content). */
  private appendNew(entries: TaleEntry[]): void {
    if (!this.list) return;
    const ordered = entries.slice().reverse();
    const wasAtBottom = this.isAtBottom();
    const newEntries = ordered.filter((e) => !this.renderedIds.has(e.id));
    // Only the very last new entry gets the typewriter; older ones in
    // the same batch render statically (rare case — usually one per turn).
    const progressiveId = newEntries[newEntries.length - 1]?.id;
    const newNodes: HTMLElement[] = [];
    for (const entry of newEntries) {
      const node = this.buildEntry(entry, { progressive: entry.id === progressiveId });
      this.list.appendChild(node);
      this.renderedIds.add(entry.id);
      newNodes.push(node);
    }

    if (newNodes.length === 0) return;

    if (!this.reducedMotion()) {
      gsap.from(newNodes, {
        opacity: 0,
        y: 12,
        duration: 0.6,
        stagger: 0.08,
        ease: "power2.out",
      });
    }

    if (wasAtBottom) {
      requestAnimationFrame(() => this.scrollToBottom());
    } else {
      this.recallPill?.classList.add("visible");
    }
  }

  /** When tale entries are dropped (e.g. load from save), drop any DOM
   * nodes that no longer correspond to a real entry id. */
  private pruneStale(entries: TaleEntry[]): void {
    if (!this.list) return;
    const live = new Set(entries.map((e) => e.id));
    for (const node of Array.from(this.list.children)) {
      const id = (node as HTMLElement).dataset.entryId;
      if (id && !live.has(id)) {
        node.remove();
        this.renderedIds.delete(id);
      }
    }
  }

  update(newProps: Partial<TalePanelProps>): void {
    if (newProps.game) {
      const oldTurn = this.props.game.turnCount;
      const oldTaleLength = this.props.game.tale.length;
      this.props.game = newProps.game;

      if (this.list) {
        // If the tale shrank or changed identity (e.g. a load), redo
        // it. Otherwise incrementally append new entries.
        const newTale = newProps.game.tale;
        const grew = newTale.length > oldTaleLength || newTale.length === oldTaleLength && oldTurn !== newProps.game.turnCount;
        const liveIds = new Set(newTale.map((e) => e.id));
        let anyMissing = false;
        for (const id of this.renderedIds) {
          if (!liveIds.has(id)) {
            anyMissing = true;
            break;
          }
        }
        if (anyMissing) {
          this.pruneStale(newTale);
          this.renderInitial(newTale);
        } else if (grew) {
          this.appendNew(newTale);
        }
      }

      if (this.commandDock) {
        this.commandDock.update({
          feedback: newProps.game.lastFeedback,
          suggestions: newProps.game.suggestedActions,
        });
      }
      const turnPill = this.element?.querySelector(".turn-pill") as HTMLElement | null;
      if (turnPill) {
        turnPill.textContent = `Turn ${newProps.game.turnCount} · the world still notices`;
        turnPill.title = `Turn ${newProps.game.turnCount}`;
        turnPill.dataset.danger = dangerTier(newProps.game.world.danger);
      }
    }
    if (newProps.commandDraft !== undefined && this.commandDock) {
      this.commandDock.update({ draft: newProps.commandDraft });
    }
  }

  destroy(): void {
    this.activeTypewriter?.destroy();
    this.activeTypewriter = null;
    this.activeTypewriterEntryId = null;
    this.commandDock?.destroy();
    this.onboarding?.destroy();
    this.recallPill = null;
    this.renderedIds.clear();
    this.element = null;
  }
}
