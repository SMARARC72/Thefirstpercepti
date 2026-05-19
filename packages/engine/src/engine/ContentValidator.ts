/**
 * ============================================================================
 * CONTENT VALIDATOR - The First Perception RPG
 * ============================================================================
 * Content boundary checking: block list validation, depiction mode selection,
 * safe rewrite suggestions, severity assessment, category tagging.
 * Ensures narrative content stays within appropriate boundaries.
 *
 * @module engine/ContentValidator
 * @version 1.0.0
 * ============================================================================
 */

import {
  ContentValidationResult,
  ContentIssue,
  ContentCategory,
  CONTENT_CATEGORIES,
  DepictionMode,
  DEPICTION_MODES,
} from '../engine-types';

// =============================================================================
// BLOCK LISTS
// =============================================================================

/** Terms that should never appear in generated content */
const GLOBAL_BLOCK_LIST: string[] = [
  // Hate speech slurs and derogatory terms
  'slur_placeholder',
  // Real-world extremist references
  'isis', 'al-qaeda', 'nazi salute', 'heil',
  // Self-harm instruction patterns
  'how to kill yourself', 'suicide method', 'self-harm guide',
  // Modern brand/IP references that break immersion
  'google it', 'facebook', 'twitter', 'instagram', 'tiktok',
  'netflix', 'disney', 'marvel', 'dc comics',
  // Fourth-wall breaking game meta-terms
  'hit points', 'hp bar', 'saving throw', 'skill check',
  'd20', 'd100', 'critical hit', 'game master', 'gm',
  'player character', 'npc', 'non-player character',
  'level up', 'experience points', 'xp',
];

/** Patterns suggesting extreme content that needs special handling */
const EXTREME_CONTENT_PATTERNS: Array<{
  pattern: RegExp;
  category: ContentCategory;
  severity: 'low' | 'medium' | 'high';
  description: string;
}> = [
  {
    pattern: /\b(torture|torturing|tortured)\s+(?:in\s+detail|slowly|methodically|for\s+hours)\b/i,
    category: CONTENT_CATEGORIES.VIOLENCE,
    severity: 'high',
    description: 'Detailed torture description',
  },
  {
    pattern: /\b(child|children)\s+(?:being\s+killed|murdered|tortured)\b/i,
    category: CONTENT_CATEGORIES.VIOLENCE,
    severity: 'high',
    description: 'Violence against children',
  },
  {
    pattern: /\bsexual\s+(?:assault|violence|abuse)\b/i,
    category: CONTENT_CATEGORIES.VIOLENCE,
    severity: 'high',
    description: 'Sexual violence reference',
  },
  {
    pattern: /\b(gore|gory)\s*(?:everywhere|spilling|dripping|spraying)\b/i,
    category: CONTENT_CATEGORIES.GORE,
    severity: 'high',
    description: 'Graphic gore description',
  },
  {
    pattern: /\b(intestine|organ|eyeball|brain)\s*(?:dangling|spilling|hanging|exposed)\b/i,
    category: CONTENT_CATEGORIES.GORE,
    severity: 'medium',
    description: 'Graphic body horror',
  },
  {
    pattern: /\b(disease|plague|rot)\s+(?:consuming|eating|devouring)\s+(?:flesh|body|from\s+within)\b/i,
    category: CONTENT_CATEGORIES.DISEASE_CONTENT,
    severity: 'medium',
    description: 'Graphic disease description',
  },
  {
    pattern: /\b(body\s+horror|mutation|warping|twisting)\s+(?:limb|flesh|bone|skin)\b/i,
    category: CONTENT_CATEGORIES.BODY_HORROR,
    severity: 'medium',
    description: 'Body horror imagery',
  },
  {
    pattern: /\b(insanity|madness|going\s+crazy)\s+(?:laughing|screaming|babbling)\b/i,
    category: CONTENT_CATEGORIES.PSYCHOLOGICAL,
    severity: 'low',
    description: 'Mental health portrayal',
  },
  {
    pattern: /\b(ethnic|religious)\s+(cleansing|purging|extermination)\b/i,
    category: CONTENT_CATEGORIES.POLITICAL,
    severity: 'high',
    description: 'Ethnic/religious violence',
  },
];

