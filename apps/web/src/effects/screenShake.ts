/**
 * ============================================================================
 * SCREEN SHAKE — The First Perception
 * ============================================================================
 * Canvas/DOM-based screen shake for combat and consequence feedback.
 * Respects reduced-motion preferences.
 * ============================================================================
 */

export class ScreenShake {
  private intensity = 0;
  private decay = 0.9;
  private active = false;
  private animationId: number | null = null;
  private target: HTMLElement | null = null;

  attach(target: HTMLElement): void {
    this.target = target;
  }

  trigger(intensity: number, durationMs: number): void {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (document.documentElement.dataset.reducedMotion) return;

    this.intensity = intensity;
    this.active = true;

    if (!this.animationId) {
      this.animationId = requestAnimationFrame(() => this.tick());
    }

    setTimeout(() => {
      this.active = false;
    }, durationMs);
  }

  private tick(): void {
    if (!this.target) {
      this.animationId = null;
      return;
    }

    if (this.active && this.intensity > 0.5) {
      const offsetX = (Math.random() - 0.5) * this.intensity;
      const offsetY = (Math.random() - 0.5) * this.intensity;
      this.target.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
      this.intensity *= this.decay;
      this.animationId = requestAnimationFrame(() => this.tick());
    } else {
      this.target.style.transform = "";
      this.intensity = 0;
      this.animationId = null;
    }
  }

  detach(): void {
    this.active = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this.target) {
      this.target.style.transform = "";
    }
    this.target = null;
  }
}
