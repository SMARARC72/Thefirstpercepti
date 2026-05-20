import type { LLMClient } from "./LLMClient.js";
import { ResponseParser } from "./ResponseParser.js";

/**
 * Domains the engine understands. Must mirror @first-perception/types' Domain
 * union — duplicated here to avoid the llm-client package depending on engine.
 */
export type IntentDomain =
  | "physical"
  | "social"
  | "metaphysical"
  | "combat"
  | "craft"
  | "stealth"
  | "lore"
  | "wilderness"
  | "intrigue";

/**
 * Reducer namespaces the orchestrator dispatches to. The classifier's
 * job is to map free-text → one of these (or null = no mechanical
 * reducer, narrative-only).
 */
export type ReducerKind =
  | "move"
  | "combat"
  | "rest"
  | "item"
  | "dialogue"
  | "investigation"
  | "narrative_only";

export interface ClassifiedIntent {
  /** Canonical verb token (lowercase). */
  verb: string;
  /** Object/target the action is aimed at (may be empty). */
  target: string;
  /** Domain used for the d20 stat lookup. */
  domain: IntentDomain;
  /** Which reducer should handle this turn (if any). */
  reducer: ReducerKind;
  /** 0..1; below `acceptThreshold` the orchestrator falls back to regex. */
  confidence: number;
  /** Where this classification came from. */
  source: "llm" | "regex" | "cache";
}

