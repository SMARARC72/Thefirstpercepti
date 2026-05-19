/**
 * ============================================================================
 * NARRATOR ENGINE - The First Perception RPG
 * ============================================================================
 * Narrative generation: state-to-prose conversion, tone management,
 * style validation, suggested actions, journal entries, world pulse prose,
 * death narration, NPC dialogue generation.
 *
 * @module engine/Narrator
 * @version 1.0.0
 * ============================================================================
 */

import {
  Scene,
  Player,
  Location,
  NPC,
  Region,
  Faction,
  RollResult,
  WorldPulse,
  JournalEntry,
  DeathRecord,
  Condition,
  EnvironmentState,
  SuggestedAction,
  WeatherState,
  StyleConstraints,
  DEFAULT_STYLE_CONSTRAINTS,
  RESULT_BANDS,
  RESULT_BAND_NAMES,
  EMOTIONAL_STATES,
  DISPOSITIONS,
  SCENE_TYPES,
  CORE_STATS,
} from '../types';
import { DiceEngine } from './DiceEngine';
import { Stakes } from './RulesEngine';

// =============================================================================
// NARRATIVE FRAGMENTS
// =============================================================================

/** Pre-written atmospheric opening phrases */
const OPENING_PHRASES: Record<string, string[]> = {
  exploration: [
    'The place unfolds before you, each detail demanding attention.',
    'You take in your surroundings. The world makes its impression.',
    'New ground. New possibilities. New dangers.',
    'The space around you speaks in textures and shadows.',
  ],
  dialogue: [
    'Words hang in the air between you, heavy with intention.',
    'The conversation shapes itself around what is said and unsaid.',
    'Silence precedes speech. Then, the exchange begins.',
  ],
  combat: [
    'Violence unfolds in increments of breath and steel.',
    'The moment before impact stretches. Then everything moves at once.',
    'There is no time for thought. Only action and consequence.',
  ],
  investigation: [
    'Details emerge slowly, each one a piece of a larger puzzle.',
    'You search. The world yields what it chooses to yield.',
    'Attention is a tool. You apply it carefully.',
  ],
  ritual: [
    'The air thickens. Something listens from beyond the veil.',
    'Power gathers, shaped by will and word.',
    'The boundary between what is and what could be grows thin.',
  ],
  transition: [
    'One place fades. Another takes its place.',
    'The journey changes you, increment by increment.',
    'Movement is its own form of narrative.',
  ],
};

/** Sensory detail generators */
const SENSORY_DETAILS: Record<string, string[]> = {
  sight: [
    'shadows pool in the corners',
    'dust motes hang in pale light',
    'movement flickers at the edge of vision',
    'colors are muted, washed by time',
    'something is reflected where it should not be',
    'the architecture speaks of before',
  ],
  sound: [
    'distant echoes of indeterminate origin',
    'the creak of settling stone',
    'something drips, rhythmic and patient',
    'breathing that is not yours',
    'the wind carries sounds from elsewhere',
    'silence, which is its own sound',
  ],
  smell: [
    'old stone and older dust',
    'something faintly metallic',
    'the memory of incense or smoke',
    'damp, like underground places',
    'nothing at all, which is strange',
    'faint rot, held at bay',
  ],
  touch: [
    'the air is cold against exposed skin',
    'a vibration through the floor',
    'texture of rough stone under fingertips',
    'stillness so complete it has weight',
    'the prickle of being watched',
    'humidity that clings to everything',
  ],
  taste: [
    'copper on the tongue',
    'the dryness of held breath',
    'dust that settles without invitation',
    'nothing but the taste of your own mouth',
  ],
};

// =============================================================================
// NARRATOR ENGINE
// =============================================================================

/**
 * The Narrator generates atmospheric prose from game state.
 * It manages tone, validates style constraints, and produces
 * scene descriptions, dialogue, and world pulse summaries.
 */
export class Narrator {
  private style: StyleConstraints;
  private dice: DiceEngine;

  constructor(diceEngine: DiceEngine, style?: StyleConstraints) {
    this.dice = diceEngine;
    this.style = style ? { ...style } : { ...DEFAULT_STYLE_CONSTRAINTS };
  }

  /** Update style constraints */
  setStyle(style: Partial<StyleConstraints>): void {
    this.style = { ...this.style, ...style };
  }

