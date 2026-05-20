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

/**
 * System prompt for the LLM-driven path. Carries an explicit schema
 * description (field-by-field allowed values) so json-mode replies
 * stay inside the enum. The prompt body matters even with
 * `response_format: { type: "json_object" }`, because providers will
 * happily emit `{}` if the schema is left ambiguous — embedding the
 * schema cuts the parse-failure rate at zero extra tokens of latency.
 */
const DEFAULT_SYSTEM_PROMPT = `You are an intent classifier for a cosmic-horror text RPG.

Given the player's free-text command, return a JSON object with EXACTLY these fields:
  - verb: string, a single lowercase verb token (e.g. "attack", "examine").
  - target: string, lowercase, may be "" if no clear target. Strip articles ("the", "a").
  - domain: one of: "physical" | "social" | "metaphysical" | "combat" | "craft" | "stealth" | "lore" | "wilderness" | "intrigue".
  - reducer: one of: "move" | "combat" | "rest" | "item" | "dialogue" | "investigation" | "narrative_only".
  - confidence: number in [0.0, 1.0]. How sure you are.

Reducer guidance:
  - move          — the player wants to change location ("go to", "approach", "flee").
  - combat        — the player is fighting ("attack", "strike", "shoot", "kill").
  - rest          — the player is resting / sleeping / recovering / waiting.
  - item          — the player is using/equipping/dropping an inventory item.
  - dialogue      — the player is talking to an NPC ("talk to", "ask", "speak"). If the command pairs movement with talking ("go talk to the priest"), prefer dialogue.
  - investigation — the player is examining / searching / listening / reading / picking a lock / forcing a door.
  - narrative_only — when none of the above apply (pure flavour, ambiguous intent).

Hard rules:
  - Output JSON only. No prose, no markdown, no comments, no code fences.
  - Use only the enum values listed above. Lowercase. No extra fields.
  - If the input is empty or pure flavour, return reducer "narrative_only" with confidence <= 0.4.`;

/**
 * Exact first-word verb → reducer map. Order of keys here is the
 * tie-break order in `regexClassify`. See PHRASE_OVERRIDES below for
 * compound-phrase handling that runs before the first-word lookup.
 *
 * History (Phase 8b misroute audit):
 *   - "break the lock" → narrative_only. Added break/pick/force/unlock/open to investigation.
 *   - "go talk to the priest" → move. Now caught by PHRASE_OVERRIDES.
 *   - "stalk the priestess" → domain=social (via "talk" substring). DOMAIN_HINTS now matches on word boundaries.
 */
const REDUCER_VERBS: Record<ReducerKind, string[]> = {
  move: ["go", "approach", "flee", "sneak", "travel", "walk", "run", "head"],
  combat: ["attack", "fight", "strike", "defend", "riposte", "kill", "shoot"],
  rest: ["rest", "sleep", "recover", "wait"],
  item: ["use", "equip", "consume", "inspect", "drop", "trade", "take", "grab"],
  dialogue: ["speak", "ask", "bargain", "threaten", "lie", "talk", "tell", "greet"],
  investigation: [
    "look",
    "examine",
    "read",
    "listen",
    "search",
    "study",
    "watch",
    "investigate",
    "break",
    "pick",
    "force",
    "unlock",
    "open",
  ],
  narrative_only: [],
};

/**
 * Compound-phrase overrides scanned BEFORE the first-word reducer
 * lookup. Each phrase is matched as whole words (word-boundary
 * regex). First match wins. Use sparingly — these exist to catch
 * common misroutes where a leading verb shadows the real intent.
 */
const PHRASE_OVERRIDES: Array<{ pattern: RegExp; reducer: ReducerKind }> = [
  // Movement-then-dialogue: "go talk to the priest", "head over and ask the smith".
  { pattern: /\b(go|head|walk|run|travel)\b[^.!?]*\b(talk|speak|ask|tell|bargain|greet)\b/, reducer: "dialogue" },
  // "take a look/peek/glance" — looks like item-use but is investigation.
  { pattern: /\btake\b[^.!?]*\b(a\s+)?(look|peek|glance)\b/, reducer: "investigation" },
  // "approach and attack", "sneak up and stab" — leading move verb shadowing combat.
  { pattern: /\b(approach|sneak|walk|run|head)\b[^.!?]*\b(and\s+)?(attack|strike|stab|kill|fight|shoot)\b/, reducer: "combat" },
];

/**
 * Domain keyword hints scanned across the full command. Each keyword
 * matches as a whole word (word boundary on both sides) — previously
 * a plain substring scan, which leaked across word boundaries
 * (e.g. "stalk" → "talk" → social). Order is priority; first match wins.
 */
const DOMAIN_HINTS: Array<{ keywords: string[]; domain: IntentDomain }> = [
  { keywords: ["attack", "fight", "strike", "kill", "blade"], domain: "combat" },
  { keywords: ["speak", "ask", "bargain", "tell", "talk"], domain: "social" },
  { keywords: ["sneak", "hide", "flee", "creep", "stalk"], domain: "stealth" },
  { keywords: ["make", "repair", "build", "fix"], domain: "craft" },
  { keywords: ["read", "study", "remember", "lore", "name"], domain: "lore" },
  { keywords: ["look", "examine", "listen", "watch"], domain: "wilderness" },
  { keywords: ["ritual", "spirit", "veil", "summon"], domain: "metaphysical" },
  { keywords: ["order", "threaten", "command", "lead"], domain: "intrigue" },
];

/** Whole-word membership check: does `key` contain `word` as a discrete token? */
function containsWord(key: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\b${escaped}\\b`).test(key);
}

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

  // 1. Compound-phrase overrides first — these catch the common cases where
  //    a leading verb shadows the real intent (e.g. "go talk to the priest").
  let reducer: ReducerKind = "narrative_only";
  const override = PHRASE_OVERRIDES.find((r) => r.pattern.test(key));
  if (override) {
    reducer = override.reducer;
  } else {
    // 2. Fall back to first-word verb lookup.
    for (const kind of Object.keys(REDUCER_VERBS) as ReducerKind[]) {
      if (REDUCER_VERBS[kind].includes(verb)) {
        reducer = kind;
        break;
      }
    }
  }

  // 3. Domain hint scan — word-boundary match so "stalk" doesn't bleed into "talk".
  let domain: IntentDomain = "physical";
  for (const hint of DOMAIN_HINTS) {
    if (hint.keywords.some((kw) => containsWord(key, kw))) {
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