export interface IntentClassifierOptions {
  /** Provide an LLMClient to get LLM-driven classifications. */
  client?: LLMClient;
  /** Max ms before falling back to regex. Default 800. */
  timeoutMs?: number;
  /** 0..1; LLM results below this drop to regex. Default 0.55. */
  acceptThreshold?: number;
  /** LRU cap. Default 200. */
  cacheSize?: number;
  /** Override the system prompt (mostly for tests). */
  systemPrompt?: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are an intent classifier for a cosmic-horror text RPG.
Given a player's free-text command, return JSON with these fields:
  verb: a single lowercase verb token
  target: the object/person/place the action is aimed at, lowercase, may be empty
  domain: one of physical, social, metaphysical, combat, craft, stealth, lore, wilderness, intrigue
  reducer: one of move, combat, rest, item, dialogue, investigation, narrative_only
  confidence: 0.0..1.0 — how sure you are
Return JSON only. No prose, no markdown.`;

const REDUCER_VERBS: Record<ReducerKind, string[]> = {
  move: ["go", "approach", "flee", "sneak", "travel", "walk", "run", "head"],
  combat: ["attack", "fight", "strike", "defend", "riposte", "kill", "shoot"],
  rest: ["rest", "sleep", "recover", "wait"],
  item: ["use", "equip", "consume", "inspect", "drop", "trade", "take", "grab"],
  dialogue: ["speak", "ask", "bargain", "threaten", "lie", "talk", "tell"],
  investigation: ["look", "examine", "read", "listen", "search", "study", "watch"],
  narrative_only: [],
};

const DOMAIN_HINTS: Array<{ keywords: string[]; domain: IntentDomain }> = [
  { keywords: ["attack", "fight", "strike", "kill", "blade"], domain: "combat" },
  { keywords: ["speak", "ask", "bargain", "tell", "talk"], domain: "social" },
  { keywords: ["sneak", "hide", "flee", "creep"], domain: "stealth" },
  { keywords: ["make", "repair", "build", "fix"], domain: "craft" },
  { keywords: ["read", "study", "remember", "lore", "name"], domain: "lore" },
  { keywords: ["look", "examine", "listen", "watch"], domain: "wilderness" },
  { keywords: ["ritual", "spirit", "veil", "summon"], domain: "metaphysical" },
  { keywords: ["order", "threaten", "command", "lead"], domain: "intrigue" },
];

/**
 * Classifies free-text commands into structured intents. Tries the LLM
 * (if a client is provided), falls back to regex on cache miss within
 * budget. Caches successful classifications by lowercased command text
 * so repeats are instant.
 *
 * Single global default acceptThreshold = 0.55. Below that the regex
 * fallback always wins, so a confused LLM can't derail the engine.
 */
export class IntentClassifier {
  private readonly client?: LLMClient;
  private readonly timeoutMs: number;
  private readonly acceptThreshold: number;
  private readonly systemPrompt: string;
  private readonly cache: Map<string, ClassifiedIntent>;
  private readonly cacheSize: number;

  constructor(options: IntentClassifierOptions = {}) {
    this.client = options.client;
    this.timeoutMs = options.timeoutMs ?? 800;
    this.acceptThreshold = options.acceptThreshold ?? 0.55;
    this.systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;
    this.cacheSize = options.cacheSize ?? 200;
    this.cache = new Map();
  }

  /**
   * Classify a command. Always resolves — falls back to regex on any
   * LLM error. AbortSignal lets callers cancel slow classifications.
   */
  async classify(command: string, signal?: AbortSignal): Promise<ClassifiedIntent> {
    const key = command.trim().toLowerCase();
    if (!key) return regexClassify("");

    const cached = this.cache.get(key);
    if (cached) return { ...cached, source: "cache" };

    if (!this.client) {
      const fallback = regexClassify(key);
      this._cache(key, fallback);
      return fallback;
    }

    try {
      const llmResult = await this._classifyWithLLM(key, signal);
      if (llmResult && llmResult.confidence >= this.acceptThreshold) {
        this._cache(key, llmResult);
        return llmResult;
      }
    } catch {
      // swallow — fall through to regex
    }
    const fallback = regexClassify(key);
    this._cache(key, fallback);
    return fallback;
  }

  /** Synchronous regex-only classification (used when no time budget). */
  classifySync(command: string): ClassifiedIntent {
    const key = command.trim().toLowerCase();
    const cached = this.cache.get(key);
    if (cached) return { ...cached, source: "cache" };
    const fallback = regexClassify(key);
    this._cache(key, fallback);
    return fallback;
  }

  /** Inspect the cache. Mostly for tests + telemetry. */
  cachedCount(): number {
    return this.cache.size;
  }

  /** Clear all cached classifications. */
  clear(): void {
    this.cache.clear();
  }

  private async _classifyWithLLM(
    key: string,
    signal?: AbortSignal,
  ): Promise<ClassifiedIntent | null> {
    if (!this.client) return null;

    const timeoutController = new AbortController();
    const timer = setTimeout(() => timeoutController.abort(), this.timeoutMs);
    const combined = signal
      ? anyAbort([signal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const response = await raceAbort(
        this.client.chat({
          system: this.systemPrompt,
          user: key,
          model: "fast",
          temperature: 0.2,
          maxTokens: 120,
          jsonMode: true,
        }),
        combined,
      );

      const parsed = ResponseParser.extractJSON(response.content) as {
        verb?: string;
        target?: string;
        domain?: string;
        reducer?: string;
        confidence?: number;
      };

      const reducer = sanitizeReducer(parsed.reducer);
      const domain = sanitizeDomain(parsed.domain);
      const verb = String(parsed.verb ?? key.split(/\s+/)[0] ?? "act").toLowerCase();
      const target = String(parsed.target ?? "").toLowerCase().trim();
      const confidence =
        typeof parsed.confidence === "number" ? clamp(parsed.confidence, 0, 1) : 0;

      return { verb, target, domain, reducer, confidence, source: "llm" };
    } finally {
      clearTimeout(timer);
    }
  }

  private _cache(key: string, intent: ClassifiedIntent): void {
    if (this.cache.size >= this.cacheSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(key, intent);
  }
}

/**
 * Lightweight regex-based classifier. The fallback path; also used by
 * tests and when no LLMClient is configured.
 */
export function regexClassify(command: string): ClassifiedIntent {
  const key = command.trim().toLowerCase();
  const parts = key.split(/\s+/);
  const verb = parts[0] ?? "";
  const target = parts.slice(1).join(" ");

  let reducer: ReducerKind = "narrative_only";
  for (const kind of Object.keys(REDUCER_VERBS) as ReducerKind[]) {
    if (REDUCER_VERBS[kind].includes(verb)) {
      reducer = kind;
      break;
    }
  }

  let domain: IntentDomain = "physical";
  for (const hint of DOMAIN_HINTS) {
    if (hint.keywords.some((kw) => key.includes(kw))) {
      domain = hint.domain;
      break;
    }
  }

  return {
    verb,
    target,
    domain,
    reducer,
    confidence: reducer === "narrative_only" ? 0.4 : 0.75,
    source: "regex",
  };
}

function sanitizeReducer(value: unknown): ReducerKind {
  const candidates: ReducerKind[] = [
    "move",
    "combat",
    "rest",
    "item",
    "dialogue",
    "investigation",
    "narrative_only",
  ];
  return candidates.includes(value as ReducerKind)
    ? (value as ReducerKind)
    : "narrative_only";
}

function sanitizeDomain(value: unknown): IntentDomain {
  const candidates: IntentDomain[] = [
    "physical",
    "social",
    "metaphysical",
    "combat",
    "craft",
    "stealth",
    "lore",
    "wilderness",
    "intrigue",
  ];
  return candidates.includes(value as IntentDomain)
    ? (value as IntentDomain)
    : "physical";
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function anyAbort(signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const s of signals) {
    if (s.aborted) {
      controller.abort();
      break;
    }
    s.addEventListener("abort", () => controller.abort(), { once: true });
  }
  return controller.signal;
}

function raceAbort<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
  if (!signal.aborted) {
    return new Promise<T>((resolve, reject) => {
      const onAbort = () => reject(new Error("classify aborted"));
      signal.addEventListener("abort", onAbort, { once: true });
      promise.then(
        (value) => {
          signal.removeEventListener("abort", onAbort);
          resolve(value);
        },
        (err) => {
          signal.removeEventListener("abort", onAbort);
          reject(err);
        },
      );
    });
  }
  return Promise.reject(new Error("classify aborted before start"));
}
