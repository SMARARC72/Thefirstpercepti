import type { AppState } from "../game";
import { SaveSlotCard } from "../components/SaveSlotCard";
import { trapFocus } from "../effects/focusTrap";

interface SettingsModalProps {
  state: AppState;
  onClose: () => void;
  onSaveState: (slotId: string) => void;
  onLoadState: (slotId: string) => void;
  onDeleteSlot: (slotId: string) => void;
  onSettingsChange: (settings: Partial<AppState["settings"]>) => void;
}

export class SettingsModal {
  private props: SettingsModalProps;
  private element: HTMLElement | null = null;
  // Escape-to-close + keep the listener scoped to this instance so the
  // drawer doesn't leak handlers after destroy.
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;
  // Per-input "Saved" pill timers, keyed by the input element. A new
  // change before the prior pill expires cancels the prior timer so
  // the pill stays visible for the full 1.5s after each change.
  private savedPillTimers: Map<HTMLElement, number> = new Map();
  // Focus-trap release function — set on render, called on destroy.
  // Keeps Tab / Shift-Tab cycling inside the drawer until it closes.
  private releaseFocusTrap: (() => void) | null = null;

  constructor(props: SettingsModalProps) {
    this.props = props;
  }

  /**
   * Flash a transient "Saved" pill next to an input that just changed.
   * The pill is created on first use and reused thereafter; visible
   * class drives the CSS fade.
   */
  private flashSaved(target: HTMLElement): void {
    const host = target.parentElement;
    if (!host) return;
    let pill = host.querySelector<HTMLElement>(".settings-saved-pill");
    if (!pill) {
      pill = document.createElement("span");
      pill.className = "settings-saved-pill";
      pill.setAttribute("aria-live", "polite");
      pill.textContent = "Saved";
      host.appendChild(pill);
    }
    pill.classList.add("visible");
    const prior = this.savedPillTimers.get(pill);
    if (prior !== undefined) window.clearTimeout(prior);
    const timer = window.setTimeout(() => {
      pill?.classList.remove("visible");
      this.savedPillTimers.delete(pill!);
    }, 1500);
    this.savedPillTimers.set(pill, timer);
  }