  // =============================================================================
  // SCENE NARRATION
  // =============================================================================

  /**
   * Generate a complete scene narrative from the current state.
   */
  narrateScene(context: {
    scene: Scene;
    player: Player;
    location: Location;
    region: Region;
    presentNPCs: NPC[];
    lastActionResult?: { roll: RollResult; narrative: string };
    recentEvents: string[];
  }): string {
    const { scene, player, location, region, presentNPCs, lastActionResult, recentEvents } = context;

    const parts: string[] = [];

    // Opening
    parts.push(this.generateOpening(scene.type));

    // Location description
    parts.push(this.narrateLocation(location, player));

    // Environmental details
    parts.push(this.narrateEnvironment(location.environment, region));

    // NPC presence
    if (presentNPCs.length > 0) {
      parts.push(this.narrateNPCPresence(presentNPCs, player));
    }

    // Player condition
    if (player.conditions.length > 0) {
      parts.push(this.narrateConditionEffects(player.conditions));
    }

    // Last action result
    if (lastActionResult) {
      parts.push(lastActionResult.narrative);
    }

    // Recent events awareness
    if (recentEvents.length > 0) {
      parts.push(this.narrateEventAwareness(recentEvents));
    }

    // Suggested actions hint
    parts.push(this.generateSuggestedActionsHint(scene.availableActions));

    // Validate style
    let narrative = parts.filter((p) => p.length > 0).join('\n\n');
    narrative = this.validateStyle(narrative);

    return narrative;
  }

  /** Generate an opening line based on scene type */
  private generateOpening(sceneType: string): string {
    const phrases = OPENING_PHRASES[sceneType] ?? OPENING_PHRASES.exploration;
    return this.dice.pickRandom(phrases) ?? 'The scene unfolds.';
  }

  // =============================================================================
  // LOCATION NARRATION
  // =============================================================================

  /** Narrate a location's description */
  narrateLocation(location: Location, player: Player): string {
    let text = location.description;

    // Add discovered details
    if (location.explored) {
      text += ` You have explored this place thoroughly. You know its layout, its secrets, its moods.`;
    } else if (location.discovered) {
      text += ` There may be more to discover here.`;
    }

    // Add safety assessment
    if (location.safetyLevel <= 2) {
      text += ` Danger saturates this place. Every instinct screams caution.`;
    } else if (location.safetyLevel >= 8) {
      text += ` For now, this place offers a measure of safety. Rare and precious.`;
    }

    // Add landmarks
    if (location.landmarks.length > 0) {
      text += ` Notable: ${location.landmarks.join('. ')}.`;
    }

    return this.validateStyle(text);
  }

  // =============================================================================
  // ENVIRONMENT NARRATION
  // =============================================================================

  /** Narrate environmental conditions */
  narrateEnvironment(environment: EnvironmentState, region: Region): string {
    const parts: string[] = [];

    parts.push(`Light: ${environment.lighting}.`);
    parts.push(`Temperature: ${environment.temperature}.`);

    if (environment.atmosphere) {
      parts.push(environment.atmosphere);
    }

    // Add sensory details
    const sensoryRoll = this.dice.roll(6);
    const sense = ['sight', 'sound', 'smell', 'touch', 'taste', 'sight'][sensoryRoll - 1];
    const detail = this.dice.pickRandom(SENSORY_DETAILS[sense] ?? SENSORY_DETAILS.sight);
    if (detail) {
      parts.push(`${sense.charAt(0).toUpperCase() + sense.slice(1)}: ${detail}.`);
    }

    if (environment.sounds.length > 0) {
      parts.push(`You hear: ${environment.sounds.join(', ')}.`);
    }

    if (environment.effects.length > 0) {
      parts.push(`The air carries: ${environment.effects.join(', ')}.`);
    }

    return parts.join(' ');
  }

  // =============================================================================
  // NPC NARRATION
  // =============================================================================