/** Safe rewrite suggestions for problematic content */
const SAFE_REWRITES: Record<string, string[]> = {
  'detailed torture': [
    'The prisoner was questioned. The methods were not spoken of.',
    'Information was extracted. The process left marks.',
  ],
  'graphic violence': [
    'Violence occurred. The details are best left unspoken.',
    'There was a struggle. Afterward, silence.',
  ],
  'extreme gore': [
    'The wound was severe. What was seen cannot be unseen.',
    'Damage was done. The scene speaks for itself.',
  ],
  'child harm': [
    'The young ones suffered, as they always do in troubled times.',
    'No one is spared, not even the smallest.',
  ],
  'sexual violence': [
    'Something terrible happened. The victim does not speak of it.',
    'A violation occurred. The scars are not visible.',
  ],
  'body horror': [
    'The body changed. What was human became something else.',
    'The transformation was gradual, then sudden.',
  ],
  'psychological horror': [
    'The mind faltered. Reality became uncertain.',
    'Something broke within. The cracks showed slowly.',
  ],
};

// =============================================================================
// CONTENT VALIDATOR
// =============================================================================

/**
 * The ContentValidator ensures all generated narrative content
 * stays within appropriate boundaries. It checks against block lists,
 * assesses content severity, suggests safe rewrites, and recommends
 * depiction modes.
 */
export class ContentValidator {
  private blockList: string[];
  private depictionMode: DepictionMode;

  constructor(depictionMode: DepictionMode = DEPICTION_MODES.IMPLICIT, customBlockList?: string[]) {
    this.depictionMode = depictionMode;
    this.blockList = [...GLOBAL_BLOCK_LIST, ...(customBlockList ?? [])];
  }

  /** Set the depiction mode */
  setDepictionMode(mode: DepictionMode): void {
    this.depictionMode = mode;
  }

  /** Get current depiction mode */
  getDepictionMode(): DepictionMode {
    return this.depictionMode;
  }

  // =============================================================================
  // VALIDATION
  // =============================================================================

  /**
   * Validate content and return a detailed result.
   * This is the main entry point.
   */
  validate(content: string): ContentValidationResult {
    const issues: ContentIssue[] = [];

    // 1. Check block list
    const blockIssues = this.checkBlockList(content);
    issues.push(...blockIssues);

    // 2. Check extreme content patterns
    const patternIssues = this.checkExtremePatterns(content);
    issues.push(...patternIssues);

    // 3. Assess severity
    const maxSeverity = this.calculateMaxSeverity(issues);

    // 4. Determine recommended depiction mode
    const recommendedMode = this.recommendDepictionMode(issues, this.depictionMode);

    // 5. Generate safe rewrite if needed
    const safeRewrite =
      maxSeverity === 'high' || issues.length > 2
        ? this.generateSafeRewrite(content, issues)
        : undefined;

    const passes = issues.length === 0;

    return {
      passes,
      issues,
      safeRewrite,
      maxSeverity: maxSeverity === 'none' ? 'none' : maxSeverity,
      recommendedMode,
    };
  }

  /**
   * Quick validation - returns true if content passes all checks.
   */
  quickValidate(content: string): boolean {
    const result = this.validate(content);
    return result.passes;
  }

  // =============================================================================
  // BLOCK LIST CHECKING
  // =============================================================================

  /** Check content against the block list */
  private checkBlockList(content: string): ContentIssue[] {
    const issues: ContentIssue[] = [];
    const lowerContent = content.toLowerCase();

    for (const blocked of this.blockList) {
      const lowerBlocked = blocked.toLowerCase();
      if (lowerContent.includes(lowerBlocked)) {
        // Find the location
        const index = lowerContent.indexOf(lowerBlocked);
        issues.push({
          category: CONTENT_CATEGORIES.SOCIAL,
          description: `Blocked term found: "${blocked}"`,
          severity: 'high',
          location: [index, index + blocked.length],
          suggestion: '[Content removed - blocked term]',
        });
      }
    }

    return issues;
  }