  render(): HTMLElement {
    const backdrop = document.createElement("div");
    // `modal-backdrop` keeps the dim layer + click-outside behaviour the
    // existing CSS already provides. The inner container morphs to a
    // right-anchored slide-in drawer via `.settings-drawer`.
    backdrop.className = "modal-backdrop settings-drawer-backdrop";
    backdrop.setAttribute("role", "dialog");
    backdrop.setAttribute("aria-modal", "true");
    backdrop.setAttribute("aria-label", "Settings \u2014 The Lens");

    const drawer = document.createElement("aside");
    drawer.className = "settings-drawer";
    drawer.setAttribute("role", "document");

    const header = document.createElement("div");
    header.className = "drawer-header";
    const title = document.createElement("h2");
    title.textContent = "The Lens";
    title.title = "Settings";
    const closeBtn = document.createElement("button");
    closeBtn.type = "button";
    closeBtn.setAttribute("aria-label", "Close settings");
    closeBtn.textContent = "\u00D7";
    closeBtn.addEventListener("click", () => this.props.onClose());
    header.appendChild(title);
    header.appendChild(closeBtn);
    drawer.appendChild(header);

    const body = document.createElement("div");
    body.className = "drawer-body";

    body.appendChild(this.buildSection("Accessibility", this.buildAccessibility()));
    body.appendChild(this.buildSection("Audio", this.buildAudio()));
    body.appendChild(this.buildSection("Gameplay", this.buildGameplay()));
    body.appendChild(this.buildSection("Living World", this.buildLLM()));
    body.appendChild(this.buildSection("Save Slots", this.buildSaveSlots()));
    body.appendChild(this.buildSection("Data", this.buildData()));

    drawer.appendChild(body);
    backdrop.appendChild(drawer);

    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) this.props.onClose();
    });

    // Escape closes the drawer \u2014 standard a11y for modal dialogs.
    this.keyHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") this.props.onClose();
    };
    document.addEventListener("keydown", this.keyHandler);

    queueMicrotask(() => {
      closeBtn.focus();
      // Install the focus trap after the initial focus lands so Tab
      // starts cycling from the close button forward.
      this.releaseFocusTrap = trapFocus(drawer);
    });

    this.element = backdrop;
    return backdrop;
  }

  private buildSection(title: string, content: HTMLElement): HTMLElement {
    const section = document.createElement("section");
    section.className = "settings-section";
    const h3 = document.createElement("h3");
    h3.textContent = title;
    section.appendChild(h3);
    section.appendChild(content);
    return section;
  }

  private buildAccessibility(): HTMLElement {
    const grid = document.createElement("div");
    grid.className = "settings-grid";

    const speedLabel = document.createElement("label");
    speedLabel.textContent = "Text speed";
    const speedInput = document.createElement("input");
    speedInput.type = "range";
    speedInput.min = "0";
    speedInput.max = "80";
    speedInput.value = String(this.props.state.settings?.textSpeed ?? 16);
    speedInput.addEventListener("input", () => {
      const value = Number(speedInput.value);
      document.documentElement.dataset.textSpeed = speedInput.value;
      this.props.onSettingsChange({ textSpeed: value });
      this.flashSaved(speedInput);
    });
    grid.appendChild(speedLabel);
    grid.appendChild(speedInput);

    const sizeLabel = document.createElement("label");
    sizeLabel.textContent = "Font size";
    const sizeSelect = document.createElement("select");
    for (const size of ["small", "medium", "large"]) {
      const opt = document.createElement("option");
      opt.value = size;
      opt.textContent = size.charAt(0).toUpperCase() + size.slice(1);
      if (size === (this.props.state.settings?.fontSize ?? "medium")) opt.selected = true;
      sizeSelect.appendChild(opt);
    }
    sizeSelect.addEventListener("change", () => {
      document.documentElement.dataset.fontSize = sizeSelect.value;
      this.props.onSettingsChange({ fontSize: sizeSelect.value as "small" | "medium" | "large" });
      this.flashSaved(sizeSelect);
    });
    grid.appendChild(sizeLabel);
    grid.appendChild(sizeSelect);

    const motionWrap = document.createElement("label");
    motionWrap.className = "toggle-label";
    const motionCheck = document.createElement("input");
    motionCheck.type = "checkbox";
    motionCheck.checked = this.props.state.settings?.reducedMotion ?? false;
    motionCheck.addEventListener("change", () => {
      document.documentElement.dataset.reducedMotion = String(motionCheck.checked);
      this.props.onSettingsChange({ reducedMotion: motionCheck.checked });
      this.flashSaved(motionCheck);
    });
    motionWrap.appendChild(motionCheck);
    motionWrap.appendChild(document.createTextNode("Reduced motion"));
    grid.appendChild(motionWrap);

    const contrastWrap = document.createElement("label");
    contrastWrap.className = "toggle-label";
    const contrastCheck = document.createElement("input");
    contrastCheck.type = "checkbox";
    contrastCheck.checked = this.props.state.settings?.highContrast ?? false;
    contrastCheck.addEventListener("change", () => {
      document.documentElement.dataset.highContrast = String(contrastCheck.checked);
      this.props.onSettingsChange({ highContrast: contrastCheck.checked });
      this.flashSaved(contrastCheck);
    });
    contrastWrap.appendChild(contrastCheck);
    contrastWrap.appendChild(document.createTextNode("High contrast"));
    grid.appendChild(contrastWrap);

    return grid;
  }

  private buildAudio(): HTMLElement {
    const grid = document.createElement("div");
    grid.className = "settings-grid";

    const soundWrap = document.createElement("label");
    soundWrap.className = "toggle-label";
    const soundCheck = document.createElement("input");
    soundCheck.type = "checkbox";
    soundCheck.checked = this.props.state.settings?.soundEnabled ?? true;
    soundCheck.addEventListener("change", () => {
      this.props.onSettingsChange({ soundEnabled: soundCheck.checked });
      this.flashSaved(soundCheck);
    });
    soundWrap.appendChild(soundCheck);
    soundWrap.appendChild(document.createTextNode("Sound effects"));
    grid.appendChild(soundWrap);

    const musicWrap = document.createElement("label");
    musicWrap.className = "toggle-label";
    const musicCheck = document.createElement("input");
    musicCheck.type = "checkbox";
    musicCheck.checked = this.props.state.settings?.musicEnabled ?? true;
    musicCheck.addEventListener("change", () => {
      this.props.onSettingsChange({ musicEnabled: musicCheck.checked });
      this.flashSaved(musicCheck);
    });
    musicWrap.appendChild(musicCheck);
    musicWrap.appendChild(document.createTextNode("Music"));
    grid.appendChild(musicWrap);

    return grid;
  }

  private buildGameplay(): HTMLElement {
    const grid = document.createElement("div");
    grid.className = "settings-grid";

    const rollsWrap = document.createElement("label");
    rollsWrap.className = "toggle-label";
    const rollsCheck = document.createElement("input");
    rollsCheck.type = "checkbox";
    rollsCheck.checked = this.props.state.settings?.showRolls ?? true;
    rollsCheck.addEventListener("change", () => {
      this.props.onSettingsChange({ showRolls: rollsCheck.checked });
      this.flashSaved(rollsCheck);
    });
    rollsWrap.appendChild(rollsCheck);
    rollsWrap.appendChild(document.createTextNode("Show rolls"));
    grid.appendChild(rollsWrap);

    const autoWrap = document.createElement("label");
    autoWrap.className = "toggle-label";
    const autoCheck = document.createElement("input");
    autoCheck.type = "checkbox";
    autoCheck.checked = this.props.state.settings?.autoSave ?? true;
    autoCheck.addEventListener("change", () => {
      this.props.onSettingsChange({ autoSave: autoCheck.checked });
      this.flashSaved(autoCheck);
    });
    autoWrap.appendChild(autoCheck);
    autoWrap.appendChild(document.createTextNode("Auto-save"));
    grid.appendChild(autoWrap);

    const animWrap = document.createElement("label");
    animWrap.className = "toggle-label";
    const animCheck = document.createElement("input");
    animCheck.type = "checkbox";
    animCheck.checked = this.props.state.settings?.animationEnabled ?? true;
    animCheck.addEventListener("change", () => {
      this.props.onSettingsChange({ animationEnabled: animCheck.checked });
      this.flashSaved(animCheck);
    });
    animWrap.appendChild(animCheck);
    animWrap.appendChild(document.createTextNode("Animations"));
    grid.appendChild(animWrap);

    return grid;
  }

  private buildLLM(): HTMLElement {
    const grid = document.createElement("div");
    grid.className = "settings-grid";

    const enabledWrap = document.createElement("label");
    enabledWrap.className = "toggle-label";
    const enabledCheck = document.createElement("input");
    enabledCheck.type = "checkbox";
    enabledCheck.checked = this.props.state.settings?.llmEnabled ?? false;
    enabledCheck.addEventListener("change", () => {
      this.props.onSettingsChange({ llmEnabled: enabledCheck.checked });
      this.flashSaved(enabledCheck);
    });
    enabledWrap.appendChild(enabledCheck);
    enabledWrap.appendChild(document.createTextNode("Enable Living World (LLM)"));
    grid.appendChild(enabledWrap);

    const note = document.createElement("p");
    note.className = "settings-note";
    note.textContent =
      "The Living World layer streams generative narrative from Claude (primary) or Kimi (fallback) via the /api/llm proxy. Provider keys live in the server environment. Falls back to static narrative when disabled or the proxy is unreachable.";
    grid.appendChild(note);

    return grid;
  }

  private buildSaveSlots(): HTMLElement {
    const container = document.createElement("div");
    container.className = "save-slots";

    if (this.props.state.saveSlots.length === 0) {
      const empty = document.createElement("p");
      empty.className = "empty-note";
      empty.textContent = "No save slots yet.";
      container.appendChild(empty);
      return container;
    }

    for (const slot of this.props.state.saveSlots) {
      const card = new SaveSlotCard({
        slot,
        onLoad: (id) => this.props.onLoadState(id),
        onDelete: (id) => this.props.onDeleteSlot(id),
      });
      container.appendChild(card.render());
    }

    return container;
  }

  private buildData(): HTMLElement {
    const grid = document.createElement("div");
    grid.className = "settings-grid";

    const exportBtn = document.createElement("button");
    exportBtn.type = "button";
    exportBtn.textContent = "Export save data";
    exportBtn.addEventListener("click", () => {
      const data = JSON.stringify(this.props.state, null, 2);
      const blob = new Blob([data], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "the-first-perception-save.json";
      a.click();
      URL.revokeObjectURL(url);
    });

    const importBtn = document.createElement("button");
    importBtn.type = "button";
    importBtn.textContent = "Import save data";
    importBtn.addEventListener("click", () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".json";
      input.addEventListener("change", () => {
        const file = input.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          try {
            JSON.parse(String(reader.result));
            // TODO(phase-3b): wire imported payload into AppState restoration.
          } catch {
            alert("Invalid save file.");
          }
        };
        reader.readAsText(file);
      });
      input.click();
    });

    grid.appendChild(exportBtn);
    grid.appendChild(importBtn);
    return grid;
  }

  destroy(): void {
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    for (const t of this.savedPillTimers.values()) window.clearTimeout(t);
    this.savedPillTimers.clear();
    if (this.releaseFocusTrap) {
      this.releaseFocusTrap();
      this.releaseFocusTrap = null;
    }
    this.element = null;
  }
}
