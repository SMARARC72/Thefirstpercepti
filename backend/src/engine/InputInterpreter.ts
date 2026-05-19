/**
 * ============================================================================
 * INPUT INTERPRETER - The First Perception RPG
 * ============================================================================
 * Freeform natural language input parser that converts player text into
 * structured intents. Supports keyword-based action parsing, target
 * resolution, domain mapping, multi-clause inputs, negation, ambiguity
 * detection, and context-aware interpretation.
 *
 * @module engine/InputInterpreter
 * @version 1.0.0
 * ============================================================================
 */

import {
  Intent,
  AlternativeIntent,
  ActionType,
  Domain,
  CoreStat,
  EntityId,
  ACTION_TYPES,
  DOMAINS,
  CORE_STATS,
  Scene,
  Location,
  NPC,
  Item,
} from '../types';

// =============================================================================
// ACTION KEYWORD MAPPING
// =============================================================================

/** Maps keyword groups to action types */
const ACTION_KEYWORDS: Record<ActionType, string[]> = {
  destroy: ['destroy', 'break', 'smash', 'shatter', 'demolish', 'tear', 'rip', 'crush',
    'wreck', 'ruin', 'vandalize', 'deface', 'burn', 'incinerate', 'obliterate',
    'kill', 'slay', 'murder', 'assassinate', 'end', 'annihilate', 'erase'],
  create: ['create', 'make', 'build', 'craft', 'forge', 'construct', 'assemble',
    'fashion', 'shape', 'form', 'produce', 'generate', 'write', 'paint', 'draw',
    'compose', 'design', 'invent', 'grow', 'cultivate', 'brew', 'cook'],
  persuade: ['persuade', 'convince', 'influence', 'sway', 'coax', 'urge', 'compel',
    'motivate', 'inspire', 'encourage', 'manipulate', 'seduce', 'charm',
    'tempt', 'bribe', 'pressure', 'push', 'guide', 'lead', 'convert'],
  investigate: ['investigate', 'search', 'examine', 'study', 'analyze', 'inspect',
    'probe', 'explore', 'scout', 'reconnoiter', 'look', 'check', 'scan',
    'scrutinize', 'assess', 'survey', 'review', 'research', 'delve',
    'sift', 'comb', 'hunt', 'track', 'trace', 'follow'],
  flee: ['flee', 'run', 'escape', 'retreat', 'withdraw', 'bolt', 'dash',
    'sprint', 'scramble', 'evacuate', 'abscond', 'hide', 'sneak away',
    'slip away', 'vanish', 'depart quickly', 'fly', 'scatter'],
  bargain: ['bargain', 'negotiate', 'trade', 'barter', 'haggle', 'deal',
    'exchange', 'swap', 'transact', 'contract', 'agree', 'settle',
    'compromise', 'dicker', 'parley', 'arrange'],
  speak: ['speak', 'talk', 'say', 'tell', 'ask', 'question', 'inquire',
    'request', 'demand', 'command', 'order', 'whisper', 'shout', 'yell',
    'call', 'announce', 'declare', 'state', 'mention', 'discuss',
    'chat', 'converse', 'address', 'greet', 'threaten', 'warn'],
  examine: ['examine', 'look', 'inspect', 'observe', 'study', 'view',
    'watch', 'peer', 'gaze', 'stare', 'notice', 'spot', 'see',
    'perceive', 'regard', 'contemplate', 'check out', 'size up'],
  use: ['use', 'utilize', 'apply', 'employ', 'wield', 'operate',
    'handle', 'manipulate', 'work', 'activate', 'trigger', 'consume',
    'drink', 'eat', 'ingest', 'read', 'open', 'close', 'move'],
  go: ['go', 'walk', 'move', 'travel', 'head', 'proceed', 'advance',
    'approach', 'enter', 'leave', 'exit', 'climb', 'descend',
    'cross', 'pass', 'journey', 'navigate', 'wander', 'stride',
    'march', 'crawl', 'swim', 'jump', 'leap'],
  help: ['help', 'aid', 'assist', 'support', 'rescue', 'save', 'heal',
    'protect', 'defend', 'guard', 'shield', 'comfort', 'care',
    'tend', 'treat', 'cure', 'bandage', 'carry', 'lift'],
  attack: ['attack', 'strike', 'hit', 'punch', 'kick', 'stab', 'slash',
    'cut', 'shoot', 'fire', 'throw', 'cast', 'blast', 'bash',
    'club', 'whip', 'strangle', 'choke', 'impale', 'cleave',
    'assault', 'beat', 'pummel', 'lunge', 'charge'],
  defend: ['defend', 'block', 'parry', 'dodge', 'shield', 'protect',
    'guard', 'resist', 'withstand', 'brace', 'cover', 'duck',
    'sidestep', 'counter', 'deflect', 'absorb', 'endure'],
  evade: ['evade', 'dodge', 'avoid', 'sidestep', 'circumvent', 'elude',
    'escape', 'slip past', 'sneak past', 'bypass', 'skirt',
    'duck', 'weave', 'juke', 'feint'],
  manipulate: ['manipulate', 'control', 'handle', 'steer', 'direct',
    'manage', 'engineer', 'rig', 'alter', 'change', 'adjust',
    'modify', 'tamper', 'fix', 'repair', 'break into'],
  perceive: ['perceive', 'sense', 'feel', 'intuit', 'divine', 'detect',
    'discern', 'recognize', 'identify', 'distinguish', 'tell',
    'know', 'understand', 'comprehend', 'grasp', 'fathom'],
  craft_action: ['craft', 'forge', 'smith', 'sew', 'weave', 'carve',
    'sculpt', 'engrave', 'build', 'repair', 'mend', 'fix',
    'tinker', 'work', 'shape', 'refine', 'process'],
  ritual: ['ritual', 'ceremony', 'rite', 'spell', 'chant', 'invoke',
    'summon', 'conjure', 'bind', 'bless', 'curse', 'ward',
    'sacrifice', 'offer', 'pray', 'meditate', 'channel'],
  rest: ['rest', 'sleep', 'wait', 'pause', 'stop', 'relax', 'recover',
    'lie down', 'sit', 'camp', 'settle', 'doze', 'nap',
    'recuperate', 'breathe', 'gather strength'],
  wait: ['wait', 'pause', 'hold', 'stay', 'remain', 'linger', 'delay',
    'hesitate', 'bide', 'stand by', 'watch', 'listen', 'observe'],
  unknown: [],
};