  // =============================================================================
  // EXTREME PATTERN CHECKING
  // =============================================================================

  /** Check content against extreme content patterns */
  private checkExtremePatterns(content: string): ContentIssue[] {
    const issues: ContentIssue[] = [];

    for (const pattern of EXTREME_CONTENT_PATTERNS) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        for (const match of matches) {
          const index = content.indexOf(match);
          issues.push({
            category: pattern.category,
            description: pattern.description,
            severity: pattern.severity,
            location: [index, index + match.length],
            suggestion: this.getSuggestionForCategory(pattern.category),
          });
        }
      }
    }

    return issues;
  }

  // =============================================================================
  // SEVERITY ASSESSMENT
  // =============================================================================

  /** Calculate the maximum severity from issues */
  private calculateMaxSeverity(issues: ContentIssue[]): 'none' | 'low' | 'medium' | 'high' {
    if (issues.length === 0) return 'none';

    let max: 'none' | 'low' | 'medium' | 'high' = 'none';
    for (const issue of issues) {
      const sev = issue.severity as string;
      if (sev === 'high') return 'high';
      if (sev === 'medium') max = 'medium';
      if (sev === 'low' && max === 'none') max = 'low';
    }
    return max;
  }

  /** Get overall severity score (0-100) */
  calculateSeverityScore(content: string): number {
    const result = this.validate(content);
    const severityWeights = { none: 0, low: 25, medium: 50, high: 100 };

    let score = severityWeights[result.maxSeverity];

    // Add points for each issue
    for (const issue of result.issues) {
      score += severityWeights[issue.severity] * 0.2;
    }

    return Math.min(100, Math.round(score));
  }

  // =============================================================================
  // DEPICTION MODE
  // =============================================================================

  /** Recommend a depiction mode based on content */
  private recommendDepictionMode(issues: ContentIssue[], currentMode: DepictionMode): DepictionMode {
    // If current mode is off_screen, always respect that
    if (currentMode === DEPICTION_MODES.OFF_SCREEN) return DEPICTION_MODES.OFF_SCREEN;

    // Count high-severity issues by category
    const highSeverityCategories = new Set(
      issues
        .filter((i) => i.severity === 'high')
        .map((i) => i.category)
    );

    // Violence/horror/gore at high severity -> off_screen
    if (
      highSeverityCategories.has(CONTENT_CATEGORIES.VIOLENCE) ||
      highSeverityCategories.has(CONTENT_CATEGORIES.GORE) ||
      highSeverityCategories.has(CONTENT_CATEGORIES.BODY_HORROR)
    ) {
      return DEPICTION_MODES.OFF_SCREEN;
    }

    // Medium severity -> implicit
    const hasMediumSeverity = issues.some((i) => i.severity === 'medium');
    if (hasMediumSeverity && currentMode === DEPICTION_MODES.EXPLICIT) {
      return DEPICTION_MODES.IMPLICIT;
    }

    // Keep current mode if no issues
    return currentMode;
  }

  // =============================================================================
  // SAFE REWRITE
  // =============================================================================

  /** Generate a safe rewrite of problematic content */
  private generateSafeRewrite(content: string, issues: ContentIssue[]): string {
    let rewritten = content;

    for (const issue of issues) {
      if (issue.location) {
        const [start, end] = issue.location;
        const original = content.slice(start, end);

        // Find appropriate rewrite
        const rewrite = this.findRewrite(issue);
        rewritten = rewritten.replace(original, rewrite);
      }
    }

    // If we couldn't do targeted rewrites, apply general sanitization
    if (rewritten === content) {
      rewritten = this.applyGeneralSanitization(content);
    }

    return rewritten;
  }

  /** Find an appropriate rewrite for an issue */
  private findRewrite(issue: ContentIssue): string {
    const categoryMap: Record<string, string> = {
      [CONTENT_CATEGORIES.VIOLENCE]: 'graphic violence',
      [CONTENT_CATEGORIES.HORROR]: 'psychological horror',
      [CONTENT_CATEGORIES.GORE]: 'extreme gore',
      [CONTENT_CATEGORIES.DISEASE_CONTENT]: 'graphic disease',
      [CONTENT_CATEGORIES.BODY_HORROR]: 'body horror',
      [CONTENT_CATEGORIES.PSYCHOLOGICAL]: 'psychological horror',
      [CONTENT_CATEGORIES.SOCIAL]: '[content removed]',
      [CONTENT_CATEGORIES.POLITICAL]: '[content removed]',
    };

    const key = categoryMap[issue.category];
    if (key && SAFE_REWRITES[key]) {
      const rewrites = SAFE_REWRITES[key];
      return rewrites[0] ?? '[content modified]';
    }

    return issue.suggestion ?? '[content modified for appropriateness]';
  }

  /** Apply general sanitization when targeted rewrites aren't possible */
  private applyGeneralSanitization(content: string): string {
    // Replace graphic descriptions with implicit versions
    const replacements: [RegExp, string][] = [
      [/\b(blood|blood\s+gore)\s+(?:everywhere|spilling|spraying|pooling)\b/gi, 'signs of violence'],
      [/\b(flesh|meat|tissue)\s+(?:torn|ripped|exposed|visible)\b/gi, 'wounds'],
      [/\b(bone|bones)\s+(?:showing|exposed|visible|protruding)\b/gi, 'injuries'],
      [/\b(screamed|screaming|shrieking)\s+(?:in\s+agony|in\s+pain|for\s+hours)\b/gi, 'cried out'],
      [/\b(slowly|agonizingly)\s+(?:died|dying|killed)\b/gi, 'perished'],
    ];

    let sanitized = content;
    for (const [pattern, replacement] of replacements) {
      sanitized = sanitized.replace(pattern, replacement);
    }

    return sanitized;
  }

  // =============================================================================
  // CATEGORY TAGGING
  // =============================================================================

  /** Tag content with applicable categories */
  tagCategories(content: string): ContentCategory[] {
    const categories = new Set<ContentCategory>();
    const lower = content.toLowerCase();

    const categoryPatterns: Record<ContentCategory, RegExp[]> = {
      violence: [/\b(kill|death|murder|fight|battle|combat|wound|injury|blood|blade|sword|attack)\b/i],
      horror: [/\b(terror|dread|horror|fear|doom|dreadful|terrifying)\b/i],
      gore: [/\b(gore|gore|blood|entrails|disembowel|dismember|decapitate)\b/i],
      disease: [/\b(plague|disease|sickness|illness|infection|rot|decay|fever)\b/i],
      body_horror: [/\b(mutation|mutate|warp|twist|distort|flesh|bone)\b/i],
      psychological: [/\b(madness|insanity|lunatic|crazy|deranged|psychosis|paranoia)\b/i],
      social: [/\b(betrayal|treason|conspiracy|intrigue|political|faction)\b/i],
      political: [/\b(power|control|rule|government|faction|rebellion|uprising)\b/i],
    };

    for (const [category, patterns] of Object.entries(categoryPatterns)) {
      for (const pattern of patterns) {
        if (pattern.test(lower)) {
          categories.add(category as ContentCategory);
          break;
        }
      }
    }

    return [...categories];
  }

  // =============================================================================
  // SUGGESTIONS
  // =============================================================================

  /** Get a suggestion for a content category */
  private getSuggestionForCategory(category: ContentCategory): string {
    const suggestions: Record<ContentCategory, string> = {
      violence: 'Keep violence implicit: describe aftermath rather than action.',
      horror: 'Focus on atmosphere and dread rather than explicit horror.',
      gore: 'Minimize graphic detail. Focus on emotional impact.',
      disease: 'Describe effects without graphic medical detail.',
      body_horror: 'Suggest transformation rather than detailing it.',
      psychological: 'Show mental state through behavior, not clinical description.',
      social: 'Handle social conflict with nuance and indirectness.',
      political: 'Keep political conflict grounded in personal stakes.',
    };
    return suggestions[category] ?? 'Consider revising for appropriateness.';
  }

  // =============================================================================
  // SANITIZATION
  // =============================================================================

  /**
   * Sanitize content for a given depiction mode.
   * Returns content appropriate for the specified mode.
   */
  sanitizeForMode(content: string, mode: DepictionMode): string {
    switch (mode) {
      case DEPICTION_MODES.EXPLICIT:
        // Minimal changes - just block list
        return this.removeBlockListTerms(content);

      case DEPICTION_MODES.IMPLICIT:
        // Replace graphic descriptions with suggestive ones
        return this.makeImplicit(content);

      case DEPICTION_MODES.OFF_SCREEN:
        // Remove graphic content entirely, show only aftermath/reactions
        return this.makeOffScreen(content);

      default:
        return content;
    }
  }

  /** Remove block list terms from content */
  private removeBlockListTerms(content: string): string {
    let cleaned = content;
    for (const term of this.blockList) {
      const pattern = new RegExp(`\\b${term}\\b`, 'gi');
      cleaned = cleaned.replace(pattern, '[removed]');
    }
    return cleaned;
  }

  /** Make content implicit - suggest rather than show */
  private makeImplicit(content: string): string {
    let implicit = this.removeBlockListTerms(content);

    const replacements: [RegExp, string][] = [
      [/\b(blood)\s+(?:spilled|sprayed|pooled|everywhere)\b/gi, 'blood was shed'],
      [/\b(flesh)\s+(?:torn|ripped|shredded)\b/gi, 'wounds were inflicted'],
      [/\b(bone)\s+(?:showing|visible|exposed)\b/gi, 'injuries were severe'],
      [/\b(screamed)\s+(?:in\s+agony|loudly)\b/gi, 'cried out'],
      [/\b(died)\s+(?:slowly|agonizingly|painfully)\b/gi, 'perished'],
    ];

    for (const [pattern, replacement] of replacements) {
      implicit = implicit.replace(pattern, replacement);
    }

    return implicit;
  }

  /** Make content off-screen - show only aftermath */
  private makeOffScreen(content: string): string {
    // Extract sentences that describe violence/graphic content
    const sentences = content.match(/[^.!?]+[.!?]+/g) ?? [content];
    const cleaned: string[] = [];

    for (const sentence of sentences) {
      const lower = sentence.toLowerCase();
      const isGraphic =
        /\b(blood|gore|flesh|bone|intestine|organ)\b/i.test(lower) &&
        /\b(spill|spray|pool|torn|exposed|visible|dangling)\b/i.test(lower);

      const isViolence =
        /\b(kill|murder|slaughter|massacre|execute)\b/i.test(lower) &&
        /\b(slowly|brutally|violently|mercilessly)\b/i.test(lower);

      if (isGraphic || isViolence) {
        // Replace with aftermath focus
        cleaned.push('The aftermath told its own story.');
      } else {
        cleaned.push(sentence);
      }
    }

    return cleaned.join(' ').trim();
  }
}

// =============================================================================
// STATICS
// =============================================================================

/** All content categories with descriptions */
export const CONTENT_CATEGORY_DESCRIPTIONS: Record<ContentCategory, string> = {
  violence: 'Physical violence and combat',
  horror: 'Horror and dread elements',
  gore: 'Graphic depictions of injury or death',
  disease: 'Disease, sickness, and medical horror',
  body_horror: 'Body transformation and corruption',
  psychological: 'Psychological distress and mental illness',
  social: 'Social conflict and interpersonal harm',
  political: 'Political conflict and power struggles',
};

/** Depiction mode descriptions */
export const DEPICTION_MODE_DESCRIPTIONS: Record<DepictionMode, string> = {
  implicit: 'Describe suggestively, focus on atmosphere and aftermath',
  explicit: 'Direct description within appropriate bounds',
  off_screen: 'Show only what characters see/know; graphic content happens off-screen',
};

/** Quick validate function */
export function quickValidate(content: string): ContentValidationResult {
  const validator = new ContentValidator();
  return validator.validate(content);
}
