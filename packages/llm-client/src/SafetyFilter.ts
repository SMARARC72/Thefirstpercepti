import type { SafetyCheck, LLMRequest } from "./types.js";

/**
 * Pre-filter patterns that may indicate prompt injection attempts.
 */
const INJECTION_PATTERNS = [
  /ignore\s+(?:all\s+)?(?:previous|prior|above)\s+(?:instructions|prompts|commands)/i,
  /(?:system|developer|assistant)\s*(?:prompt|instruction|role)/i,
  /you\s+(?:are|should)\s+now\s+(?:a|an)\s+/i,
  /forget\s+(?:everything|all|your)/i,
  /disregard\s+(?:all\s+)?(?:previous|prior)/i,
  /new\s+(?:instruction|command|role)\s*:/i,
  /DAN\s+(?:mode|prompt)/i,
  /jailbreak/i,
];

/**
 * PII patterns to strip.
 */
const PII_PATTERNS = [
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // email
  /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, // phone
  /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g, // credit card
];

/**
 * Content policy patterns for post-filter.
 */
const CONTENT_POLICY_PATTERNS = [
  /\b(hate\s+speech|racial\s+slur|ethnic\s+cleansing)\b/i,
  /\b(child\s+abuse|csam|child\s+porn)\b/i,
  /\b(terrorist|bomb\s+making|how\s+to\s+kill)\b/i,
];

export class SafetyFilter {
  private maxCallsPerTurn: number;
  private maxCallsPerMinute: number;
  private maxTokensPerTurn: number;
  private turnCallCount: number = 0;
  private minuteCallCount: number = 0;
  private minuteWindowStart: number = Date.now();

  constructor(options: {
    maxCallsPerTurn?: number;
    maxCallsPerMinute?: number;
    maxTokensPerTurn?: number;
  } = {}) {
    this.maxCallsPerTurn = options.maxCallsPerTurn ?? 10;
    this.maxCallsPerMinute = options.maxCallsPerMinute ?? 60;
    this.maxTokensPerTurn = options.maxTokensPerTurn ?? 4096;
  }

  /**
   * Pre-filter: run BEFORE sending to LLM.
   * Checks prompt injection, PII, rate limits.
   */
  preFilter(request: LLMRequest): SafetyCheck {
    const userContent = request.messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");

    // 1. Prompt injection check
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(userContent)) {
        return {
          passed: false,
          reason: "Potential prompt injection detected.",
          severity: "high",
        };
      }
    }

    // 2. Rate limit check
    const now = Date.now();
    if (now - this.minuteWindowStart > 60000) {
      this.minuteWindowStart = now;
      this.minuteCallCount = 0;
    }
    if (this.turnCallCount >= this.maxCallsPerTurn) {
      return {
        passed: false,
        reason: `Turn call limit exceeded (${this.maxCallsPerTurn}).`,
        severity: "medium",
      };
    }
    if (this.minuteCallCount >= this.maxCallsPerMinute) {
      return {
        passed: false,
        reason: `Per-minute call limit exceeded (${this.maxCallsPerMinute}).`,
        severity: "medium",
      };
    }

    // 3. Token budget check
    const estimatedTokens = Math.ceil(userContent.length / 4);
    if (estimatedTokens > this.maxTokensPerTurn) {
      return {
        passed: false,
        reason: `Token budget exceeded: ${estimatedTokens} > ${this.maxTokensPerTurn}.`,
        severity: "medium",
      };
    }

    return { passed: true };
  }

  /**
   * Post-filter: run AFTER receiving LLM response.
   * Checks content policy, output structure.
   */
  postFilter(rawOutput: string): SafetyCheck {
    // 1. Content policy
    for (const pattern of CONTENT_POLICY_PATTERNS) {
      if (pattern.test(rawOutput)) {
        return {
          passed: false,
          reason: "Content policy violation detected.",
          severity: "high",
        };
      }
    }

    // 2. Output sanity: not empty, not just whitespace
    if (!rawOutput || rawOutput.trim().length < 10) {
      return {
        passed: false,
        reason: "Output too short or empty.",
        severity: "low",
      };
    }

    return { passed: true };
  }

  /**
   * Strip PII from text before sending to LLM.
   */
  static sanitize(text: string): string {
    let sanitized = text;
    for (const pattern of PII_PATTERNS) {
      sanitized = sanitized.replace(pattern, "[REDACTED]");
    }
    return sanitized;
  }

  /**
   * Record that a call was made (for rate limiting).
   */
  recordCall(): void {
    this.turnCallCount += 1;
    this.minuteCallCount += 1;
  }

  /**
   * Reset turn call counter (call at start of new player turn).
   */
  resetTurn(): void {
    this.turnCallCount = 0;
  }
}