  /** Narrate the presence of NPCs */
  narrateNPCPresence(npcs: NPC[], player: Player): string {
    const parts: string[] = [];

    for (const npc of npcs) {
      if (!npc.alive) continue;

      let presence = '';
      const disposition = npc.disposition;

      // Opening based on disposition
      switch (disposition) {
        case 'hateful':
          presence = `${npc.name} regards you with naked hatred. ${npc.description}`;
          break;
        case 'unfriendly':
          presence = `${npc.name} is here, and their posture suggests you are unwelcome. ${npc.description}`;
          break;
        case 'wary':
          presence = `${npc.name} watches you carefully, neither approaching nor retreating. ${npc.description}`;
          break;
        case 'indifferent':
          presence = `${npc.name} is present, absorbed in their own concerns. ${npc.description}`;
          break;
        case 'curious':
          presence = `${npc.name} notices you with evident interest. ${npc.description}`;
          break;
        case 'friendly':
          presence = `${npc.name} acknowledges you with something like warmth. ${npc.description}`;
          break;
        case 'loyal':
          presence = `${npc.name} stands near you, a familiar and welcome presence. ${npc.description}`;
          break;
        case 'devoted':
          presence = `${npc.name} is here, their attention fixed on you with unwavering devotion. ${npc.description}`;
          break;
        default:
          presence = `${npc.name} is here. ${npc.description}`;
      }

      // Add emotional state
      if (npc.emotionalState !== 'calm') {
        presence += ` They seem ${npc.emotionalState}.`;
      }

      // Add activity if schedule exists
      if (npc.schedule) {
        const hour = new Date().getHours(); // Use current time
        const activity = npc.schedule.entries[hour] ?? npc.schedule.defaultActivity;
        presence += ` Currently: ${activity}.`;
      }

      parts.push(presence);
    }

    return parts.join('\n\n');
  }

  /** Generate NPC dialogue */
  generateDialogue(npc: NPC, topic: string, player: Player): string {
    // Find matching dialogue topic
    const dialogueTopic = npc.dialogueTopics.find(
      (t) =>
        t.topic.toLowerCase() === topic.toLowerCase() ||
        topic.toLowerCase().includes(t.topic.toLowerCase())
    );

    if (dialogueTopic) {
      // Check disposition requirement
      if (dialogueTopic.requiredDisposition) {
        const dispositionOrder = ['hateful', 'unfriendly', 'wary', 'indifferent', 'curious', 'friendly', 'loyal', 'devoted'];
        const requiredIdx = dispositionOrder.indexOf(dialogueTopic.requiredDisposition);
        const currentIdx = dispositionOrder.indexOf(npc.disposition);
        if (currentIdx < requiredIdx) {
          return `${npc.name} looks away. "I do not know you well enough to speak of such things."`;
        }
      }

      return `${npc.name} speaks, ${npc.voice}:\n\n"${dialogueTopic.response}"`;
    }

    // Generic response based on disposition
    const genericResponses: Record<string, string[]> = {
      hateful: ['"Leave me be."', '"I have nothing to say to you."', '"Your presence offends."'],
      unfriendly: ['"What do you want?"', '"Make it quick."', '"I am busy."'],
      wary: ['"Perhaps. What is your interest?"', '"I might know something."', '"Speak carefully."'],
      indifferent: ['"Hmm?"', '"I suppose I can talk."', '"What of it?"'],
      curious: ['"Interesting that you ask."', '"I have wondered about that myself."', '"Tell me what you know first."'],
      friendly: ['"Good to see you."', '"Ask what you will."', '"I will help if I can."'],
      loyal: ['"For you, anything."', '"I was hoping you would ask."', '"Always at your service."'],
      devoted: ['"Your word is my command."', '"I live to answer your questions."', '"Anything for you. Always."'],
    };

    const responses = genericResponses[npc.disposition] ?? genericResponses.indifferent;
    return `${npc.name}: ${this.dice.pickRandom(responses) ?? '"..."'}`;
  }

  // =============================================================================
  // CONDITION NARRATION
  // =============================================================================

