/**
 * VoiceEvaluator — heuristic scorer for Narrator output against the manifesto voice.
 *
 * Phase 17 / Wave F / ENG-302.
 *
 * v1: rule-based heuristics. Returns a 0-1 score plus per-criterion breakdown.
 * Future upgrade hook: LLM-judge scoring (compare against gold-set ideal_narration).
 *
 * Scoring criteria (each 0-1, averaged):
 *   1. banned-phrase absence       (1.0 = no banned phrases; 0 = many)
 *   2. glyph discipline             (1.0 = only allowed glyphs; 0 = any disallowed)
 *   3. adjective density            (1.0 = ≤2 per sentence; degrades above)
 *   4. sentence-length distribution (penalizes monotone short/long; favors mixed 5-25 words)
 *   5. specificity                  (1.0 = ≥1 proper noun per 2 sentences; lower otherwise)
 *
 * Score interpretation:
 *   ≥ 0.85  passing — narrator is on-voice
 *   0.70-0.85  warning — drift detected; review
 *   < 0.70  failing — voice has regressed; reject
 */

const BANNED_PHRASES: ReadonlyArray<string> = [
  // tragedy-as-relief
  "finally at peace", "rest in peace", "ended their suffering", "released from",
  "no more pain", "at last free", "found rest", "found peace",
  // celebration
  "victory!", "triumph!", "completed their journey", "fulfilled their destiny",
  "great victory", "epic win", "stunning success",
  // modern slang
  "totally", "lol", "lmao", "dude", "epic fail", "omg", "tl;dr",
  "based", "cringe", "vibes", "no cap", "lowkey", "highkey",
  "rizz", "delulu",
  // therapy-coded introspection
  "deep down inside", "in their heart of hearts", "they realized their true self",
  "found themselves", "inner journey", "personal growth",
];

const ALLOWED_GLYPHS = new Set(["◆", "❦", "↻", "→", "·", "©", "®", "™", "—", "–", "‘", "’", "“", "”", "…"]);

function isFlaggablePictograph(ch: string): boolean {
  if (ALLOWED_GLYPHS.has(ch)) return false;
  const cp = ch.codePointAt(0) ?? 0;
  if (cp >= 0x1F300 && cp <= 0x1FAFF) return true;
  if (cp >= 0x2600 && cp <= 0x27BF) return true;
  if (cp >= 0x1F000 && cp <= 0x1F2FF) return true;
  if (cp >= 0x2300 && cp <= 0x23FF) return true;
  if (cp >= 0x1F3FB && cp <= 0x1F3FF) return true;
  if (cp === 0xFE0F) return true;
  return false;
}

// Simple adjective heuristic: words ending in common adjective suffixes.
// Not perfect (English is ambiguous) but catches the high-density-prose drift.
const ADJ_SUFFIX_RX = /\b\w+(?:ous|ful|less|able|ible|al|ive|ent|ant|ic|ish|y|ed)\b/gi;

const PROPER_NOUN_RX = /\b[A-Z][a-zA-Z]+(?:-[A-Z][a-zA-Z]+)?\b/g;

const SENTENCE_SPLIT_RX = /[.!?]+(?:\s+|$)/;

export interface VoiceCriterionScore {
  name: string;
  score: number; // 0-1
  detail?: string;
}

export interface VoiceEvalResult {
  /** Overall 0-1 score (average of criteria). */
  score: number;
  /** Per-criterion breakdown. */
  criteria: VoiceCriterionScore[];
  /** Voice band: "pass" >= 0.85, "warn" 0.70-0.85, "fail" < 0.70 */
  band: "pass" | "warn" | "fail";
  /** Specific banned phrases found, if any */
  banned_phrases_found: string[];
  /** Specific disallowed glyphs found, if any */
  disallowed_glyphs_found: string[];
}