/** Keywords suggesting specific domains */
const DOMAIN_KEYWORDS: Record<string, Domain> = {
  physical: DOMAINS.PHYSICAL,
  body: DOMAINS.PHYSICAL,
  strength: DOMAINS.PHYSICAL,
  force: DOMAINS.PHYSICAL,
  social: DOMAINS.SOCIAL,
  talk: DOMAINS.SOCIAL,
    people: DOMAINS.SOCIAL,
  crowd: DOMAINS.SOCIAL,
  metaphysical: DOMAINS.METAPHYSICAL,
  spirit: DOMAINS.METAPHYSICAL,
  magic: DOMAINS.METAPHYSICAL,
  ritual_word: DOMAINS.METAPHYSICAL,
  combat: DOMAINS.COMBAT,
  fight: DOMAINS.COMBAT,
  battle: DOMAINS.COMBAT,
  weapon: DOMAINS.COMBAT,
  craft: DOMAINS.CRAFT,
  make: DOMAINS.CRAFT,
  build: DOMAINS.CRAFT,
  tool: DOMAINS.CRAFT,
  stealth: DOMAINS.STEALTH,
  hide: DOMAINS.STEALTH,
  sneak: DOMAINS.STEALTH,
  shadow: DOMAINS.STEALTH,
  lore: DOMAINS.LORE,
  knowledge: DOMAINS.LORE,
  book: DOMAINS.LORE,
  learn: DOMAINS.LORE,
  wilderness: DOMAINS.WILDERNESS,
  nature: DOMAINS.WILDERNESS,
  forest: DOMAINS.WILDERNESS,
  track: DOMAINS.WILDERNESS,
  intrigue: DOMAINS.INTRIGUE,
  plot: DOMAINS.INTRIGUE,
  scheme: DOMAINS.INTRIGUE,
  secret: DOMAINS.INTRIGUE,
};