  /** Narrate the effects of conditions on the player */
  narrateConditionEffects(conditions: Condition[]): string {
    const parts: string[] = [];

    for (const condition of conditions) {
      switch (condition.type) {
        case 'injured':
          parts.push(`A dull ache reminds you of your injuries. Every movement costs.`);
          break;
        case 'wounded':
          parts.push(`Your wounds throb with each heartbeat. Blood has dried on your clothes.`);
          break;
        case 'critical':
          parts.push(`You are gravely wounded. The world pulses at the edges of your vision.`);
          break;
        case 'exhausted':
          parts.push(`Exhaustion weighs on you like a second skin. Each step requires deliberation.`);
          break;
        case 'poisoned':
          parts.push(`Something wrong courses through you. Your veins feel hot, then cold.`);
          break;
        case 'cursed':
          parts.push(`The curse is a constant companion now. You feel it watching through your own eyes.`);
          break;
        case 'frightened':
          parts.push(`Fear sits in your chest, a bird with iron wings. Every shadow threatens.`);
          break;
        case 'blessed':
          parts.push(`A warmth suffuses you, faint but certain. Something favors you.`);
          break;
        case 'empowered':
          parts.push(`Strength flows through you, borrowed or earned. You feel capable of more.`);
          break;
        case 'hidden':
          parts.push(`You move in shadow, unseen. The feeling is isolating and liberating.`);
          break;
        case 'marked':
          parts.push(`The mark on you pulses faintly. Those who know what to look for will see.`);
          break;
        case 'haunted':
          parts.push(`Something follows you. Not quite here, not quite elsewhere. You feel its attention.`);
          break;
      }
    }

    return parts.join('\n');
  }

  // =============================================================================
  // ROLL RESULT NARRATION
  // =============================================================================

  /** Narrate a roll result */
  narrateRollResult(roll: RollResult, stakes: Stakes): string {
    const bandName = RESULT_BAND_NAMES[roll.band];
    let narrative = '';

    switch (roll.band) {
      case RESULT_BANDS.CRITICAL_FAILURE:
        narrative = `Critical failure. ${stakes.criticalFailure}`;
        break;
      case RESULT_BANDS.FAILURE:
        narrative = `Failure. ${stakes.failure}`;
        break;
      case RESULT_BANDS.PARTIAL_FAILURE:
        narrative = `Partial failure. ${stakes.partialFailure}`;
        break;
      case RESULT_BANDS.SUCCESS_WITH_COST:
        narrative = `Success, but at a price. ${stakes.successWithCost}`;
        if (roll.cost) {
          narrative += ` Cost: ${roll.cost.description}`;
        }
        break;
      case RESULT_BANDS.CLEAN_SUCCESS:
        narrative = `Clean success. ${stakes.cleanSuccess}`;
        break;
      case RESULT_BANDS.STRONG_SUCCESS:
        narrative = `Strong success! ${stakes.strongSuccess}`;
        break;
      case RESULT_BANDS.CRITICAL_SUCCESS:
        narrative = `Critical success! ${stakes.strongSuccess} More than you dared hope.`;
        break;
    }

    return this.validateStyle(narrative);
  }

  // =============================================================================
  // WORLD PULSE NARRATION
  // =============================================================================

  /** Generate prose from a world pulse */
  narrateWorldPulse(pulse: WorldPulse): string {
    const parts: string[] = [];

    parts.push(`--- Day ${pulse.day} ---`);

    if (pulse.factionMovements.length > 0) {
      parts.push(`The powers shift: ${pulse.factionMovements.join('; ')}.`);
    }

    if (pulse.npcActivities.length > 0) {
      parts.push(`People move through their patterns: ${pulse.npcActivities.join('; ')}.`);
    }

    if (pulse.economicShifts.length > 0) {
      parts.push(`The flow of goods and coin changes: ${pulse.economicShifts.join('; ')}.`);
    }

    if (pulse.weatherChanges.length > 0) {
      parts.push(`The sky: ${pulse.weatherChanges.join('. ')}.`);
    }

    if (pulse.diseaseUpdates.length > 0) {
      parts.push(`Word of sickness: ${pulse.diseaseUpdates.join('; ')}.`);
    }

    if (pulse.newRumors.length > 0) {
      parts.push(`New whispers circulate: ${pulse.newRumors.join('; ')}.`);
    }

    if (pulse.consequenceWarnings.length > 0) {
      parts.push(`A sense of impending change: ${pulse.consequenceWarnings.join('; ')}.`);
    }

    parts.push(`The mood of the world: ${pulse.overallMood}.`);

    return this.validateStyle(parts.join('\n\n'));
  }

  // =============================================================================
  // DEATH NARRATION
  // =============================================================================