export class VoiceEvaluator {
  evaluate(text: string): VoiceEvalResult {
    if (!text || text.trim().length === 0) {
      return {
        score: 0,
        criteria: [{ name: "empty", score: 0, detail: "empty input" }],
        band: "fail",
        banned_phrases_found: [],
        disallowed_glyphs_found: [],
      };
    }

    // ── 1. Banned-phrase absence ──────────────────────────────────────────────
    const lower = text.toLowerCase();
    const bannedFound: string[] = [];
    for (const phrase of BANNED_PHRASES) {
      if (lower.includes(phrase)) bannedFound.push(phrase);
    }
    const bannedScore = bannedFound.length === 0 ? 1 : Math.max(0, 1 - bannedFound.length * 0.34);

    // ── 2. Glyph discipline ────────────────────────────────────────────────────
    const glyphsFound: string[] = [];
    for (const ch of text) {
      if (isFlaggablePictograph(ch)) glyphsFound.push(ch);
    }
    const glyphScore = glyphsFound.length === 0 ? 1 : 0;

    // ── 3. Adjective density (≤2 per sentence) ─────────────────────────────────
    const sentences = text.split(SENTENCE_SPLIT_RX).filter((s) => s.trim().length > 0);
    let overDenseCount = 0;
    for (const s of sentences) {
      const adjs = (s.match(ADJ_SUFFIX_RX) ?? []).length;
      if (adjs > 2) overDenseCount += 1;
    }
    const adjScore =
      sentences.length === 0
        ? 1
        : Math.max(0, 1 - (overDenseCount / sentences.length) * 1.5);

    // ── 4. Sentence-length distribution (mixed = good) ─────────────────────────
    const lengths = sentences.map((s) => s.trim().split(/\s+/).length);
    let lengthScore = 1;
    if (lengths.length >= 2) {
      const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
      const variance = lengths.reduce((a, b) => a + (b - mean) ** 2, 0) / lengths.length;
      const std = Math.sqrt(variance);
      // Reward mixed cadence (std > 2 in a sample), penalize monotone (std < 1)
      if (std < 1) lengthScore = 0.6;
      else if (std < 2) lengthScore = 0.8;
      else lengthScore = 1;
      // Penalize all-short (mean < 4) or all-long (mean > 30) regimes
      if (mean < 4 || mean > 30) lengthScore = Math.min(lengthScore, 0.5);
    }

    // ── 5. Specificity (proper nouns per sentence) ─────────────────────────────
    const properNouns = text.match(PROPER_NOUN_RX) ?? [];
    // Filter out sentence-initial words (which are capitalized but not necessarily proper nouns).
    // Cheap heuristic: anything mid-sentence capitalized counts; sentence-initial discounted by 0.5.
    let properCount = 0;
    for (const s of sentences) {
      const matches = s.match(PROPER_NOUN_RX) ?? [];
      if (matches.length === 0) continue;
      // First match might be sentence-initial; discount by 0.5 weight
      properCount += 0.5 + (matches.length - 1);
    }
    const specRatio = sentences.length === 0 ? 0 : properCount / Math.max(1, sentences.length);
    const specScore = Math.min(1, specRatio / 0.5); // target: ≥0.5 proper-nouns-per-sentence → 1.0

    // ── Aggregate ──────────────────────────────────────────────────────────────
    const criteria: VoiceCriterionScore[] = [
      { name: "banned_phrase_absence", score: bannedScore, detail: bannedFound.length === 0 ? undefined : `${bannedFound.length} banned phrase(s)` },
      { name: "glyph_discipline", score: glyphScore, detail: glyphsFound.length === 0 ? undefined : `${glyphsFound.length} disallowed glyph(s)` },
      { name: "adjective_density", score: adjScore, detail: overDenseCount === 0 ? undefined : `${overDenseCount}/${sentences.length} sentences over ≤2-adj rule` },
      { name: "sentence_length_distribution", score: lengthScore, detail: `mean ${sentences.length === 0 ? 0 : (lengths.reduce((a, b) => a + b, 0) / lengths.length).toFixed(1)} words` },
      { name: "specificity_proper_nouns", score: specScore, detail: `${properCount.toFixed(1)} proper-noun weight across ${sentences.length} sentence(s)` },
    ];

    const overall = criteria.reduce((a, c) => a + c.score, 0) / criteria.length;
    const band: VoiceEvalResult["band"] = overall >= 0.85 ? "pass" : overall >= 0.70 ? "warn" : "fail";

    return {
      score: Math.round(overall * 100) / 100,
      criteria: criteria.map((c) => ({ ...c, score: Math.round(c.score * 100) / 100 })),
      band,
      banned_phrases_found: bannedFound,
      disallowed_glyphs_found: glyphsFound,
    };
  }
}