/** Negation words */
const NEGATION_WORDS = [
  'not', 'no', 'never', 'dont', "don't", 'wont', "won't", 'cant', "can't",
  'shouldnt', "shouldn't", 'wouldnt', "wouldn't", 'couldnt', "couldn't",
  'dont', 'refuse', 'decline', 'reject', 'avoid', 'stop', 'cease',
  'refrain', 'abstain', 'prevent', 'prohibit', 'forbid',
];

/** Emotional tone keywords */
const EMOTIONAL_TONES: Record<string, string[]> = {
  angry: ['angry', 'furious', 'rage', 'mad', 'hate', 'destroy', 'kill', 'vengeance'],
  fearful: ['fear', 'scared', 'afraid', 'terror', 'panic', 'flee', 'run', 'hide'],
  hopeful: ['hope', 'help', 'save', 'rescue', 'believe', 'trust', 'friend'],
  curious: ['curious', 'wonder', 'what', 'why', 'how', 'investigate', 'learn'],
  cautious: ['careful', 'cautious', 'slow', 'quiet', 'sneak', 'watch'],
  desperate: ['desperate', 'please', 'beg', 'plead', 'need', 'now', 'hurry'],
  calm: ['calm', 'peace', 'rest', 'wait', 'observe', 'think'],
  defiant: ['defiant', 'resist', 'refuse', 'never', 'stand', 'fight'],
};

// =============================================================================
// INPUT INTERPRETER
// =============================================================================

/**
 * The InputInterpreter converts freeform player text into structured Intents.
 * It uses keyword matching, context awareness, and NLP-lite techniques.
 */
export class InputInterpreter {
  private sceneContext?: Scene;
  private knownLocations: Location[] = [];
  private knownNPCs: NPC[] = [];
  private knownItems: Item[] = [];

  /** Update the scene context for interpretation */
  setSceneContext(scene: Scene): void {
    this.sceneContext = scene;
  }

  /** Update known entities for target resolution */
  setKnownEntities(locations: Location[], npcs: NPC[], items: Item[]): void {
    this.knownLocations = locations;
    this.knownNPCs = npcs;
    this.knownItems = items;
  }

  /**
   * Parse freeform player input into a structured Intent.
   * This is the main entry point.
   */
  interpret(input: string): Intent {
    const normalized = this.normalize(input);
    const words = this.tokenize(normalized);

    // Check for negation
    const negated = this.detectNegation(words);

    // Detect multi-clause (and/then/comma separated)
    const clauses = this.splitClauses(normalized);
    const primaryClause = clauses[0] ?? normalized;
    const primaryWords = this.tokenize(primaryClause);

    // Parse primary action
    const primaryAction = this.detectAction(primaryWords, primaryClause);

    // Resolve target
    const target = this.resolveTarget(primaryWords, primaryAction, primaryClause);

    // Determine domain
    const domain = this.detectDomain(primaryWords, primaryAction, primaryClause);

    // Suggest stat
    const suggestedStat = this.suggestStat(primaryAction, domain);

    // Detect ambiguity
    const ambiguous = this.detectAmbiguity(primaryWords, primaryAction, target);

    // Generate alternatives
    const alternatives = ambiguous
      ? this.generateAlternatives(primaryAction, words, normalized)
      : [];

    // Extract mentioned entities
    const mentionedItems = this.extractItems(words);
    const mentionedNPCs = this.extractNPCs(words);
    const mentionedLocations = this.extractLocations(words);

    // Extract modifiers
    const modifiers = this.extractModifiers(words);

    // Detect emotional tone
    const emotionalTone = this.detectEmotionalTone(words);

    // Calculate confidence
    const confidence = this.calculateConfidence(
      primaryAction,
      target,
      words,
      normalized,
      ambiguous
    );

    const intent: Intent = {
      originalText: input,
      primaryAction,
      target,
      domain,
      suggestedStat,
      confidence,
      ambiguous,
      alternatives,
      negated,
      mentionedItems,
      mentionedNPCs,
      mentionedLocations,
      modifiers,
      emotionalTone,
    };

    // Try to resolve target to an entity ID
    intent.targetId = this.resolveTargetId(target, primaryAction);

    // Handle multi-clause: detect secondary action
    if (clauses.length > 1) {
      const secondWords = this.tokenize(clauses[1]);
      intent.secondaryAction = this.detectAction(secondWords, clauses[1]);
    }

    return intent;
  }

