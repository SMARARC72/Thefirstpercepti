/**
 * Phase 22 / A11Y-601 — gsap motion respect for prefers-reduced-motion.
 *
 * The CSS reduced-motion module disables CSS transitions. But gsap animates
 * via JS and bypasses CSS, so we need a parallel guard.
 *
 * Usage in apps/web (wherever gsap.to/from/timeline is called):
 *
 *   import { motion } from "@first-perception/ui-system/a11y/gsap-motion";
 *
 *   motion.matchMedia().add("(prefers-reduced-motion: reduce)", () => {
 *     // Reduced-motion users: skip animation, snap to end state.
 *     gsap.set(target, { opacity: 1, x: 0 });
 *     return () => { /* cleanup * / };
 *   });
 *
 *   motion.matchMedia().add("(prefers-reduced-motion: no-preference)", () => {
 *     // Standard motion. Max 300ms, ease-in-out only (Phase 14 discipline).
 *     gsap.to(target, { opacity: 1, x: 0, duration: 0.2, ease: "power1.inOut" });
 *   });
 *
 * Discipline:
 * - No bounce / spring / elastic / back easings. Period.
 * - Max duration 300ms unless explicitly justified.
 * - Reduced-motion path must snap to end state (don't just skip).
 */

// Light wrapper around gsap so apps/web can import motion from a single place.
// Actual gsap import happens at the use site; this module is dependency-free.

export interface GsapMatchMediaApi {
  add(query: string, fn: () => void | (() => void)): void;
  revert(): void;
}

export interface GsapLite {
  matchMedia(): GsapMatchMediaApi;
}

let _gsap: GsapLite | null = null;

/**
 * Register the gsap instance once at app startup.
 *   import gsap from "gsap";
 *   import { registerGsap } from "@first-perception/ui-system/a11y/gsap-motion";
 *   registerGsap(gsap);
 */
export function registerGsap(gsapInstance: GsapLite): void {
  _gsap = gsapInstance;
}

export const motion = {
  matchMedia(): GsapMatchMediaApi {
    if (!_gsap) {
      throw new Error(
        "gsap not registered. Call registerGsap(gsap) at app startup before using motion.matchMedia()."
      );
    }
    return _gsap.matchMedia();
  },

  /** Detect reduced-motion preference at the moment of call (sync). */
  prefersReducedMotion(): boolean {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  },

  /**
   * Convenience: run one of two functions based on motion preference.
   * Reduced-motion path SHOULD snap to end state; do not skip animation entirely.
   */
  respect<T>(opts: {
    reduced: () => T;
    motion: () => T;
  }): T {
    return this.prefersReducedMotion() ? opts.reduced() : opts.motion();
  },
};

/** Allowed gsap easings (Phase 14 discipline + a11y). */
export const ALLOWED_EASINGS = [
  "none",
  "linear",
  "power1.in",
  "power1.out",
  "power1.inOut",
  "power2.in",
  "power2.out",
  "power2.inOut",
  "steps(2)",
  "steps(4)",
] as const;

/** Easings forbidden by design discipline. Linter helper. */
export const FORBIDDEN_EASINGS = [
  "bounce",
  "elastic",
  "back",
  "circ", // visually arc-y; not on-tone
] as const;

export function isAllowedEasing(easing: string): boolean {
  const base = easing.split(".")[0].split("(")[0];
  return !FORBIDDEN_EASINGS.some(f => base.includes(f));
}
