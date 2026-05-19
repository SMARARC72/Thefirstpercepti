import type { OutputSchema, SafetyCheck } from "./types.js";

export class ResponseParser {
  /**
   * Parse raw LLM text through a schema validator.
   * Returns parsed data or throws with validation details.
   */
  static parse<T>(raw: string, schema: OutputSchema<T>): T {
    try {
      return schema.parse(raw);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      throw new ParseError(`Schema validation failed: ${message}\nRaw: ${raw.slice(0, 500)}`);
    }
  }

  /**
   * Try to extract JSON from an LLM response that may have markdown or extra text.
   */
  static extractJSON(raw: string): unknown {
    // Try direct parse first
    try {
      return JSON.parse(raw);
    } catch {
      // ignore
    }

    // Look for JSON code block
    const codeBlockMatch = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch {
        // ignore
      }
    }

    // Look for first { ... } or [ ... ] block
    const objectMatch = raw.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        // ignore
      }
    }

    const arrayMatch = raw.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try {
        return JSON.parse(arrayMatch[0]);
      } catch {
        // ignore
      }
    }

    throw new ParseError(`Could not extract JSON from response:\n${raw.slice(0, 500)}`);
  }

  /**
   * Validate that the response contains expected keywords or structure.
   */
  static validateContains(raw: string, required: string[]): SafetyCheck {
    const missing = required.filter((r) => !raw.toLowerCase().includes(r.toLowerCase()));
    if (missing.length > 0) {
      return {
        passed: false,
        reason: `Missing required fields: ${missing.join(", ")}`,
        severity: "medium",
      };
    }
    return { passed: true };
  }

  /**
   * Check narrative consistency: does the response contradict known facts?
   * This is a lightweight check; deep consistency requires domain knowledge.
   */
  static checkConsistency(raw: string, knownFacts: string[]): SafetyCheck {
    const contradictions: string[] = [];
    for (const fact of knownFacts) {
      // Very naive: if the fact is negated nearby
      const negators = ["not", "never", "no longer", "did not", "was not", "isn't", "wasn't"];
      const pattern = new RegExp(
        `(${negators.join("|")})\\s+.{0,30}${fact.slice(0, 20)}`,
        "i"
      );
      if (pattern.test(raw)) {
        contradictions.push(`Possible contradiction with: "${fact}"`);
      }
    }

    if (contradictions.length > 0) {
      return {
        passed: false,
        reason: contradictions.join("; "),
        severity: "low",
      };
    }
    return { passed: true };
  }
}

export class ParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ParseError";
  }
}
