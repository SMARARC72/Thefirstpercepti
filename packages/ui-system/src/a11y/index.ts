/**
 * Phase 22 a11y exports.
 */
export {
  installSkipLink,
  applyRovingTabindex,
  trapFocus,
  onEscape,
} from "./keyboard.js";

export {
  motion,
  registerGsap,
  ALLOWED_EASINGS,
  FORBIDDEN_EASINGS,
  isAllowedEasing,
} from "./gsap-motion.js";

export type { GsapLite, GsapMatchMediaApi } from "./gsap-motion.js";