  /** Generate death narration */
  narrateDeath(record: DeathRecord): string {
    const parts: string[] = [];

    parts.push(`--- ${record.characterName} Has Fallen ---`);
    parts.push(`Day ${record.day}.`);

    switch (record.deathVector) {
      case 'violence':
        parts.push(`${record.characterName} died as they lived: fighting. The last blow fell, and they did not rise.`);
        break;
      case 'disease':
        parts.push(`Sickness claimed ${record.characterName}. The body fails, no matter the will that drives it.`);
        break;
      case 'starvation':
        parts.push(`Hunger ended ${record.characterName}. In the end, the world could not provide what was needed.`);
        break;
      case 'madness':
        parts.push(`${record.characterName}'s mind broke. What remained was no longer them. The Shattering claims another.`);
        break;
      case 'betrayal':
        parts.push(`Trust killed ${record.characterName}. Someone they believed in proved false. The blade was sharp.`);
        break;
      case 'ritual':
        parts.push(`The ritual consumed ${record.characterName}. They reached too far, and something reached back.`);
        break;
      case 'time':
        parts.push(`Time, patient and merciless, finally took ${record.characterName}.`);
        break;
      case 'authority_collapse':
        parts.push(`The weight of command crushed ${record.characterName}. Power has its price.`);
        break;
      default:
        parts.push(`${record.characterName} has died. The Shattered Reach grows quieter.`);
    }

    parts.push(`They took ${record.actionsTaken} actions in this world.`);

    if (record.legacy.active) {
      parts.push(`Their legacy: ${record.legacy.description}`);
    } else {
      parts.push(`They leave nothing behind but memory, and even that will fade.`);
    }

    return this.validateStyle(parts.join('\n\n'));
  }

  // =============================================================================
  // JOURNAL ENTRY GENERATION
  // =============================================================================

  /** Generate a journal entry from an action */
  generateJournalEntry(context: {
    player: Player;
    action: string;
    result: string;
    day: number;
    hour: number;
  }): JournalEntry {
    const { player, action, result, day, hour } = context;

    return {
      id: `journal_${Date.now()}`,
      timestamp: Date.now(),
      text: `Day ${day}, hour ${hour}: ${action}\n\n${result}`,
      day,
      timeOfDay: hour,
      entryType: 'action',
      relatedEntityIds: [],
      isPlayerWritten: true,
    };
  }

  // =============================================================================
  // SUGGESTED ACTIONS
  // =============================================================================

  /** Generate suggested actions for the current scene */
  generateSuggestedActions(context: {
    player: Player;
    location: Location;
    presentNPCs: NPC[];
    knownConnections: { name: string; description: string }[];
  }): SuggestedAction[] {
    const { player, location, presentNPCs, knownConnections } = context;
    const actions: SuggestedAction[] = [];

    // Examine surroundings (always available)
    actions.push({
      description: 'Examine your surroundings more closely.',
      actionType: 'examine',
      estimatedDifficulty: 'easy',
      consequenceHint: 'May reveal hidden details or dangers.',
    });

    // Interact with NPCs
    for (const npc of presentNPCs) {
      if (!npc.alive) continue;

      if (npc.disposition === 'hateful' || npc.disposition === 'unfriendly') {
        actions.push({
          description: `Confront or avoid ${npc.name}.`,
          actionType: 'speak',
          target: npc.name,
          estimatedDifficulty: 'hard',
          consequenceHint: 'Risk of escalation to violence.',
        });
      } else {
        actions.push({
          description: `Speak with ${npc.name}.`,
          actionType: 'speak',
          target: npc.name,
          estimatedDifficulty: 'moderate',
          consequenceHint: 'May gain information or alliance.',
        });
      }
    }

    // Movement
    for (const conn of knownConnections) {
      actions.push({
        description: `Go to ${conn.name}.`,
        actionType: 'go',
        target: conn.name,
        estimatedDifficulty: 'easy',
        consequenceHint: conn.description,
      });
    }

    // Rest if injured/exhausted
    if (player.conditions.some((c) => ['injured', 'wounded', 'exhausted'].includes(c.type))) {
      actions.push({
        description: 'Rest and recover.',
        actionType: 'rest',
        estimatedDifficulty: 'easy',
        consequenceHint: 'Recovers stamina but time passes.',
      });
    }

    // Investigate if unexplored
    if (!location.explored) {
      actions.push({
        description: 'Explore the area thoroughly.',
        actionType: 'investigate',
        estimatedDifficulty: 'moderate',
        consequenceHint: 'May find items, clues, or dangers.',
      });
    }

    // Use inventory items
    for (const item of player.inventory) {
      if (item.equipped) continue;
      actions.push({
        description: `Use ${item.name}.`,
        actionType: 'use',
        target: item.name,
        estimatedDifficulty: 'easy',
      });
    }

    return actions.slice(0, 6); // Max 6 suggestions
  }

