import type { AppState, GameState, GameTab } from "../game";
import { timeLabel, domainLabel } from "../game";
import { TalePanel } from "../components/TalePanel";
import { FatePanel } from "../components/FatePanel";
import { StatusPanel } from "../components/StatusPanel";
import { WorldPanel } from "../components/WorldPanel";
import { FactionsPanel } from "../components/FactionsPanel";
import { NpcsPanel } from "../components/NpcsPanel";
import { CodexPanel } from "../components/CodexPanel";
import { JournalPanel } from "../components/JournalPanel";
import { TabNav } from "../components/TabNav";
import { updateVignette } from "../effects/vignette";

interface GameplayScreenProps {
  state: AppState;
  onCommand: (command: string) => void | Promise<void>;
  onDraftChange: (value: string) => void;
  onTabChange: (tab: GameTab) => void;
  onSave: () => void;
  onLoad: () => void;
  onNewGame: () => void;
  onOpenSettings: () => void;
}

export class GameplayScreen {
  private props: GameplayScreenProps;
  private element: HTMLElement | null = null;
  private tabNav: TabNav | null = null;
  private panelInstances: Array<{ destroy: () => void }> = [];

  constructor(props: GameplayScreenProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const game = this.props.state.game!;
    const main = document.createElement("main");
    main.className = "game-screen";
    main.setAttribute("aria-labelledby", "game-heading");

    main.appendChild(this.renderHeader(game));

    // Tab labels are diegetic — the underlying GameTab ids stay stable so
    // store / persistence / tests are unaffected; only what the player
    // reads changes. Tooltips carry the literal meaning for clarity.
    const tabs: { id: GameTab; label: string; title?: string }[] = [
      { id: "tale", label: "The Unfolding", title: "Tale — narrative log" },
      { id: "fate", label: "What Waits", title: "Fate — recent rolls" },
      { id: "status", label: "The Vessel", title: "Status — body and mind" },
      { id: "world", label: "The Known", title: "World — map and region" },
      { id: "factions", label: "The Powers", title: "Factions" },
      { id: "npcs", label: "The Met", title: "NPCs you have crossed" },
      { id: "codex", label: "Names of Things", title: "Codex — what you've named" },
      { id: "journal", label: "The Witness", title: "Journal — what you noted" },
    ];

    this.tabNav = new TabNav({
      tabs,
      active: this.props.state.activeTab,
      onChange: this.props.onTabChange,
      position: "bottom",
    });
    main.appendChild(this.tabNav.render());

    const grid = document.createElement("div");
    grid.className = "game-grid";

    // Left rail (desktop)
    const leftRail = document.createElement("aside");
    leftRail.className = "rail rail-left";
    leftRail.appendChild(this.renderWorldPanel(game));
    leftRail.appendChild(this.renderFactionsPanel(game));
    grid.appendChild(leftRail);

    // Center stage
    const center = document.createElement("div");
    center.className = "stage";
    center.appendChild(this.renderTalePanel(game));
    grid.appendChild(center);

    // Right rail (desktop)
    const rightRail = document.createElement("aside");
    rightRail.className = "rail rail-right";
    rightRail.appendChild(this.renderStatusPanel(game));
    rightRail.appendChild(this.renderFatePanel(game));
    rightRail.appendChild(this.renderNpcsPanel(game));
    grid.appendChild(rightRail);

    // Mobile panels (tabbed)
    const mobilePanels = document.createElement("div");
    mobilePanels.className = "mobile-panels";
    for (const tab of tabs) {
      if (tab.id === "tale") continue;
      const panel = this.renderMobilePanel(tab.id, game);
      if (panel) mobilePanels.appendChild(panel);
    }
    grid.appendChild(mobilePanels);

    main.appendChild(grid);

    this.element = main;
    updateVignette(game.world.danger);

    return main;
  }

  private renderHeader(game: GameState): HTMLElement {
    const header = document.createElement("header");
    header.className = "game-header";

    const identity = document.createElement("div");
    identity.className = "identity-strip";
    const dot = document.createElement("span");
    dot.className = "status-dot";
    dot.setAttribute("aria-hidden", "true");
    const identityText = document.createElement("div");
    const h1 = document.createElement("h1");
    h1.id = "game-heading";
    h1.textContent = game.player.name;
    const sub = document.createElement("p");
    sub.textContent = `${game.player.formLabel} / ${game.player.postureLabel} / ${domainLabel(game.player.domain)}`;
    identityText.appendChild(h1);
    identityText.appendChild(sub);
    identity.appendChild(dot);
    identity.appendChild(identityText);

    const world = document.createElement("div");
    world.className = "world-strip";
    world.setAttribute("aria-label", "Current world state");
    const time = document.createElement("strong");
    time.textContent = timeLabel(game);
    const region = document.createElement("span");
    region.textContent = game.world.region;
    const weather = document.createElement("span");
    weather.textContent = game.world.weather;
    world.appendChild(time);
    world.appendChild(region);
    world.appendChild(weather);

    const actions = document.createElement("div");
    actions.className = "header-actions";
    actions.setAttribute("aria-label", "Save and navigation");

    const saveBtn = document.createElement("button");
    saveBtn.type = "button";
    saveBtn.textContent = "Bind";
    saveBtn.title = "Save the current run";
    saveBtn.addEventListener("click", () => this.props.onSave());

    const loadBtn = document.createElement("button");
    loadBtn.type = "button";
    loadBtn.textContent = "Recall";
    loadBtn.title = "Load the last save";
    loadBtn.addEventListener("click", () => this.props.onLoad());

    const newBtn = document.createElement("button");
    newBtn.type = "button";
    newBtn.textContent = "Withdraw";
    newBtn.title = "Return to the title";
    newBtn.addEventListener("click", () => this.props.onNewGame());

    const settingsBtn = document.createElement("button");
    settingsBtn.type = "button";
    settingsBtn.setAttribute("aria-label", "Open settings");
    settingsBtn.textContent = "\u2699";
    settingsBtn.addEventListener("click", () => this.props.onOpenSettings());

    actions.appendChild(saveBtn);
    actions.appendChild(loadBtn);
    actions.appendChild(newBtn);
    actions.appendChild(settingsBtn);

    header.appendChild(identity);
    header.appendChild(world);
    header.appendChild(actions);
    return header;
  }