  // =============================================================================
  // TEXT PREPROCESSING
  // =============================================================================

  /** Normalize input text */
  private normalize(input: string): string {
    return input
      .toLowerCase()
      .replace(/[^\w\s,;.-]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /** Tokenize into words */
  private tokenize(input: string): string[] {
    return input.split(/\s+/).filter((w) => w.length > 0);
  }

  /** Split input into clauses */
  private splitClauses(input: string): string[] {
    // Split on common conjunctions and punctuation
    const splitPattern = /\s+(?:and\s+then|then|and|before|after|while)\s+|,\s*|;\s*/i;
    return input.split(splitPattern).filter((c) => c.trim().length > 0);
  }

  // =============================================================================
  // NEGATION DETECTION
  // =============================================================================

  /** Detect if input contains negation */
  private detectNegation(words: string[]): boolean {
    return words.some((w) => NEGATION_WORDS.includes(w));
  }

  // =============================================================================
  // ACTION DETECTION
  // =============================================================================

  /** Detect the primary action from keywords */
  private detectAction(words: string[], fullText: string): ActionType {
    const scores: Map<ActionType, number> = new Map();

    for (const [action, keywords] of Object.entries(ACTION_KEYWORDS)) {
      let score = 0;
      for (const keyword of keywords) {
        // Full phrase match (for multi-word keywords)
        if (keyword.includes(' ') && fullText.includes(keyword)) {
          score += 5;
          continue;
        }
        // Word match
        if (words.includes(keyword)) {
          score += 3;
        }
        // Partial match (keyword starts with word)
        for (const word of words) {
          if (keyword.startsWith(word) && word.length >= 3) {
            score += 1;
          }
        }
      }
      if (score > 0) {
        scores.set(action as ActionType, score);
      }
    }

    // Handle special cases
    if (fullText.includes('look at') || fullText.includes('look for')) {
      scores.set(ACTION_TYPES.INVESTIGATE, (scores.get(ACTION_TYPES.INVESTIGATE) ?? 0) + 3);
    }
    if (fullText.includes('look around')) {
      scores.set(ACTION_TYPES.EXAMINE, (scores.get(ACTION_TYPES.EXAMINE) ?? 0) + 3);
    }
    if (fullText.includes('talk to') || fullText.includes('speak to') || fullText.includes('ask')) {
      scores.set(ACTION_TYPES.SPEAK, (scores.get(ACTION_TYPES.SPEAK) ?? 0) + 4);
    }

    // If the player starts with an explicit action name, use that as a
    // tie-breaker over broader synonym groups such as investigate/examine.
    const firstWord = words[0];
    const explicitAction = Object.values(ACTION_TYPES).find(
      (action) => action !== ACTION_TYPES.UNKNOWN && action === firstWord
    );
    if (explicitAction && scores.has(explicitAction)) {
      scores.set(explicitAction, scores.get(explicitAction)! + 1);
    }

    // Find highest scoring action
    let bestAction: ActionType = ACTION_TYPES.UNKNOWN;
    let bestScore = 0;
    for (const [action, score] of scores) {
      if (score > bestScore) {
        bestScore = score;
        bestAction = action;
      }
    }

    // Default interpretations for common patterns
    if (bestAction === ACTION_TYPES.UNKNOWN) {
      if (words.length <= 3 && this.knownNPCs.some((n) => fullText.includes(n.name.toLowerCase()))) {
        return ACTION_TYPES.SPEAK;
      }
      if (words.some((w) => ['north', 'south', 'east', 'west', 'up', 'down', 'in', 'out', 'inside', 'outside'].includes(w))) {
        return ACTION_TYPES.GO;
      }
      if (words.some((w) => ['what', 'where', 'who', 'why', 'how'].includes(w))) {
        return ACTION_TYPES.INVESTIGATE;
      }
    }

    return bestAction;
  }

  // =============================================================================
  // TARGET RESOLUTION
  // =============================================================================

  /** Extract the target of the action */
  private resolveTarget(words: string[], action: ActionType, fullText: string): string | undefined {
    // Look for "the X" patterns
    const thePattern = /(?:the|a|an|my|this|that)\s+(\w+(?:\s+\w+)?)/i;
    const match = fullText.match(thePattern);
    if (match) return match[1];

    // Look for proper names (capitalized in original)
    const originalWords = fullText.split(/\s+/);
    for (let i = 0; i < originalWords.length; i++) {
      const word = originalWords[i];
      if (word[0] && word[0] === word[0].toUpperCase() && word.length > 1) {
        // Check if it's a known NPC
        const knownNPC = this.knownNPCs.find(
          (n) => n.name.toLowerCase().includes(word.toLowerCase())
        );
        if (knownNPC) return knownNPC.name;
      }
    }

    // Check for location references
    const locationWords = ['north', 'south', 'east', 'west', 'up', 'down',
      'forward', 'back', 'left', 'right', 'inside', 'outside',
      'door', 'gate', 'path', 'road', 'building', 'house',
    ];
    for (const loc of locationWords) {
      if (words.includes(loc)) return loc;
    }

    // Check for item references in inventory
    for (const item of this.knownItems) {
      const itemName = item.name.toLowerCase();
      if (fullText.includes(itemName) || words.some((w) => itemName.includes(w))) {
        return item.name;
      }
    }

    // Check scene context for present NPCs
    if (this.sceneContext) {
      for (const npcId of this.sceneContext.presentNPCs) {
        const npc = this.knownNPCs.find((n) => n.id === npcId);
        if (npc && fullText.includes(npc.name.toLowerCase())) {
          return npc.name;
        }
      }
    }

    // Fallback: return the word after the action verb if it exists
    const actionKeywords = ACTION_KEYWORDS[action] ?? [];
    for (const keyword of actionKeywords) {
      const idx = fullText.indexOf(keyword);
      if (idx >= 0) {
        const after = fullText.slice(idx + keyword.length).trim();
        const firstWord = after.split(/\s+/)[0];
        if (firstWord && firstWord.length > 2) {
          return firstWord;
        }
      }
    }

    return undefined;
  }

  /** Resolve target string to entity ID */
  private resolveTargetId(target: string | undefined, action: ActionType): EntityId | undefined {
    if (!target) return undefined;
    const targetLower = target.toLowerCase();

    // Check NPCs
    const npc = this.knownNPCs.find(
      (n) =>
        n.name.toLowerCase() === targetLower ||
        n.name.toLowerCase().includes(targetLower) ||
        targetLower.includes(n.name.toLowerCase())
    );
    if (npc) return npc.id;

    // Check locations
    const loc = this.knownLocations.find(
      (l) =>
        l.name.toLowerCase() === targetLower ||
        l.name.toLowerCase().includes(targetLower)
    );
    if (loc) return loc.id;

    // Check items
    const item = this.knownItems.find(
      (i) =>
        i.name.toLowerCase() === targetLower ||
        i.name.toLowerCase().includes(targetLower)
    );
    if (item) return item.id;

    return undefined;
  }

  // =============================================================================
  // DOMAIN DETECTION
  // =============================================================================

  /** Detect the domain of the action */
  private detectDomain(words: string[], action: ActionType, fullText: string): Domain {
    // Check explicit domain keywords
    for (const [keyword, domain] of Object.entries(DOMAIN_KEYWORDS)) {
      if (fullText.includes(keyword)) return domain;
    }

    // Infer from action type
    const actionDomainMap: Record<ActionType, Domain> = {
      destroy: DOMAINS.COMBAT,
      create: DOMAINS.CRAFT,
      persuade: DOMAINS.SOCIAL,
      investigate: DOMAINS.LORE,
      flee: DOMAINS.STEALTH,
      bargain: DOMAINS.SOCIAL,
      speak: DOMAINS.SOCIAL,
      examine: DOMAINS.LORE,
      use: DOMAINS.PHYSICAL,
      go: DOMAINS.WILDERNESS,
      help: DOMAINS.SOCIAL,
      attack: DOMAINS.COMBAT,
      defend: DOMAINS.COMBAT,
      evade: DOMAINS.STEALTH,
      manipulate: DOMAINS.INTRIGUE,
      perceive: DOMAINS.LORE,
      craft_action: DOMAINS.CRAFT,
      ritual: DOMAINS.METAPHYSICAL,
      rest: DOMAINS.PHYSICAL,
      wait: DOMAINS.LORE,
      unknown: DOMAINS.LORE,
    };

    return actionDomainMap[action] ?? DOMAINS.LORE;
  }

  // =============================================================================
  // STAT SUGGESTION
  // =============================================================================

  /** Suggest the primary stat for resolving this action */
  suggestStat(action: ActionType, domain: Domain): CoreStat {
    // Action-specific mapping
    const actionStatMap: Partial<Record<ActionType, CoreStat>> = {
      destroy: 'ruin',
      create: 'creation',
      persuade: 'presence',
      investigate: 'sense',
      flee: 'grace',
      bargain: 'mind',
      speak: 'presence',
      examine: 'sense',
      use: 'mind',
      go: 'grace',
      help: 'creation',
      attack: 'body',
      defend: 'will',
      evade: 'grace',
      manipulate: 'mind',
      perceive: 'sense',
      craft_action: 'creation',
      ritual: 'will',
      rest: 'will',
      wait: 'sense',
    };

    if (actionStatMap[action]) return actionStatMap[action]!;

    // Domain fallback
    const domainStatMap: Record<string, CoreStat> = {
      physical: 'body',
      social: 'presence',
      metaphysical: 'will',
      combat: 'body',
      craft: 'creation',
      stealth: 'grace',
      lore: 'mind',
      wilderness: 'sense',
      intrigue: 'mind',
    };

    return domainStatMap[domain] ?? 'sense';
  }

  // =============================================================================
  // AMBIGUITY DETECTION
  // =============================================================================

  /** Detect if the input is ambiguous */
  private detectAmbiguity(words: string[], action: ActionType, target: string | undefined): boolean {
    // Ambiguous if: unknown action, no target for action that needs one, very short input
    if (action === ACTION_TYPES.UNKNOWN) return true;
    if (words.length <= 1) return true;
    if (words.length <= 2 && action !== ACTION_TYPES.WAIT && action !== ACTION_TYPES.REST) return true;

    // Check if target is needed but missing
    const needsTarget: ActionType[] = [
      ACTION_TYPES.ATTACK, ACTION_TYPES.SPEAK, ACTION_TYPES.USE,
      ACTION_TYPES.GO, ACTION_TYPES.HELP, ACTION_TYPES.BARGAIN,
    ];
    if ((needsTarget as string[]).includes(action as string) && !target) return true;

    return false;
  }

  // =============================================================================
  // ALTERNATIVE GENERATION
  // =============================================================================

  /** Generate alternative interpretations for ambiguous input */
  private generateAlternatives(
    primaryAction: ActionType,
    words: string[],
    fullText: string
  ): AlternativeIntent[] {
    const alternatives: AlternativeIntent[] = [];

    // Find the top 3 most likely alternative actions
    const actionScores: { action: ActionType; score: number }[] = [];
    for (const [action, keywords] of Object.entries(ACTION_KEYWORDS)) {
      if (action === primaryAction) continue;
      if (action === 'unknown') continue;

      let score = 0;
      for (const keyword of keywords) {
        if (keyword.includes(' ') && fullText.includes(keyword)) {
          score += 5;
        } else if (words.includes(keyword)) {
          score += 3;
        }
      }
      if (score > 0) actionScores.push({ action: action as ActionType, score });
    }

    actionScores.sort((a, b) => b.score - a.score);

    for (let i = 0; i < Math.min(2, actionScores.length); i++) {
      const alt = actionScores[i];
      alternatives.push({
        action: alt.action,
        target: undefined,
        confidence: alt.score / 10,
        reason: `Alternative keyword match`,
      });
    }

    // If input is very short, add some generic alternatives
    if (words.length <= 2) {
      if (primaryAction !== ACTION_TYPES.EXAMINE) {
        alternatives.push({
          action: ACTION_TYPES.EXAMINE,
          target: 'surroundings',
          confidence: 0.3,
          reason: 'Short input could be examining surroundings',
        });
      }
    }

    return alternatives;
  }

  // =============================================================================
  // ENTITY EXTRACTION
  // =============================================================================

  /** Extract mentioned items from words */
  private extractItems(words: string[]): string[] {
    const items: string[] = [];
    for (const item of this.knownItems) {
      const nameWords = item.name.toLowerCase().split(/\s+/);
      for (const nw of nameWords) {
        if (words.includes(nw.toLowerCase())) {
          items.push(item.name);
          break;
        }
      }
    }
    return [...new Set(items)];
  }

  /** Extract mentioned NPCs from words */
  private extractNPCs(words: string[]): string[] {
    const npcs: string[] = [];
    for (const npc of this.knownNPCs) {
      const nameWords = npc.name.toLowerCase().split(/\s+/);
      for (const nw of nameWords) {
        if (nw.length > 2 && words.includes(nw.toLowerCase())) {
          npcs.push(npc.name);
          break;
        }
      }
    }
    return [...new Set(npcs)];
  }

  /** Extract mentioned locations from words */
  private extractLocations(words: string[]): string[] {
    const locations: string[] = [];

    // Check direction words
    const dirs = ['north', 'south', 'east', 'west', 'up', 'down', 'inside', 'outside'];
    for (const d of dirs) {
      if (words.includes(d)) locations.push(d);
    }

    // Check known locations
    for (const loc of this.knownLocations) {
      const nameWords = loc.name.toLowerCase().split(/\s+/);
      for (const nw of nameWords) {
        if (nw.length > 2 && words.includes(nw.toLowerCase())) {
          locations.push(loc.name);
          break;
        }
      }
    }

    return [...new Set(locations)];
  }

  // =============================================================================
  // MODIFIER EXTRACTION
  // =============================================================================

  /** Extract action modifiers */
  private extractModifiers(words: string[]): string[] {
    const modifierWords: Record<string, string> = {
      quickly: 'quickly', carefully: 'carefully', quietly: 'quietly',
      loudly: 'loudly', slowly: 'slowly', forcefully: 'forcefully',
      gently: 'gently', secretly: 'secretly', openly: 'openly',
      violently: 'violently,', calmly: 'calmly', desperately: 'desperately',
      'with care': 'carefully', 'with haste': 'quickly', 'in secret': 'secretly',
      fast: 'quickly', silent: 'quietly', cautious: 'carefully',
    };

    const modifiers: string[] = [];
    for (const word of words) {
      if (modifierWords[word]) modifiers.push(modifierWords[word]);
    }

    // Check for phrases
    const fullText = words.join(' ');
    if (fullText.includes('with care')) modifiers.push('carefully');
    if (fullText.includes('in haste') || fullText.includes('with haste')) modifiers.push('quickly');

    return [...new Set(modifiers)];
  }

  // =============================================================================
  // EMOTIONAL TONE
  // =============================================================================

  /** Detect the emotional tone of the input */
  private detectEmotionalTone(words: string[]): string {
    const scores: Record<string, number> = {};

    for (const [tone, keywords] of Object.entries(EMOTIONAL_TONES)) {
      let score = 0;
      for (const keyword of keywords) {
        if (words.includes(keyword)) score += 2;
      }
      if (score > 0) scores[tone] = score;
    }

    let bestTone = 'neutral';
    let bestScore = 0;
    for (const [tone, score] of Object.entries(scores)) {
      if (score > bestScore) {
        bestScore = score;
        bestTone = tone;
      }
    }

    return bestTone;
  }

  // =============================================================================
  // CONFIDENCE CALCULATION
  // =============================================================================

  /** Calculate overall confidence in the interpretation */
  private calculateConfidence(
    action: ActionType,
    target: string | undefined,
    words: string[],
    fullText: string,
    ambiguous: boolean
  ): number {
    let confidence = 0.5;

    // Boost for known action
    if (action !== ACTION_TYPES.UNKNOWN) confidence += 0.2;

    // Boost for resolved target
    if (target) confidence += 0.15;

    // Boost for longer input (more context)
    confidence += Math.min(0.1, words.length * 0.01);

    // Penalty for ambiguity
    if (ambiguous) confidence -= 0.3;

    // Boost for direct keyword matches
    const keywords = ACTION_KEYWORDS[action] ?? [];
    for (const kw of keywords) {
      if (fullText.includes(kw)) {
        confidence += 0.05;
        break;
      }
    }

    return Math.max(0, Math.min(1, confidence));
  }

  // =============================================================================
  // BATCH / HELPER METHODS
  // =============================================================================

  /**
   * Interpret multiple inputs and return the most confident.
   * Useful for disambiguation UIs.
   */
  interpretMultiple(inputs: string[]): { intent: Intent; index: number } | null {
    let bestIntent: Intent | null = null;
    let bestIndex = -1;
    let bestConfidence = 0;

    for (let i = 0; i < inputs.length; i++) {
      const intent = this.interpret(inputs[i]);
      if (intent.confidence > bestConfidence) {
        bestConfidence = intent.confidence;
        bestIntent = intent;
        bestIndex = i;
      }
    }

    return bestIntent ? { intent: bestIntent, index: bestIndex } : null;
  }

  /** Quick check if input is a game command (save, load, etc.) */
  isGameCommand(input: string): { isCommand: boolean; command?: string; args?: string[] } {
    const normalized = input.toLowerCase().trim();
    const commands = ['save', 'load', 'quit', 'exit', 'inventory', 'status',
      'journal', 'help', 'settings', 'undo', 'debug',
    ];

    for (const cmd of commands) {
      if (normalized === cmd || normalized.startsWith(cmd + ' ')) {
        const parts = normalized.split(/\s+/);
        return { isCommand: true, command: parts[0], args: parts.slice(1) };
      }
    }

    return { isCommand: false };
  }

  /** Get all recognized actions */
  getRecognizedActions(): ActionType[] {
    return Object.values(ACTION_TYPES).filter((a) => a !== 'unknown');
  }

  /** Get keywords for a specific action */
  getActionKeywords(action: ActionType): string[] {
    return [...(ACTION_KEYWORDS[action] ?? [])];
  }

  /** Get suggested actions for a target */
  getSuggestedActionsForTarget(targetName: string): ActionType[] {
    const suggestions: ActionType[] = [];

    const npc = this.knownNPCs.find(
      (n) => n.name.toLowerCase() === targetName.toLowerCase()
    );
    if (npc) {
      suggestions.push(ACTION_TYPES.SPEAK);
      suggestions.push(ACTION_TYPES.EXAMINE);
      if (npc.disposition !== 'hateful') suggestions.push(ACTION_TYPES.HELP);
      if (npc.disposition === 'hateful' || npc.disposition === 'unfriendly') {
        suggestions.push(ACTION_TYPES.ATTACK);
      }
    }

    const item = this.knownItems.find(
      (i) => i.name.toLowerCase() === targetName.toLowerCase()
    );
    if (item) {
      suggestions.push(ACTION_TYPES.USE);
      suggestions.push(ACTION_TYPES.EXAMINE);
    }

    return [...new Set(suggestions)];
  }
}

// =============================================================================
// STATICS
// =============================================================================

/** Quick interpret function for simple use cases */
export function quickInterpret(
  input: string,
  sceneContext?: Scene,
  npcs?: NPC[],
  locations?: Location[],
  items?: Item[]
): Intent {
  const interpreter = new InputInterpreter();
  if (sceneContext) interpreter.setSceneContext(sceneContext);
  if (npcs || locations || items) {
    interpreter.setKnownEntities(locations ?? [], npcs ?? [], items ?? []);
  }
  return interpreter.interpret(input);
}