  /** Generate hint text for suggested actions */
  private generateSuggestedActionsHint(suggestedActions: SuggestedAction[]): string {
    if (suggestedActions.length === 0) return '';

    const actionList = suggestedActions
      .map((a) => a.description)
      .join(' / ');

    return `You could: ${actionList}.`;
  }

  // =============================================================================
  // EVENT AWARENESS
  // =============================================================================

  /** Narrate the player's awareness of recent events */
  private narrateEventAwareness(recentEvents: string[]): string {
    if (recentEvents.length === 0) return '';
    return `Recent events weigh on your mind: ${recentEvents.join('; ')}.`;
  }

  // =============================================================================
  // STYLE VALIDATION
  // =============================================================================

  /**
   * Validate and correct narrative prose against style constraints.
   * Removes prohibited patterns, adjusts tone.
   */
  validateStyle(text: string): string {
    if (!text) return '';

    let corrected = text;

    // Remove purple prose indicators
    const purplePatterns = [
      /\b(verily|forsooth|lo\b|hark|betwixt|thou|thee|thy\b|ere\b|o'er|neath|list\b)\b/gi,
    ];
    for (const pattern of purplePatterns) {
      corrected = corrected.replace(pattern, (match) => {
        const replacements: Record<string, string> = {
          verily: 'truly', forsooth: 'indeed', lo: 'look', hark: 'listen',
          betwixt: 'between', thou: 'you', thee: 'you', thy: 'your',
          ere: 'before', oer: 'over', neath: 'beneath', list: 'listen',
        };
        return replacements[match.toLowerCase()] ?? match;
      });
    }

    // Remove modern slang / memes
    const slangPatterns = [
      /\b(lol|omg|wtf|tbh|imo|smh|bruh|fam|yeet|sus|cringe|based|goat|rent free|living my best life|vibe check)\b/gi,
    ];
    for (const pattern of slangPatterns) {
      corrected = corrected.replace(pattern, '');
    }

    // Remove anachronisms
    const anachronisms = [
      /\b(phone|computer|internet|electricity|car|train|airplane|photo|camera|plastic|microwave)\b/gi,
    ];
    for (const pattern of anachronisms) {
      // Replace rather than remove
      corrected = corrected.replace(pattern, (match) => `[${match} - anachronism removed]`);
    }

    // Remove fourth-wall breaks
    const fourthWallPatterns = [
      /\b(you are playing a game|this is a game|the player|the gm|the game master)\b/gi,
    ];
    for (const pattern of fourthWallPatterns) {
      corrected = corrected.replace(pattern, '');
    }

    // Clean up double spaces and empty lines
    corrected = corrected.replace(/\s+/g, ' ').trim();

    // Limit paragraph length
    corrected = this.limitParagraphLength(corrected);

    return corrected;
  }

  /** Break overly long paragraphs */
  private limitParagraphLength(text: string): string {
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [text];
    const paragraphs: string[] = [];
    let currentParagraph = '';

    for (const sentence of sentences) {
      if (currentParagraph.length + sentence.length > this.style.maxParagraphLength) {
        if (currentParagraph) paragraphs.push(currentParagraph.trim());
        currentParagraph = sentence;
      } else {
        currentParagraph += sentence;
      }
    }
    if (currentParagraph) paragraphs.push(currentParagraph.trim());

    return paragraphs.join('\n\n');
  }

  /** Check if text passes style validation */
  checkStyle(text: string): { passes: boolean; issues: string[] } {
    const issues: string[] = [];

    // Check for purple prose
    const purpleWords = ['verily', 'forsooth', 'lo', 'hark', 'betwixt', 'ere', 'list'];
    for (const word of purpleWords) {
      if (text.toLowerCase().includes(word)) issues.push(`Purple prose: "${word}"`);
    }

    // Check for memes/slang
    const slangWords = ['lol', 'omg', 'wtf', 'bruh', 'fam', 'yeet', 'sus'];
    for (const word of slangWords) {
      if (text.toLowerCase().includes(word)) issues.push(`Modern slang: "${word}"`);
    }

    // Check sentence complexity
    const sentences = text.match(/[^.!?]+[.!?]+/g) ?? [];
    for (const sentence of sentences) {
      const words = sentence.split(/\s+/);
      if (words.length > 30) issues.push(`Overly complex sentence (${words.length} words)`);
    }

    // Check for telling vs showing
    const tellingPhrases = ['felt sad', 'was angry', 'felt happy', 'was scared', 'felt tired'];
    for (const phrase of tellingPhrases) {
      if (text.toLowerCase().includes(phrase)) issues.push(`Telling not showing: "${phrase}"`);
    }

    return { passes: issues.length === 0, issues };
  }

  // =============================================================================
  // UTILITY
  // =============================================================================

  /** Generate a weather description */
  narrateWeather(weather: WeatherState, intensity: number): string {
    const descriptions: Record<string, string> = {
      clear: 'The sky is clear, which feels almost wrong in this broken world.',
      overcast: 'Grey clouds blanket the sky, neither threatening nor promising.',
      light_rain: 'Rain falls softly, a persistent whisper against stone and skin.',
      heavy_rain: 'Rain pounds down, turning paths to mud and vision to guesswork.',
      storm: 'The storm rages. Lightning reveals the world in brief, violent snapshots.',
      fog: 'Fog has swallowed the distance. Everything beyond arm\'s reach is speculation.',
      snow: 'Snow falls, soft and silent, covering scars with temporary white.',
      blizzard: 'Snow flies sideways, driven by wind that cuts like blades.',
      drought: 'The air is dust-dry. Nothing moves that does not have to.',
      haze: 'A haze hangs in the air, making the world indistinct and dreamlike.',
      blood_rain: 'The rain is red. No one speaks of it, but everyone sees.',
      stillness: 'The air is perfectly still. Not a breath of wind. The silence is unnatural.',
    };

    let desc = descriptions[weather] ?? 'The weather is indeterminate.';

    if (intensity > 7) desc += ' The intensity is severe. Travel and action are hindered.';
    else if (intensity > 4) desc += ' Conditions are challenging.';

    return desc;
  }

  /** Generate time-of-day description */
  narrateTimeOfDay(hour: number): string {
    if (hour >= 5 && hour < 8) return 'Dawn. The world emerges from darkness, slowly.';
    if (hour >= 8 && hour < 12) return 'Morning. Activity stirs across the Shattered Reach.';
    if (hour >= 12 && hour < 14) return 'Midday. Light falls hardest. Shadows shrink to nothing.';
    if (hour >= 14 && hour < 17) return 'Afternoon. The day stretches toward its end.';
    if (hour >= 17 && hour < 20) return 'Evening. Light bleeds from the sky.';
    if (hour >= 20 && hour < 23) return 'Night. Darkness claims what the day has abandoned.';
    return 'The deep of night. Even the restless have sought shelter.';
  }

  /** Generate a faction stance description */
  narrateFactionStance(faction: Faction, playerName: string): string {
    const stanceDescriptions: Record<string, string> = {
      hostile: `${faction.name} considers ${playerName} an enemy. Avoid them or prepare for conflict.`,
      suspicious: `${faction.name} watches ${playerName} carefully. Trust must be earned.`,
      cautious: `${faction.name} is wary of ${playerName}. They neither trust nor reject.`,
      neutral: `${faction.name} has no particular stance toward ${playerName}.`,
      friendly: `${faction.name} views ${playerName} favorably. They may offer aid.`,
      allied: `${faction.name} and ${playerName} are allied. They have common cause.`,
      subservient: `${faction.name} defers to ${playerName}. A rare and potentially unstable position.`,
      dominant: `${faction.name} claims authority over ${playerName}. Be cautious.`,
    };

    return stanceDescriptions[faction.playerStance] ?? `${faction.name}'s stance is unclear.`;
  }
}
