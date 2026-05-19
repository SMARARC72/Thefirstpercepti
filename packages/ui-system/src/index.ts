/**
 * ============================================================================
 * UI SYSTEM — The First Perception
 * ============================================================================
 * Design tokens, Web Components, animation utilities, accessibility helpers.
 * ============================================================================
 */

// Re-export design tokens are CSS-only; import the stylesheet separately:
// import "@first-perception/ui-system/styles.css";

export interface AnimationController {
  play(name: string, element: HTMLElement, options?: KeyframeAnimationOptions): Promise<void>;
  stop(element: HTMLElement): void;
  setReducedMotion(enabled: boolean): void;
}

export interface TypewriterOptions {
  speed: number; // ms per character, 0 = instant
  scramble?: boolean;
  scrambleChars?: string;
  onComplete?: () => void;
}

export interface ComponentBase {
  render(): string;
  bind(root: HTMLElement): void;
  destroy(): void;
}

// Utility exports
export function prefersReducedMotion(): boolean {
  return (
    window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
    document.documentElement.dataset.reducedMotion === "true"
  );
}

export function setReducedMotion(enabled: boolean): void {
  document.documentElement.dataset.reducedMotion = String(enabled);
}

export function setHighContrast(enabled: boolean): void {
  document.documentElement.dataset.highContrast = String(enabled);
}

export function setFontSize(size: "small" | "medium" | "large"): void {
  document.documentElement.dataset.fontSize = size;
}
