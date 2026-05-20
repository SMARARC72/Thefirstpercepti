/**
 * Focus trap — keeps Tab / Shift-Tab cycling inside a modal container
 * so keyboard users can't accidentally focus background tab buttons,
 * input fields, or other interactive elements while a dialog is open.
 *
 * Matches the standard a11y pattern: aria-modal="true" on the
 * container, JS-enforced focus cycling, restoration of the previous
 * focus on release.
 *
 * Usage:
 *   const release = trapFocus(modalEl);
 *   // ...later, when the modal closes...
 *   release();
 *
 * Returns a release function that removes the keydown listener and
 * restores focus to whatever was focused before the trap was installed.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  'iframe',
  'object',
  'embed',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]',
].join(',');

function focusableElements(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => !el.hasAttribute('inert') && el.offsetParent !== null,
  );
}

export function trapFocus(container: HTMLElement): () => void {
  const previousActive = document.activeElement as HTMLElement | null;

  const handleKey = (e: KeyboardEvent): void => {
    if (e.key !== 'Tab') return;
    const focusables = focusableElements(container);
    if (focusables.length === 0) {
      e.preventDefault();
      return;
    }
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey) {
      if (active === first || !container.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }
  };

  document.addEventListener('keydown', handleKey);

  return function release(): void {
    document.removeEventListener('keydown', handleKey);
    if (previousActive && typeof previousActive.focus === 'function') {
      previousActive.focus();
    }
  };
}
