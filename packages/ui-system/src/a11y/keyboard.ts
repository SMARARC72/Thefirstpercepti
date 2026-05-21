/**
 * Phase 22 / A11Y-603 — Keyboard navigation helpers.
 *
 * Drop-in utilities for the Phase 20 surfaces:
 *  - Skip-link  → jumps to main content from any keyboard-focusable element
 *  - Roving tabindex → for Character Sheet tab strip (5 tabs, one tabbable at a time)
 *  - Focus trap → for modal-like surfaces (Form-of-Ending postcard, Notice convergence)
 *  - Focus-visible polyfill (CSS-only; see focus-visible.css)
 *
 * Each helper is dependency-free TypeScript. No frameworks; works with vanilla
 * DOM the same way the rest of apps/web does.
 */

/* ============================================================
   SKIP LINK
   ============================================================ */

/**
 * Create a skip-link that becomes visible when focused (Tab from address bar).
 * Pattern: <a href="#main" class="skip-link">Skip to main</a>
 *
 * Call once at app startup. Inserts into document.body as the first child.
 *
 * The corresponding CSS (in focus-visible.css):
 *   .skip-link { position: absolute; left: -9999px; }
 *   .skip-link:focus-visible {
 *     position: fixed; top: 8px; left: 8px; z-index: 99999;
 *     background: var(--bg-card); color: var(--fg-1);
 *     padding: var(--space-2) var(--space-3);
 *     border: 1px solid var(--border);
 *   }
 */
export function installSkipLink(opts?: { targetId?: string; label?: string }): HTMLAnchorElement {
  const targetId = opts?.targetId ?? "main";
  const label = opts?.label ?? "Skip to main content";

  const link = document.createElement("a");
  link.href = `#${targetId}`;
  link.className = "skip-link";
  link.textContent = label;
  // Ensure the target receives focus after click (some browsers don't auto-focus anchors).
  link.addEventListener("click", (e) => {
    const target = document.getElementById(targetId);
    if (target) {
      // Make focusable if it isn't.
      if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
      target.focus();
    }
  });

  document.body.insertBefore(link, document.body.firstChild);
  return link;
}

/* ============================================================
   ROVING TABINDEX
   ============================================================ */

/**
 * Apply roving tabindex to a horizontal tab strip (Character Sheet v3, etc.).
 * Only the active tab is tabbable; arrow keys move focus + activate.
 *
 * Required DOM:
 *   <div role="tablist" data-roving-tabindex>
 *     <button role="tab" aria-selected="true">Stats</button>
 *     <button role="tab" aria-selected="false">Inventory</button>
 *     ...
 *   </div>
 *
 * Each tab MUST have role="tab" and aria-selected; the helper manages tabindex.
 *
 * Returns a cleanup function to remove listeners.
 */
export function applyRovingTabindex(tabStrip: HTMLElement): () => void {
  const tabs = Array.from(tabStrip.querySelectorAll<HTMLElement>("[role='tab']"));
  if (tabs.length === 0) return () => {};

  function setActive(index: number) {
    tabs.forEach((tab, i) => {
      const isActive = i === index;
      tab.setAttribute("tabindex", isActive ? "0" : "-1");
      tab.setAttribute("aria-selected", isActive ? "true" : "false");
    });
    tabs[index].focus();
  }

  // Initialize: first aria-selected tab is active, else first tab.
  const initialActive = Math.max(0, tabs.findIndex(t => t.getAttribute("aria-selected") === "true"));
  setActive(initialActive);

  function onKey(e: KeyboardEvent) {
    const currentIndex = tabs.indexOf(document.activeElement as HTMLElement);
    if (currentIndex === -1) return;

    let nextIndex = currentIndex;
    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % tabs.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = tabs.length - 1;
        break;
      default:
        return;
    }
    e.preventDefault();
    setActive(nextIndex);
    // Fire a custom event so apps/web can react (load tab content, etc.).
    tabs[nextIndex].dispatchEvent(new CustomEvent("tab-activated", { bubbles: true, detail: { index: nextIndex } }));
  }

  tabStrip.addEventListener("keydown", onKey);
  return () => tabStrip.removeEventListener("keydown", onKey);
}

/* ============================================================
   FOCUS TRAP
   ============================================================ */

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

/**
 * Trap Tab/Shift-Tab focus within a container. Use for Form-of-Ending postcard,
 * Notice convergence modal, and any other modal-like surface.
 *
 * Returns a cleanup function.
 *
 * Usage:
 *   const release = trapFocus(modalElement);
 *   // ... when modal closes:
 *   release();
 *   previouslyFocusedElement.focus();   // caller restores focus
 */
export function trapFocus(container: HTMLElement): () => void {
  const focusables = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  if (focusables.length === 0) return () => {};

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  function onKey(e: KeyboardEvent) {
    if (e.key !== "Tab") return;
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }

  container.addEventListener("keydown", onKey);
  // Initial focus to first focusable element in the container.
  first.focus();
  return () => container.removeEventListener("keydown", onKey);
}

/* ============================================================
   ESCAPE TO CLOSE
   ============================================================ */

/**
 * Register an Escape-to-close handler. Returns cleanup.
 * Use alongside trapFocus for modals.
 */
export function onEscape(handler: () => void): () => void {
  function onKey(e: KeyboardEvent) {
    if (e.key === "Escape") handler();
  }
  document.addEventListener("keydown", onKey);
  return () => document.removeEventListener("keydown", onKey);
}