  private renderTalePanel(game: GameState): HTMLElement {
    const tale = new TalePanel({
      game,
      commandDraft: this.props.state.commandDraft,
      onCommand: this.props.onCommand,
      onDraftChange: this.props.onDraftChange,
    });
    this.panelInstances.push(tale);
    return tale.render();
  }

  private renderFatePanel(game: GameState): HTMLElement {
    const fate = new FatePanel({ game });
    this.panelInstances.push(fate);
    return fate.render();
  }

  private renderStatusPanel(game: GameState): HTMLElement {
    const status = new StatusPanel({ game });
    this.panelInstances.push(status);
    return status.render();
  }

  private renderWorldPanel(game: GameState): HTMLElement {
    const world = new WorldPanel({ game });
    this.panelInstances.push(world);
    return world.render();
  }

  private renderFactionsPanel(game: GameState): HTMLElement {
    const factions = new FactionsPanel({ game });
    this.panelInstances.push(factions);
    return factions.render();
  }

  private renderNpcsPanel(game: GameState): HTMLElement {
    const npcs = new NpcsPanel({ game });
    this.panelInstances.push(npcs);
    return npcs.render();
  }

  private renderMobilePanel(tab: GameTab, game: GameState): HTMLElement | null {
    switch (tab) {
      case "fate": {
        const p = new FatePanel({ game });
        this.panelInstances.push(p);
        const el = p.render();
        el.classList.add("mobile-panel");
        return el;
      }
      case "status": {
        const p = new StatusPanel({ game });
        this.panelInstances.push(p);
        const el = p.render();
        el.classList.add("mobile-panel");
        return el;
      }
      case "world": {
        const p = new WorldPanel({ game });
        this.panelInstances.push(p);
        const el = p.render();
        el.classList.add("mobile-panel");
        return el;
      }
      case "factions": {
        const p = new FactionsPanel({ game });
        this.panelInstances.push(p);
        const el = p.render();
        el.classList.add("mobile-panel");
        return el;
      }
      case "npcs": {
        const p = new NpcsPanel({ game });
        this.panelInstances.push(p);
        const el = p.render();
        el.classList.add("mobile-panel");
        return el;
      }
      case "codex": {
        const p = new CodexPanel({ entries: game.journal });
        this.panelInstances.push(p);
        const el = p.render();
        el.classList.add("mobile-panel");
        return el;
      }
      case "journal": {
        const p = new JournalPanel({ entries: game.journal });
        this.panelInstances.push(p);
        const el = p.render();
        el.classList.add("mobile-panel");
        return el;
      }
      default:
        return null;
    }
  }

  update(newProps: Partial<GameplayScreenProps>): void {
    if (newProps.state) {
      const oldState = this.props.state;
      this.props.state = newProps.state;

      if (this.element && oldState.game !== newProps.state.game && newProps.state.game) {
        const game = newProps.state.game;
        const h1 = this.element.querySelector("#game-heading");
        if (h1) h1.textContent = game.player.name;
        const sub = this.element.querySelector(".identity-strip p");
        if (sub) sub.textContent = `${game.player.formLabel} / ${game.player.postureLabel} / ${domainLabel(game.player.domain)}`;
        const time = this.element.querySelector(".world-strip strong");
        if (time) time.textContent = timeLabel(game);
        const region = this.element.querySelectorAll(".world-strip span")[0];
        if (region) region.textContent = game.world.region;
        const weather = this.element.querySelectorAll(".world-strip span")[1];
        if (weather) weather.textContent = game.world.weather;
        updateVignette(game.world.danger);

        for (const panel of this.panelInstances) {
          if ("update" in panel) {
            (panel as unknown as { update(props: Record<string, unknown>): void }).update({ game });
          }
        }
      }

      if (oldState.activeTab !== newProps.state.activeTab) {
        this.tabNav?.update({ active: newProps.state.activeTab });
        this.syncMobilePanels(newProps.state.activeTab);
      }
    }
  }

  private syncMobilePanels(activeTab: GameTab): void {
    if (!this.element) return;
    const mobilePanels = this.element.querySelectorAll(".mobile-panel");
    mobilePanels.forEach((p) => {
      const el = p as HTMLElement;
      el.classList.toggle("active-panel", el.id === `panel-${activeTab}`);
    });

    const desktopPanels = this.element.querySelectorAll(".rail .panel");
    desktopPanels.forEach((p) => {
      (p as HTMLElement).classList.add("active-panel");
    });
  }

  destroy(): void {
    for (const c of this.panelInstances) c.destroy();
    this.panelInstances = [];
    this.tabNav?.destroy();
    this.element = null;
  }
}
