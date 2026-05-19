/**
 * Screen transition helper.
 */
export function screenTransition(
  outgoing: HTMLElement,
  incoming: HTMLElement,
  onComplete: () => void,
): void {
  outgoing.style.opacity = "0";
  outgoing.style.transition = "opacity 0.3s ease";
  setTimeout(() => {
    onComplete();
  }, 300);
}
