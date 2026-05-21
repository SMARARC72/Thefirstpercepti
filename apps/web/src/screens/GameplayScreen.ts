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
import { createCharacterSheet, type CharacterSheetTab } from "../components/CharacterSheet";
import { createInventoryPanel } from "../components/InventoryPanel";
import { createAnvilPanel } from "../components/AnvilPanel";
import { createSpecimenJar, recomposeSpecimenJar } from "../components/SpecimenJar";
import { playerToSpecimenJarState } from "../state/playerToSpecimenJar";
import { createWorldTicker } from "../components/WorldTicker";
import { WorldTickerQueue } from "../state/WorldTickerQueue";
import { createLeanModeBadge } from "../components/LeanModeBadge";
import { createNoticeBanner } from "../components/NoticeBanner";
import { deriveNoticeBannerSlice } from "../state/noticeBannerSelector";
import { loadForgingRecipes } from "../data/worldLoader";
import { getLogger } from "@first-perception/types";
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
  private specimenJarHost: HTMLElement | null = null;
  private worldTickerMount: HTMLElement | null = null;
  // Long-lived per-screen queue. The World Director (engine) will enqueue
  // items into this once that plumbing lands; until then the bar renders
  // the "— the world is quiet —" placeholder.
  private readonly worldTickerQueue = new WorldTickerQueue();
  private leanBadgeSlot: HTMLElement | null = null;
  private noticeBannerSlot: HTMLElement | null = null;
  // Persist the sheet's active tab across game ticks. The new
  // createCharacterSheet has internal tab state, but refreshFunctionalPanel
  // tears it down on every state change, so we re-pass the active tab in.
  private sheetActiveTab: CharacterSheetTab = "stats";
  // Recipes are content-static; loaded once per screen instance so a
  // re-render on each game-state tick doesn't re-walk the JSON map.
  private readonly recipes = loadForgingRecipes();
  private readonly anvilLogger = getLogger();

  /**
   * The Anvil tab appears only when the player carries at least one item
   * whose id matches an input materialId of any known recipe. Below that
   * threshold the forge has nothing to do; hiding the tab removes a dead
   * surface for new characters.
   */
  private shouldShowAnvil(game: GameState): boolean {
    if (this.recipes.length === 0) return false;
    if (!game.player.inventory || game.player.inventory.length === 0) return false;
    const inventoryIds = new Set(game.player.inventory.map((i) => i.item_id));
    return this.recipes.some((r) => r.inputs.some((inp) => inventoryIds.has(inp.materialId)));
  }

  private handleForge = (recipeId: string): void => {
    // Dispatches through the same command pipe as typed input. The
    // forgingReducer (engine) consumes inputs, rolls the smith check,
    // and produces a tale entry + an output item on success.
    this.anvilLogger.info("anvil.forge.intent", { recipeId });
    void this.props.onCommand(`forge ${recipeId}`);
  };

  constructor(props: GameplayScreenProps) {
    this.props = props;
  }

  render(): HTMLElement {
    const game = this.props.state.game!;
    const main = document.createElement("main");
    main.className = "game-screen";
    main.setAttribute("aria-labelledby", "game-heading");

    main.appendChild(this.renderHeader(game));
    main.appendChild(this.renderWorldTickerBar());

    // Tab labels are diegetic — the underlying GameTab ids stay stable so
    // store / persistence / tests are unaffected; only what the player
    // reads changes. Tooltips carry the literal meaning for clarity.
    const allTabs: { id: GameTab; label: string; title?: string }[] = [
      { id: "tale", label: "The Unfolding", title: "Tale — narrative log" },
      { id: "fate", label: "The Tally", title: "Fate — recent rolls and outcomes" },
      { id: "sheet", label: "The Sheet", title: "Character sheet — abilities, saves, hit dice" },
      { id: "trove", label: "The Trove", title: "Inventory — what the pack holds" },
      { id: "anvil", label: "The Anvil", title: "Forging — materials, recipes, and the smith's roll" },
      { id: "status", label: "The Vessel", title: "Status — body and mind" },
      { id: "world", label: "The Known", title: "World — map and region" },
      { id: "factions", label: "The Powers", title: "Factions" },
      { id: "npcs", label: "The Met", title: "NPCs you have crossed" },
      { id: "codex", label: "The Catalogue", title: "Codex — names, places, and things observed" },
      { id: "journal", label: "The Witness", title: "Journal — what you noted" },
    ];
    // Contextual reveals: only show The Anvil when the player holds at
    // least one material that matches a known recipe input. Phase 11
    // minimal scope; other contextual hides (Codex, Journal, etc.) can
    // follow once the journal/codex content surfaces stabilise.
    const tabs = allTabs.filter((t) => t.id !== "anvil" || this.shouldShowAnvil(game));

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
    leftRail.appendChild(this.renderSpecimenJar(game));
    leftRail.appendChild(this.renderWorldPanel(game));
    leftRail.appendChild(this.renderFactionsPanel(game));
    grid.appendChild(leftRail);

    // Center stage
    const center = document.createElement("div");
    center.className = "stage";
    // NoticeBanner slot — populated only when notice ≥ 7 (rung-condition
    // present on the player). The slot stays empty otherwise so the tale
    // panel sits flush against the world ticker.
    const noticeSlot = document.createElement("div");
    noticeSlot.className = "notice-banner-slot";
    this.noticeBannerSlot = noticeSlot;
    center.appendChild(noticeSlot);
    center.appendChild(this.renderTalePanel(game));
    grid.appendChild(center);
    this.refreshNoticeBanner(game);

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
    this.mountLeanModeBadge();

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
    // Living-world status pill — surfaces whether the LLM-driven NPC /
    // faction / GM-narrator agents are active. Default is "off" because
    // GameSettings.llmEnabled starts false; enabling it via The Lens
    // flips this pill to "on" via the update() path.
    const llmPill = document.createElement("span");
    llmPill.className = "llm-status-pill";
    const llmOn = this.props.state.settings?.llmEnabled === true;
    llmPill.dataset.state = llmOn ? "on" : "off";
    llmPill.textContent = llmOn ? "Living world: on" : "Living world: off";
    llmPill.title = llmOn
      ? "Living World is active — NPCs, factions, and the GM narrator respond dynamically."
      : "Living World is off — enable in The Lens for richer narrative.";
    world.appendChild(time);
    world.appendChild(region);
    world.appendChild(weather);
    world.appendChild(llmPill);

    // Lean-mode badge slot — populated asynchronously by mountLeanModeBadge().
    // Renders empty when lean mode is off (the badge component returns null).
    const leanSlot = document.createElement("span");
    leanSlot.className = "lean-badge-slot";
    this.leanBadgeSlot = leanSlot;
    world.appendChild(leanSlot);

    const actions = document.createElement("div");
    actions.className = "header-actions";
    actions.setAttribute("aria-label", "Save and navigation");

    // Each header button now pairs its diegetic name with a small
    // literal hint below it so new players don't have to hover to
    // learn what "Bind" / "Recall" / "Withdraw" mean. aria-label
    // carries the literal meaning for screen readers.
    const headerBtn = (diegetic: string, literal: string, ariaLabel: string, onClick: () => void): HTMLButtonElement => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "header-action";
      btn.setAttribute("aria-label", ariaLabel);
      const big = document.createElement("span");
      big.className = "header-action-diegetic";
      big.textContent = diegetic;
      const small = document.createElement("span");
      small.className = "header-action-literal";
      small.textContent = literal;
      small.setAttribute("aria-hidden", "true");
      btn.appendChild(big);
      btn.appendChild(small);
      btn.addEventListener("click", onClick);
      return btn;
    };

    const saveBtn = headerBtn("Bind", "save", "Save the current run", () => this.props.onSave());
    const loadBtn = headerBtn("Recall", "load", "Load the last save", () => this.props.onLoad());
    const newBtn = headerBtn("Withdraw", "title", "Return to the title", () => this.props.onNewGame());

    const settingsBtn = document.createElement("button");
    settingsBtn.type = "button";
    settingsBtn.className = "header-action header-action-icon";
    settingsBtn.setAttribute("aria-label", "Open settings \u2014 The Lens");
    settingsBtn.textContent = "\u2699";
    settingsBtn.title = "The Lens";
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

  private buildCharacterSheet(game: GameState): HTMLElement {
    return createCharacterSheet({
      player: game.player,
      activeTab: this.sheetActiveTab,
      onTabChange: (tab) => {
        this.sheetActiveTab = tab;
      },
    });
  }

  private renderWorldTickerBar(): HTMLElement {
    const mount = document.createElement("div");
    mount.className = "world-ticker-mount";
    mount.appendChild(this.buildWorldTicker());
    this.worldTickerMount = mount;
    return mount;
  }

  private buildWorldTicker(): HTMLElement {
    const reducedMotion = this.props.state.settings?.reducedMotion === true;
    return createWorldTicker({
      items: this.worldTickerQueue.visible(),
      reducedMotion,
      onItemSurfaced: (id) => this.worldTickerQueue.markDisplayed(id),
    });
  }

  private refreshWorldTicker(): void {
    if (!this.worldTickerMount) return;
    this.worldTickerMount.innerHTML = "";
    this.worldTickerMount.appendChild(this.buildWorldTicker());
  }

  /**
   * The lean-mode badge is async (it queries the throttle middleware for
   * the current fallback state). We append it to the world-strip when it
   * resolves; if lean mode is off, nothing renders.
   */
  private mountLeanModeBadge(): void {
    if (!this.leanBadgeSlot) return;
    const slot = this.leanBadgeSlot;
    void createLeanModeBadge().then((badge) => {
      // The slot may have been torn down while we were awaiting; bail if so.
      if (badge && slot.isConnected) slot.appendChild(badge);
    });
  }

  private refreshNoticeBanner(game: GameState): void {
    if (!this.noticeBannerSlot) return;
    const slice = deriveNoticeBannerSlice(game);
    this.noticeBannerSlot.innerHTML = "";
    if (!slice) return;
    const banner = createNoticeBanner({
      rung: slice.rung,
      notice: slice.notice,
      authority: slice.authority,
      factions: slice.factions,
      onInspect: () => this.props.onTabChange("factions"),
      onReturn: () => {
        // No engine-side scene-route hook yet; dismiss is visual-only.
        if (this.noticeBannerSlot) this.noticeBannerSlot.innerHTML = "";
      },
      onApotheosisAccept: () => {
        void this.props.onCommand("apotheosis accept");
      },
      onApotheosisRefuse: () => {
        void this.props.onCommand("apotheosis refuse");
      },
    });
    this.noticeBannerSlot.appendChild(banner);
  }

  private renderSpecimenJar(game: GameState): HTMLElement {
    const wrap = document.createElement("section");
    wrap.className = "panel specimen-jar-panel";
    wrap.setAttribute("aria-label", "Specimen jar — character portrait");
    const reducedMotion = this.props.state.settings?.reducedMotion === true;
    const jar = createSpecimenJar(playerToSpecimenJarState(game.player), {
      animate: !reducedMotion,
    });
    this.specimenJarHost = jar;
    wrap.appendChild(jar);
    return wrap;
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
      case "sheet": {
        const el = this.buildCharacterSheet(game);
        el.id = "panel-sheet";
        el.classList.add("mobile-panel", "panel");
        return el;
      }
      case "trove": {
        const el = createInventoryPanel({ player: game.player });
        el.id = "panel-trove";
        el.classList.add("mobile-panel", "panel");
        return el;
      }
      case "anvil": {
        const el = createAnvilPanel({
          player: game.player,
          recipes: this.recipes,
          onForge: this.handleForge,
        });
        el.id = "panel-anvil";
        el.classList.add("mobile-panel", "panel");
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
        const pill = this.element.querySelector<HTMLElement>(".llm-status-pill");
        if (pill) {
          const llmOn = newProps.state.settings?.llmEnabled === true;
          pill.dataset.state = llmOn ? "on" : "off";
          pill.textContent = llmOn ? "Living world: on" : "Living world: off";
          pill.title = llmOn
            ? "Living World is active — NPCs, factions, and the GM narrator respond dynamically."
            : "Living World is off — enable in The Lens for richer narrative.";
        }
        updateVignette(game.world.danger);

        if (this.specimenJarHost) {
          const reducedMotion = newProps.state.settings?.reducedMotion === true;
          recomposeSpecimenJar(this.specimenJarHost, playerToSpecimenJarState(game.player), {
            animate: !reducedMotion,
          });
        }

        // World Ticker — sweep expired and re-render on every game-state
        // tick so new items surface and stale ones drop. visible() also
        // excludes items already markDisplayed'd on prior renders.
        this.worldTickerQueue.sweepExpired();
        this.refreshWorldTicker();

        // Notice Banner — appears the moment a rung-condition is appended
        // to the player and disappears when the condition is removed by
        // canon-event-absolution.
        this.refreshNoticeBanner(game);

        for (const panel of this.panelInstances) {
          if ("update" in panel) {
            (panel as unknown as { update(props: Record<string, unknown>): void }).update({ game });
          }
        }

        this.refreshFunctionalPanel("panel-sheet", () =>
          this.buildCharacterSheet(game),
        );
        this.refreshFunctionalPanel("panel-trove", () =>
          createInventoryPanel({ player: game.player }),
        );
        this.refreshFunctionalPanel("panel-anvil", () =>
          createAnvilPanel({
            player: game.player,
            recipes: this.recipes,
            onForge: this.handleForge,
          }),
        );
      }

      if (oldState.activeTab !== newProps.state.activeTab) {
        this.tabNav?.update({ active: newProps.state.activeTab });
        this.syncMobilePanels(newProps.state.activeTab);
      }
    }
  }

  private refreshFunctionalPanel(panelId: string, build: () => HTMLElement): void {
    if (!this.element) return;
    const current = this.element.querySelector(`#${panelId}`);
    if (!current) return;
    const next = build();
    next.id = panelId;
    next.classList.add("mobile-panel", "panel");
    if (current.classList.contains("active-panel")) next.classList.add("active-panel");
    current.replaceWith(next);
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
    this.specimenJarHost = null;
    this.worldTickerMount = null;
    this.leanBadgeSlot = null;
    this.noticeBannerSlot = null;
    this.element = null;
  }
}
