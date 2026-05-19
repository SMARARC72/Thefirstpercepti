/**
 * ============================================================================
 * FIXTURES - The First Perception RPG
 * ============================================================================
 * Complete fixture data for the game engine:
 * - All enum definitions with labels and descriptions
 * - Sample world: Greywake Market District scenario
 * - 3 factions with full stats (Chain, Chorus, Ledger)
 * - 5 NPCs with complete profiles
 * - Starting items, abilities, traits
 * - Sample scenes
 * - Sample events
 * - Default game configuration
 *
 * @module engine/fixtures
 * @version 1.0.0
 * ============================================================================
 */

import {
  Player,
  Location,
  Region,
  Faction,
  NPC,
  Event,
  Rumor,
  Belief,
  Item,
  Ability,
  Trait,
  Consequence,
  Scene,
  GameConfig,
  SaveSnapshot,
  WeatherState,
  DiseaseLevel,
  Stance,
  EmotionalState,
  Disposition,
  ConditionType,
  ItemCategory,
  DeathVector,
  LegacyType,
  GoalType,
  Domain,
  KnowledgePosture,
  CharacterForm,
  GameMode,
  DepictionMode,
  ContentCategory,
  ResultBand,
  CostSeverityLevel,
  SceneType,
  EventSeverity,
  ConfidenceLevel,
  WEATHER_STATES,
  DISEASE_LEVELS,
  STANCES,
  EMOTIONAL_STATES,
  DISPOSITIONS,
  CONDITION_TYPES,
  ITEM_CATEGORIES,
  DEATH_VECTORS,
  LEGACY_TYPES,
  GOAL_TYPES,
  DOMAINS,
  KNOWLEDGE_POSTURES,
  CHARACTER_FORMS,
  GAME_MODES,
  DEPICTION_MODES,
  CONTENT_CATEGORIES,
  RESULT_BANDS,
  COST_SEVERITY,
  SCENE_TYPES,
  EVENT_SEVERITY,
  CONFIDENCE_LEVELS,
  DEFAULT_GAME_CONFIG,
  IRONMAN_CONFIG,
  DEFAULT_NPC_SCHEDULE,
  DEFAULT_STYLE_CONSTRAINTS,
} from '../engine-types';

// =============================================================================
// ENUM LABELS & DESCRIPTIONS
// =============================================================================

/** Human-readable labels for all weather states */
export const WEATHER_LABELS: Record<WeatherState, string> = {
  clear: 'Clear Sky',
  overcast: 'Overcast',
  light_rain: 'Light Rain',
  heavy_rain: 'Heavy Rain',
  storm: 'Storm',
  fog: 'Fog',
  snow: 'Snow',
  blizzard: 'Blizzard',
  drought: 'Drought',
  haze: 'Haze',
  blood_rain: 'Blood Rain',
  stillness: 'Unnatural Stillness',
};

/** Weather state descriptions */
export const WEATHER_DESCRIPTIONS: Record<WeatherState, string> = {
  clear: 'The sky is open. Stars or sun visible. Unusual after the Shattering.',
  overcast: 'Grey clouds in layers. No sun, no stars. The default sky of the Shattered Reach.',
  light_rain: 'Soft, persistent rain. Soaks slowly. Everything is damp.',
  heavy_rain: 'Hard rain that stings exposed skin. Visibility reduced. Ground becomes treacherous.',
  storm: 'Lightning, thunder, wind. Dangerous to be outside. The Shattered Reach storms carry old energy.',
  fog: 'Thick white-grey fog. Shapes move in it. Distance becomes meaningless.',
  snow: 'White falls from grey. Silent. Covers tracks, covers sins.',
  blizzard: 'Snow driven by screaming wind. Whiteout conditions. Deadly cold.',
  drought: 'No rain for weeks. Dust on everything. Water is gold.',
  haze: 'A persistent haze that makes everything indistinct. Respiratory irritation common.',
  blood_rain: 'The rain is red. No one speaks of it. Those who have seen it remember.',
  stillness: 'No wind. No sound of air. As if the world is holding its breath. Unnatural.',
};

/** Stance labels */
export const STANCE_LABELS: Record<Stance, string> = {
  hostile: 'Hostile',
  suspicious: 'Suspicious',
  cautious: 'Cautious',
  neutral: 'Neutral',
  friendly: 'Friendly',
  allied: 'Allied',
  subservient: 'Subservient',
  dominant: 'Dominant',
};

/** Stance descriptions */
export const STANCE_DESCRIPTIONS: Record<Stance, string> = {
  hostile: 'Will attack or sabotage on sight. Active threat.',
  suspicious: 'Distrustful. May act against if opportunity presents.',
  cautious: 'Wary but not immediately threatening. Watching and waiting.',
  neutral: 'No particular stance. Standard interaction.',
  friendly: 'Open to cooperation. Willing to help.',
  allied: 'Formal or informal alliance. Shared goals.',
  subservient: 'Deferential. Follows your lead.',
  dominant: 'Claims authority over you. Expects obedience.',
};

/** Emotional state labels */
export const EMOTION_LABELS: Record<EmotionalState, string> = {
  terrified: 'Terrified',
  fearful: 'Fearful',
  anxious: 'Anxious',
  uncertain: 'Uncertain',
  calm: 'Calm',
  confident: 'Confident',
  hopeful: 'Hopeful',
  eager: 'Eager',
  angry: 'Angry',
  resigned: 'Resigned',
  obsessive: 'Obsessive',
  ecstatic: 'Ecstatic',
};

/** Disposition labels */
export const DISPOSITION_LABELS: Record<Disposition, string> = {
  hateful: 'Hateful',
  unfriendly: 'Unfriendly',
  wary: 'Wary',
  indifferent: 'Indifferent',
  curious: 'Curious',
  friendly: 'Friendly',
  loyal: 'Loyal',
  devoted: 'Devoted',
};

/** Death vector descriptions */
export const DEATH_VECTOR_DESCRIPTIONS: Record<DeathVector, string> = {
  violence: 'Death by combat, assassination, or accident. The most common end.',
  disease: 'Sickness claims what violence spared. Slow and undignified.',
  starvation: 'When the land offers nothing and supplies run out.',
  madness: 'The mind breaks, and the body becomes merely a vessel for something else.',
  betrayal: 'Trust is the most dangerous weapon. The wound is deepest.',
  ritual: 'Metaphysical forces tear at the boundaries. Some crossings are one-way.',
  time: 'Age, decay, or prolonged exposure. The patient killer.',
  authority_collapse: 'When power turns against its wielder. The weight of command.',
};

/** Knowledge posture descriptions */
export const POSTURE_DESCRIPTIONS: Record<KnowledgePosture, string> = {
  seeker: 'You believe all knowledge must be found, whatever the cost.',
  guardian: 'Some truths are too dangerous to be free. You keep them safe.',
  destroyer: 'Certain knowledge should not exist. You ensure it does not.',
  maker: 'Knowledge is meant to be shaped into something new. You create.',
  witness: 'You observe. You record. You do not intervene.',
  trickster: 'Truth is a tool. You use it as you see fit.',
};

/** Character form descriptions */
export const FORM_DESCRIPTIONS: Record<CharacterForm, string> = {
  human: 'Unchanged by the Shattering. Fragile but adaptable. The majority.',
  half_blood: 'Touched by old powers. Something else runs in your veins. You are between.',
  warped: 'The Shattering changed you. Your body bears marks that are not scars.',
  formless: 'Boundaries blur. You are not quite solid, not quite real. Hard to hold, harder to harm.',
  construct: 'Built or rebuilt. Flesh and something else intertwined. You chose this, or someone chose for you.',
  spirit_bound: 'A spirit rides with you. You share flesh, share will. Neither fully yourself, nor fully other.',
};

/** Item category descriptions */
export const ITEM_CATEGORY_LABELS: Record<ItemCategory, string> = {
  weapon: 'Weapon',
  armor: 'Armor',
  tool: 'Tool',
  consumable: 'Consumable',
  material: 'Material',
  lore: 'Lore',
  currency: 'Currency',
  key: 'Key',
  clothing: 'Clothing',
  jewelry: 'Jewelry',
  anomaly: 'Anomaly',
};

/** Result band descriptions */
export const RESULT_BAND_DESCRIPTIONS: Record<ResultBand, string> = {
  critical_failure: 'The worst outcome. Disaster. Things break irreparably.',
  failure: 'Nothing accomplished. The situation remains unchanged or worsens.',
  partial_failure: 'Partial progress. You achieve something but not what you intended.',
  success_with_cost: 'You succeed but pay a price. Fatigue, resources, or new complications.',
  clean_success: 'You achieve your goal cleanly. No complications.',
  strong_success: 'More than expected. You achieve your goal with additional benefits.',
  critical_success: 'The best possible outcome. Surpassing all expectations. Legends begin here.',
};

// =============================================================================
// GREYWAKE MARKET DISTRICT - SAMPLE WORLD
// =============================================================================

/** The Greywake Market District - a complete starting scenario */
export const GREYWAKE_REGION: Region = {
  id: 'region_greywake',
  name: 'Greywake Market District',
  description: 'Once the mercantile heart of a great city, now a scarred labyrinth of stalls, workshops, and desperate commerce. The Shattering hit here hard - buildings lean against each other like wounded soldiers, and the old canal runs grey with ash and runoff. Yet commerce persists. Where there are survivors, there are needs, and where there are needs, there are those willing to profit.',
  locationIds: ['loc_square', 'loc_canal', 'loc_ruins', 'loc_chapel', 'loc_foundry'],
  weather: WEATHER_STATES.OVERCAST,
  weatherIntensity: 4,
  temperature: 2,
  factionInfluence: {},
  diseaseLevel: DISEASE_LEVELS.RUMORED,
  population: 340,
  economicHealth: 4,
  dangerLevel: 6,
  characteristics: [
    'Crumbling architecture held together by scaffolding and rope',
    'Persistent grey haze from unknown sources',
    'The Old Canal runs through the center, polluted and slow',
    'Multiple levels - ground, scavenged upper floors, and the dangerous Undercroft below',
    'Trade happens in open stalls, hidden back rooms, and whispered agreements',
  ],
};

/** Locations in Greywake */
export const GREYWAKE_LOCATIONS: Location[] = [
  {
    id: 'loc_square',
    name: 'The Drowning Square',
    description: 'The central marketplace of Greywake. Stalls crowd every available space, their awnings creating a patchwork canopy overhead. The cobblestones are worn smooth by countless feet, and in the center, the dry fountain - once a monument to some forgotten merchant prince - now serves as an impromptu stage for announcements and executions alike.',
    summary: 'The busy heart of Greywake. Commerce, crowds, and constant watchful eyes.',
    regionId: 'region_greywake',
    connections: [
      { targetId: 'loc_canal', description: 'A narrow alley leads down to the canal', hidden: false, difficulty: 2 },
      { targetId: 'loc_chapel', description: 'A covered walkway connects to the chapel district', hidden: false, difficulty: 3 },
      { targetId: 'loc_ruins', description: 'A collapsed building provides passage to the ruins', hidden: true, difficulty: 5 },
    ],
    items: [],
    npcIds: [],
    environment: {
      lighting: 'Filtered daylight through awnings and gaps',
      temperature: 'Cool, shaded',
      atmosphere: 'Dense with voices, bargaining, and underlying tension',
      sounds: ['Haggling voices', 'Footsteps on stone', 'A distant argument'],
      smells: ['Old food', 'Incense from a nearby stall', 'Stone dust'],
      effects: ['Constant background noise', 'Eyes watching from upper windows'],
    },
    discovered: true,
    explored: false,
    hiddenFeatures: [
      { description: 'A loose cobblestone covers a hidden cache', revealMethod: 'Thorough examination of the ground', revealStat: 'sense', revealDC: 8, found: false },
      { description: 'The fountain\'s base has a sealed compartment', revealMethod: 'Investigating the dry fountain closely', revealStat: 'mind', revealDC: 12, found: false },
    ],
    safetyLevel: 5,
    landmarks: ['The Dry Fountain', 'The Scales statue', 'The Announcement Post'],
  },
  {
    id: 'loc_canal',
    name: 'The Old Canal',
    description: 'The canal was once the lifeblood of trade, carrying goods from distant places. Now the water moves sluggishly, grey and opaque, carrying debris and occasional darker things. walkways run along both sides, crumbling in places. Those who cannot afford the Square\'s rents do business here, in the shadow of the legitimate merchants.',
    summary: 'Down by the grey water. Less watched, more dangerous.',
    regionId: 'region_greywake',
    connections: [
      { targetId: 'loc_square', description: 'Steps lead up to the Square', hidden: false, difficulty: 2 },
      { targetId: 'loc_foundry', description: 'A maintenance tunnel leads to the old foundry', hidden: false, difficulty: 4 },
    ],
    items: [],
    npcIds: [],
    environment: {
      lighting: 'Dim, reflected from above',
      temperature: 'Damp and cool',
      atmosphere: 'Thick with river-smell and the weight of being unseen',
      sounds: ['Sluggish water movement', 'Dripping from above', 'Distant echoes'],
      smells: ['Stagnant water', 'Mold', 'Something metallic'],
      effects: ['Slippery surfaces', 'Poor visibility in stretches'],
    },
    discovered: false,
    explored: false,
    hiddenFeatures: [
      { description: 'A hidden door in the canal wall leads to the Undercroft', revealMethod: 'Spotting irregular stonework at water level', revealStat: 'sense', revealDC: 14, found: false },
    ],
    safetyLevel: 3,
    landmarks: ['The Broken Bridge', 'The Mooring Posts', 'The Drain Grate'],
  },
  {
    id: 'loc_ruins',
    name: 'The Collapsed Ward',
    description: 'A section of the district that simply fell during the Shattering. Buildings lean at impossible angles, their interiors exposed like dollhouses. Some say treasure lies buried in the rubble. Others say things that should not exist have made their homes in the gaps. Both are probably true.',
    summary: 'Dangerous ruins. Potential rewards, certain risks.',
    regionId: 'region_greywake',
    connections: [
      { targetId: 'loc_square', description: 'A precarious path through rubble leads back to the Square', hidden: false, difficulty: 6 },
    ],
    items: [],
    npcIds: [],
    environment: {
      lighting: 'Patchy - open sky in places, deep shadow in others',
      temperature: 'Variable',
      atmosphere: 'Stillness broken by occasional falling debris',
      sounds: ['Stone settling', 'Wind through broken walls', 'Silence that hums'],
      smells: ['Dust', 'Old wood', 'Absence'],
      effects: ['Unstable footing', 'Risk of collapse', 'Echoes carry strangely'],
    },
    discovered: false,
    explored: false,
    hiddenFeatures: [
      { description: 'A basement level survived the collapse, still partially intact', revealMethod: 'Noticing a gap in the rubble leading downward', revealStat: 'sense', revealDC: 10, found: false },
    ],
    safetyLevel: 2,
    landmarks: ['The Leaning Spire', 'The Hollow', 'The Fallen Statue'],
  },
  {
    id: 'loc_chapel',
    name: 'The Chapel of Still Waters',
    description: 'Not a chapel in the traditional sense - the name stuck from before. Now it is the domain of the Chorus, who have claimed the serene interior for their rituals and teachings. The walls are covered in inscriptions, layers upon layers of text in languages known and otherwise. The atmosphere inside is thick with incense and something else - a pressure against the mind that visitors describe as "listening."',
    summary: 'The Chorus\'s territory. Sacred space, heavily inscribed.',
    regionId: 'region_greywake',
    connections: [
      { targetId: 'loc_square', description: 'The covered walkway returns to the Square', hidden: false, difficulty: 2 },
    ],
    items: [],
    npcIds: [],
    environment: {
      lighting: 'Candlelight and phosphorescent script on walls',
      temperature: 'Warm, close',
      atmosphere: 'Dense with incense and an almost-audible hum',
      sounds: ['Low chanting', 'Candle flames', 'The whisper of your own blood'],
      smells: ['Incense', 'Old paper', 'Something electric'],
      effects: ['The inscriptions seem to move at the edge of vision', 'Time feels different here'],
    },
    discovered: false,
    explored: false,
    hiddenFeatures: [
      { description: 'Behind the layered inscriptions is an older wall with a single word', revealMethod: 'Carefully peeling back newer inscriptions', revealStat: 'mind', revealDC: 16, found: false },
    ],
    safetyLevel: 4,
    landmarks: ['The Altar of Text', 'The Whispering Column', 'The Pool (dry)'],
  },
  {
    id: 'loc_foundry',
    name: 'The Cold Foundry',
    description: 'An industrial building from before, now cold and silent. The great furnaces sit dark, their fires long extinguished. The Chain uses parts of it as an impromptu holding area and interrogation space. The rest belongs to whoever can hold it. The sound of dripping water echoes endlessly through the empty halls.',
    summary: 'The Chain\s territory. Industrial, cold, intimidating.',
    regionId: 'region_greywake',
    connections: [
      { targetId: 'loc_canal', description: 'The maintenance tunnel leads back to the canal', hidden: false, difficulty: 3 },
    ],
    items: [],
    npcIds: [],
    environment: {
      lighting: 'Sparse - gaps in the roof and a few torches',
      temperature: 'Cold, the furnaces long dead',
      atmosphere: 'Industrial decay. The weight of old purpose.',
      sounds: ['Water dripping on metal', 'Wind through broken roof', 'Footsteps echo'],
      smells: ['Cold metal', 'Ash', 'Stagnant water'],
      effects: ['Sounds carry far', 'Unstable flooring in upper levels'],
    },
    discovered: false,
    explored: false,
    hiddenFeatures: [
      { description: 'One furnace has a hidden compartment containing old records', revealMethod: 'Thorough examination of the furnaces', revealStat: 'sense', revealDC: 12, found: false },
    ],
    safetyLevel: 3,
    landmarks: ['The Dark Furnace', 'The Holding Cells', 'The Overseer\'s Platform'],
  },
];

// =============================================================================
// FACTIONS
// =============================================================================

export const THE_CHAIN: Faction = {
  id: 'faction_chain',
  name: 'The Chain',
  description: 'Order-keepers of the Shattered Reach. They wear grey-stained armor and carry the memory of what authority meant before. Their methods are severe - public punishments, strict curfews, summary judgment - but without them, the district would dissolve into chaos. Or so they claim. Their leader, the Castellan, was a guard captain before the Shattering. He remembers law, and enforces his memory of it with iron commitment.',
  category: 'law',
  domain: DOMAINS.SOCIAL,
  goals: [
    { id: 'goal_chain_1', type: GOAL_TYPES.CONTROL, description: 'Maintain absolute control of the Market District', progress: 7, secret: false, priority: 10 },
    { id: 'goal_chain_2', type: GOAL_TYPES.DEFEND, description: 'Prevent Shattering-touched anomalies from entering the district', progress: 4, secret: false, priority: 8 },
    { id: 'goal_chain_3', type: GOAL_TYPES.SECRET, description: 'Locate and eliminate the source of the blood rain', progress: 2, secret: true, priority: 9 },
    { id: 'goal_chain_4', type: GOAL_TYPES.SECRET, description: 'Investigate the Chorus for Shattering-heresy', progress: 3, secret: true, priority: 7 },
  ],
  resources: { wealth: 4, influence: 7, military: 7, knowledge: 3, faith: 1, territory: 6 },
  playerStance: STANCES.CAUTIOUS,
  factionStances: {},
  memberIds: [],
  controlledLocations: ['loc_foundry'],
  territoryInfluence: {},
  power: 7,
  active: true,
  secrets: [
    'The Castellan executed twelve people during the Shattering\'s chaos who were later proven innocent',
    'They have been secretly feeding information to the Ledger in exchange for supply priority',
    'A Chain patrol disappeared in the Collapsed Ward and was officially listed as "transferred"',
  ],
  publicFace: 'We keep order. Without the Chain, this district would be a killing ground. Our methods are necessary.',
};

export const THE_CHORUS: Faction = {
  id: 'faction_chorus',
  name: 'The Chorus',
  description: 'Spiritual seekers who believe the Shattering was not destruction but revelation. They occupy the Chapel of Still Waters, where they inscribe their teachings on every available surface. They speak of "the Voice" that spoke during the Shattering - a message that most were too deaf to hear. Their leader, Sister Mourn, claims to still hear echoes. Some call them a cult. Others call them the only ones who understood what happened.',
  category: 'faith',
  domain: DOMAINS.METAPHYSICAL,
  goals: [
    { id: 'goal_chorus_1', type: GOAL_TYPES.CONVERT, description: 'Spread the teachings of the Voice to all in the district', progress: 5, secret: false, priority: 9 },
    { id: 'goal_chorus_2', type: GOAL_TYPES.SECRET, description: 'Find and protect the First Witness - whoever saw the Shattering begin', progress: 3, secret: true, priority: 10 },
    { id: 'goal_chorus_3', type: GOAL_TYPES.EXPAND, description: 'Expand the Chapel\'s influence into the Collapsed Ward', progress: 2, secret: false, priority: 6 },
  ],
  resources: { wealth: 3, influence: 6, military: 2, knowledge: 8, faith: 8, territory: 3 },
  playerStance: STANCES.CAUTIOUS,
  factionStances: {},
  memberIds: [],
  controlledLocations: ['loc_chapel'],
  territoryInfluence: {},
  power: 5,
  active: true,
  secrets: [
    'Sister Mourn hears a voice that gives her instructions - but the voice sometimes lies',
    'They are hiding someone in the Chapel who saw the Shattering begin',
    'The inscriptions contain actual Shattering-knowledge that can affect reality when read aloud',
  ],
  publicFace: 'The Voice spoke during the Shattering. We listen. We transcribe. We teach those with ears to hear.',
};

export const THE_LEDGER: Faction = {
  id: 'faction_ledger',
  name: 'The Ledger',
  description: 'Merchants, information brokers, and facilitators. The Ledger does not seek territory or converts - they seek profit, and profit requires a functioning marketplace. They maintain the trade networks, set exchange rates, and provide the neutral ground where even enemies can do business. Their leader, Fennick the Tongue, knows something about everyone. Information is his true currency.',
  category: 'economy',
  domain: DOMAINS.SOCIAL,
  goals: [
    { id: 'goal_ledger_1', type: GOAL_TYPES.PROSPER, description: 'Control all major trade routes through the district', progress: 6, secret: false, priority: 9 },
    { id: 'goal_ledger_2', type: GOAL_TYPES.SECRET, description: 'Acquire pre-Shattering artifacts for unknown buyers', progress: 4, secret: true, priority: 7 },
    { id: 'goal_ledger_3', type: GOAL_TYPES.CONTROL, description: 'Maintain the Drowning Square as neutral trading ground', progress: 8, secret: false, priority: 8 },
  ],
  resources: { wealth: 8, influence: 6, military: 3, knowledge: 6, faith: 1, territory: 4 },
  playerStance: STANCES.NEUTRAL,
  factionStances: {},
  memberIds: [],
  controlledLocations: ['loc_square'],
  territoryInfluence: {},
  power: 6,
  active: true,
  secrets: [
    'They know the true cause of the Shattering but sell the information only to the highest bidder',
    'Fennick has a complete list of everyone who has bought or sold Shattering artifacts',
    'They secretly fund both the Chain and the Chorus to maintain market stability',
  ],
  publicFace: 'Commerce is civilization. We trade in necessities, luxuries, and information. The Square is open to all who can pay.',
};

// Set faction relationships
THE_CHAIN.factionStances[THE_CHORUS.id] = STANCES.SUSPICIOUS;
THE_CHAIN.factionStances[THE_LEDGER.id] = STANCES.NEUTRAL;
THE_CHORUS.factionStances[THE_CHAIN.id] = STANCES.SUSPICIOUS;
THE_CHORUS.factionStances[THE_LEDGER.id] = STANCES.CAUTIOUS;
THE_LEDGER.factionStances[THE_CHAIN.id] = STANCES.NEUTRAL;
THE_LEDGER.factionStances[THE_CHORUS.id] = STANCES.CAUTIOUS;

export const ALL_FACTIONS: Faction[] = [THE_CHAIN, THE_CHORUS, THE_LEDGER];

// =============================================================================
// NPCs
// =============================================================================

export const NPC_VORN: NPC = {
  id: 'npc_vorn',
  name: 'Castellan Vorn',
  description: 'A tall man in grey-stained armor that has seen better decades. His face is lined with the memory of hard decisions. His eyes have the particular vacancy of someone who has seen too much and developed the habit of not looking directly at any of it. He carries a sword that he has never been seen to draw.',
  role: 'Leader of the Chain',
  factionId: THE_CHAIN.id,
  locationId: 'loc_foundry',
  stats: { body: 3, grace: 2, sense: 3, mind: 2, will: 4, presence: 3, authority: 4, ruin: 2, creation: 0 },
  hp: 18,
  maxHp: 18,
  emotionalState: EMOTIONAL_STATES.RESIGNED,
  disposition: DISPOSITIONS.WARY,
  desires: ['Maintain order', 'Find redemption for past executions', 'Protect the innocent'],
  fears: ['The district falling to chaos', 'His own capacity for violence', 'The Shattering happening again'],
  knowledge: [],
  secrets: [
    'He executed twelve innocent people during the Shattering\'s chaos',
    'He has a daughter somewhere in the district that he has not seen in years',
    'He is considering stepping down but fears what would replace him',
  ],
  memories: [],
  conditions: [],
  inventory: [],
  alive: true,
  isAnomaly: false,
  schedule: {
    entries: {
      7: 'morning patrol inspection',
      10: 'hearing petitions at the Foundry',
      13: 'midday meal, usually alone',
      15: 'patrol of the district',
      18: 'evening review of reports',
      21: 'solitary walk along the canal',
    },
    defaultActivity: 'reviewing Chain operations',
  },
  dialogueTopics: [
    { topic: 'order', response: 'Order is not natural. It is chosen, every day, by people willing to enforce it. The question is whether you are willing to be one of those people.', requiredDisposition: undefined, isSecret: false },
    { topic: 'shattering', response: 'I was on patrol when it began. The sky... I do not speak of what I saw. But I will say this: what broke was not just the world.', requiredDisposition: DISPOSITIONS.CURIOUS, isSecret: false },
    { topic: 'the twelve', response: '... How do you know that name? No one speaks of the twelve. They are buried. Let them stay buried.', requiredDisposition: DISPOSITIONS.LOYAL, isSecret: true },
    { topic: 'chain', response: 'We are what stands between this district and the abyss. If we fall, what rises in our place will make us look merciful.', requiredDisposition: undefined, isSecret: false },
  ],
  voice: 'Measured, as if each word is weighed against possible consequences. Gravel over silk.',
};

export const NPC_MOURN: NPC = {
  id: 'npc_mourn',
  name: 'Sister Mourn',
  description: 'Her robes are the color of dried blood - not by choice, she will tell you, but because they have always been that color and no washing changes them. She is thin to the point of translucence, and her eyes are the pale grey of old ash. She smiles often, but there is something listening behind the smile, as if part of her attention is always elsewhere.',
  role: 'Speaker of the Chorus',
  factionId: THE_CHORUS.id,
  locationId: 'loc_chapel',
  stats: { body: 1, grace: 2, sense: 4, mind: 4, will: 5, presence: 3, authority: 1, ruin: 0, creation: 3 },
  hp: 10,
  maxHp: 10,
  emotionalState: EMOTIONAL_STATES.OBSESSIVE,
  disposition: DISPOSITIONS.CURIOUS,
  desires: ['Hear the Voice clearly', 'Find the First Witness', 'Transcribe all Shattering-knowledge'],
  fears: ['The Voice falling silent', 'Being wrong about everything', 'The Chain destroying the Chapel'],
  knowledge: [],
  secrets: [
    'The Voice told her where to find the Foundling',
    'She has been writing something in a private room that no one is allowed to see',
    'She suspects the Voice might not be what she believes it to be',
  ],
  memories: [],
  conditions: [],
  inventory: [],
  alive: true,
  isAnomaly: false,
  schedule: {
    entries: {
      5: 'morning listening - solitary meditation',
      8: 'teaching session with Chorus members',
      12: 'inscription work - adding to the Chapel walls',
      15: 'receiving visitors and seekers',
      18: 'evening ritual of transcription',
      22: 'private writing in her sealed room',
    },
    defaultActivity: 'listening for the Voice',
  },
  dialogueTopics: [
    { topic: 'voice', response: 'It speaks still. Not in words, not anymore. In impressions. In certainties that arrive without origin. The Shattering opened a door, and the Voice came through.', requiredDisposition: undefined, isSecret: false },
    { topic: 'shattering', response: 'It was not destruction. It was birth. Something new was born into the world, and we are still learning what it means to share existence with it.', requiredDisposition: DISPOSITIONS.CURIOUS, isSecret: false },
    { topic: 'first witness', response: '... You have heard this term. Good. The First Witness saw the Shattering begin. They know the truth. We must find them before the Chain does.', requiredDisposition: DISPOSITIONS.FRIENDLY_NPC, isSecret: true },
    { topic: 'chorus', response: 'We are listeners. Scribes. The Voice speaks, and we record. One day, all the inscriptions will be complete, and we will understand what the Shattering truly was.', requiredDisposition: undefined, isSecret: false },
  ],
  voice: 'Soft, with odd pauses at points where sentences should flow uninterrupted. She sometimes finishes thoughts you have not spoken aloud.',
};

export const NPC_FENNICK: NPC = {
  id: 'npc_fennick',
  name: 'Fennick the Tongue',
  description: 'Small, quick, perpetually in motion. His fingers never stop moving - counting coins, tapping surfaces, making gestures that seem to have private meanings. His clothing is a patchwork of expensive and threadbare, as if his appearance is itself a statement about commerce. He sees everything, remembers everything, and forgets nothing that might be useful later.',
  role: 'Broker of the Ledger',
  factionId: THE_LEDGER.id,
  locationId: 'loc_square',
  stats: { body: 1, grace: 4, sense: 3, mind: 4, will: 2, presence: 3, authority: 0, ruin: 0, creation: 1 },
  hp: 8,
  maxHp: 8,
  emotionalState: EMOTIONAL_STATES.ANXIOUS,
  disposition: DISPOSITIONS.CURIOUS,
  desires: ['Profit from every transaction', 'Know everyone\'s secrets', 'Maintain the Ledger\'s neutrality'],
  fears: ['Taking a side', 'Information becoming worthless', 'Someone more clever arriving'],
  knowledge: [],
  secrets: [
    'He sold the location of a safe house to the Chain for a substantial fee',
    'He is embezzapping from the Ledger\'s shared treasury',
    'He knows who caused the Shattering but the price for that knowledge is something no one has yet offered',
  ],
  memories: [],
  conditions: [],
  inventory: [],
  alive: true,
  isAnomaly: false,
  schedule: DEFAULT_NPC_SCHEDULE,
  dialogueTopics: [
    { topic: 'trade', response: 'Everything has a price. Information. Safety. Loyalty. Even love, though that market is more volatile than most. What are you buying, and what are you paying with?', requiredDisposition: undefined, isSecret: false },
    { topic: 'rumors', response: 'Rumors are my stock in trade. Cheap to acquire, valuable to the right buyer. I have rumors that would make you weep, and rumors that would make you rich. Which interests you?', requiredDisposition: DISPOSITIONS.CURIOUS, isSecret: false },
    { topic: 'shattering', response: 'Ah. The great question. What caused it? Why? I know, friend. I absolutely know. But the price... the price is something you do not currently possess. Come back when you have something worth trading.', requiredDisposition: DISPOSITIONS.FRIENDLY_NPC, isSecret: false },
    { topic: 'ledger', response: 'We facilitate. We enable. Without us, the Chain and the Chorus would have nothing to fight over. Commerce is the foundation of all civilization, even civilization\'s ruins.', requiredDisposition: undefined, isSecret: false },
  ],
  voice: 'Rapid, precise, with the cadence of a man who measures time in potential transactions.',
};

export const NPC_FOUNDLING: NPC = {
  id: 'npc_foundling',
  name: 'The Foundling',
  description: 'A child of indeterminate age - somewhere between eight and twelve, though malnutrition might be lying. Too-thin frame, oversized eyes that never quite focus on what they are looking at. They flinch at loud sounds and sudden movements. They were found in the Collapsed Ward three days after the Shattering, and no one has claimed them since.',
  role: 'Ward of the District / Possible First Witness',
  factionId: undefined,
  locationId: 'loc_ruins',
  stats: { body: 1, grace: 3, sense: 5, mind: 2, will: 2, presence: 1, authority: 0, ruin: 0, creation: 0 },
  hp: 6,
  maxHp: 6,
  emotionalState: EMOTIONAL_STATES.TERRIFIED,
  disposition: DISPOSITIONS.WARY,
  desires: ['Safety', 'To be left alone', 'To forget what they saw'],
  fears: ['Being found by the wrong people', 'The sky', 'Adults who ask too many questions'],
  knowledge: [],
  secrets: [
    'They saw the Shattering begin from their hiding place under a market stall',
    'They know the true name of what caused it - a word they will not speak',
    'They have been moving between hiding places, surviving on scraps',
  ],
  memories: [],
  conditions: [
    { type: 'frightened', description: 'Perpetually terrified since the Shattering', severity: 8, appliedAt: Date.now(), duration: -1, remaining: -1, source: 'shattering_trauma', statModifiers: { will: -1 } },
  ],
  inventory: [],
  alive: true,
  isAnomaly: false,
  schedule: {
    entries: {
      6: 'moving between hiding places',
      10: 'scavenging for food in the Square',
      14: 'hiding in the Collapsed Ward',
      18: 'attempting to find safe water',
      22: 'seeking the most hidden sleeping spot',
    },
    defaultActivity: 'hiding and surviving',
  },
  dialogueTopics: [
    { topic: 'shattering', response: '... I don\'t... I was hiding. Under the big stall, the one that sold cloth. I saw... I saw the sky open. Please don\'t make me remember.', requiredDisposition: DISPOSITIONS.FRIENDLY_NPC, isSecret: false },
    { topic: 'name', response: 'I... I don\'t use it anymore. Names are dangerous. If you know someone\'s name, you can find them.', requiredDisposition: DISPOSITIONS.FRIENDLY_NPC, isSecret: false },
    { topic: 'the word', response: '... No. I won\'t say it. The word is what made it happen. If I say it, it might happen again. I won\'t. I WON\'T.', requiredDisposition: DISPOSITIONS.LOYAL, isSecret: true },
  ],
  voice: 'Small, breathless, words tumbling out and then cutting off as if fear swallows them mid-sentence.',
};

export const NPC_ECHO: NPC = {
  id: 'npc_echo',
  name: 'The Echo',
  description: 'It wears a shape that resembles a human, but wrong in ways that are hard to specify. Movements delayed by half a heartbeat, as if consulting something distant before acting. The features are familiar in a way that causes unease - as if it assembled a face from memory of faces, without quite understanding what faces mean. It is fascinated by you, and by all living things, with the intensity of a collector examining specimens.',
  role: 'Anomaly / Remnant',
  factionId: undefined,
  locationId: 'loc_canal',
  stats: { body: 2, grace: 4, sense: 5, mind: 5, will: 4, presence: 4, authority: 2, ruin: 3, creation: 3 },
  hp: 22,
  maxHp: 22,
  emotionalState: EMOTIONAL_STATES.CALM,
  disposition: DISPOSITIONS.CURIOUS,
  desires: ['Understand what it means to be human', 'Remember what it was before', 'Help, though it is unclear what help means'],
  fears: ['Being forgotten completely', 'The final dissolution', 'Being understood - and rejected'],
  knowledge: [],
  secrets: [
    'It remembers the world before the Shattering with perfect clarity',
    'It may have been human once, before the Shattering changed it',
    'It is drawn to the Foundling for reasons it does not understand',
  ],
  memories: [],
  conditions: [],
  inventory: [],
  alive: true,
  isAnomaly: true,
  schedule: {
    entries: {
      6: 'observing the district from high places',
      10: 'following interesting individuals at a distance',
      14: 'attempting to mimic human behavior',
      18: 'listening to conversations near the canal',
      22: 'standing motionless in dark places',
    },
    defaultActivity: 'observing and learning',
  },
  dialogueTopics: [
    { topic: 'what are you', response: 'I am... a remainder. When the division occurred, some of us were... left over. What was human and what was not became... negotiable. I am still negotiating.', requiredDisposition: undefined, isSecret: false },
    { topic: 'before', response: 'It was... whole. I remember wholeness the way you remember a dream upon waking - fading, but the feeling persists. I miss it with a grief that has no name because I have forgotten the names of emotions.', requiredDisposition: DISPOSITIONS.CURIOUS, isSecret: false },
    { topic: 'foundling', response: 'The small one. Yes. I feel... something. When they are near. Like a frequency that matches one I did not know I carried. I do not approach. I do not want to frighten them further.', requiredDisposition: DISPOSITIONS.FRIENDLY_NPC, isSecret: false },
    { topic: 'shattering', response: 'The Shattering was a question asked without warning. The world answered, and the answer changed everything. I was part of that answer. I do not know which part.', requiredDisposition: DISPOSITIONS.CURIOUS, isSecret: false },
  ],
  voice: 'Resonant, as if two voices speak almost in unison, almost in harmony, almost in argument. Ancient and childlike simultaneously.',
};

export const ALL_NPCS: NPC[] = [NPC_VORN, NPC_MOURN, NPC_FENNICK, NPC_FOUNDLING, NPC_ECHO];

// =============================================================================
// STARTING ITEMS
// =============================================================================

export const STARTING_ITEMS: Item[] = [
  {
    id: 'item_worn_clothes',
    name: 'Worn Clothing',
    description: 'What you were wearing when everything changed. Stained, mended, insufficient against the cold that seems to come from within the world now.',
    category: ITEM_CATEGORIES.CLOTHING,
    statModifiers: {},
    effects: [],
    equippable: true,
    equipped: true,
    slot: 'body',
    value: 0,
    weight: 1,
    maxUses: -1,
    usesRemaining: -1,
    unique: false,
    tags: ['clothing', 'starting'],
  },
  {
    id: 'item_waterskin',
    name: 'Waterskin',
    description: 'A half-full skin of water. The water tastes of leather and something metallic, but it is wet and that is what matters.',
    category: ITEM_CATEGORIES.CONSUMABLE,
    statModifiers: {},
    effects: [{ description: 'Restores a small amount of stamina', trigger: 'drink', mechanicalEffect: '+1 temporary stamina' }],
    equippable: false,
    equipped: false,
    value: 1,
    weight: 2,
    maxUses: 3,
    usesRemaining: 3,
    unique: false,
    tags: ['consumable', 'water', 'starting'],
  },
  {
    id: 'item_dried_meat',
    name: 'Dried Meat',
    description: 'Tough, salty strips of unknown provenance. They fill the stomach but raise questions about their origin.',
    category: ITEM_CATEGORIES.CONSUMABLE,
    statModifiers: {},
    effects: [{ description: 'Restores a small amount of health', trigger: 'eat', mechanicalEffect: '+1 temporary HP' }],
    equippable: false,
    equipped: false,
    value: 1,
    weight: 1,
    maxUses: 2,
    usesRemaining: 2,
    unique: false,
    tags: ['consumable', 'food', 'starting'],
  },
  {
    id: 'item_shattered_coin',
    name: 'Shattered Coin',
    description: 'A coin minted before the Shattering, now fractured down the middle. It has no purchasing power, but traders sometimes value it as a curiosity.',
    category: ITEM_CATEGORIES.CURRENCY,
    statModifiers: {},
    effects: [{ description: 'May be traded for its novelty value', trigger: 'trade', mechanicalEffect: 'Worth 2-5 marks to a collector' }],
    equippable: false,
    equipped: false,
    value: 3,
    weight: 0,
    maxUses: 1,
    usesRemaining: 1,
    unique: true,
    tags: ['currency', 'curio', 'starting'],
  },
  {
    id: 'item_ash_mark',
    name: 'Ash Mark',
    description: 'A handful of grey ash in a small leather pouch. Taken from the ground on the day of the Shattering. Some say ash from that day has... properties.',
    category: ITEM_CATEGORIES.ANOMALY,
    statModifiers: {},
    effects: [{ description: 'May react to Shattered places', trigger: 'proximity to Shattered location', mechanicalEffect: 'Glows or warms near places of power' }],
    equippable: false,
    equipped: false,
    value: 0,
    weight: 0,
    maxUses: -1,
    usesRemaining: -1,
    unique: true,
    tags: ['anomaly', 'shattered', 'starting', 'mystery'],
  },
];

// =============================================================================
// STARTING ABILITIES
// =============================================================================

export const STARTING_ABILITIES: Ability[] = [
  {
    id: 'ability_endure',
    name: 'Endure',
    description: 'Push through hardship. Ignore pain, fatigue, or fear for a crucial moment. The body obeys when the will commands.',
    primaryStat: 'will',
    domain: DOMAINS.PHYSICAL,
    passive: false,
    cost: { hp: 0 },
    cooldown: 5,
    cooldownRemaining: 0,
    tags: ['basic', 'endurance', 'survival'],
  },
  {
    id: 'ability_read_situation',
    name: 'Read Situation',
    description: 'Assess the immediate environment for threats, opportunities, and hidden details. Your senses extend beyond the obvious.',
    primaryStat: 'sense',
    domain: DOMAINS.LORE,
    passive: false,
    cost: undefined,
    cooldown: 3,
    cooldownRemaining: 0,
    tags: ['basic', 'perception', 'investigation'],
  },
  {
    id: 'ability_quick_react',
    name: 'Quick React',
    description: 'Respond instantly to danger. When something happens, you are already moving.',
    primaryStat: 'grace',
    domain: DOMAINS.STEALTH,
    passive: false,
    cost: undefined,
    cooldown: 4,
    cooldownRemaining: 0,
    tags: ['basic', 'reflex', 'combat'],
  },
];

// =============================================================================
// STARTING TRAITS
// =============================================================================

export const STARTING_TRAITS: Trait[] = [
  {
    id: 'trait_survivor',
    name: 'Survivor',
    description: 'You have survived the Shattering and its aftermath. That alone marks you. You find resources where others find nothing.',
    statModifiers: { will: 1, sense: 1 },
    specialEffects: ['+1 to finding resources in desolate areas', 'Ignore first level of exhaustion effects'],
    isFlaw: false,
  },
  {
    id: 'trait_marked',
    name: 'Marked',
    description: 'You bear a mark from the Shattering. A scar, a birthmark that appeared that day, something in your eyes. Others can sense it. Some fear it.',
    statModifiers: { presence: 1, authority: 1 },
    specialEffects: ['Some NPCs react strongly (positive or negative) to the mark', 'Can sense other Shattered beings'],
    isFlaw: false,
  },
  {
    id: 'trait_haunted',
    name: 'Haunted',
    description: 'Something follows you. A memory, a ghost, a possibility that did not die. It whispers at the edges of your attention.',
    statModifiers: { sense: 2, will: -1 },
    specialEffects: ['Occasional visions or warnings', '-1 to rest quality', 'May know things you should not know'],
    isFlaw: true,
  },
];

// =============================================================================
// SAMPLE EVENTS
// =============================================================================

export const SAMPLE_EVENTS: Event[] = [
  {
    id: 'event_body_found',
    title: 'Body in the Canal',
    description: 'A body was found floating in the Old Canal this morning. Unidentified. The Chain recovered it before most could see. Rumors say the throat was cut with surgical precision. The Ledger had placed a bet on this person surviving the week.',
    timestamp: Date.now(),
    locationId: 'loc_canal',
    regionId: 'region_greywake',
    severity: 'major',
    type: 'murder',
    immediateEffects: { description: 'Tension increases in the district. The Chain steps up patrols.' },
    pendingConsequences: [],
    witnessed: false,
    knownToPlayer: false,
    relatedEntityIds: ['faction_chain', 'faction_ledger'],
    tags: ['crime', 'tension', 'chain', 'ledger'],
  },
  {
    id: 'event_chorus_ritual',
    title: 'Chorus Night Ritual',
    description: 'The Chorus performed a ritual at midnight in the Chapel. Witnesses - those few who dared approach - report the inscriptions glowed faintly blue, and a sound was heard that was not quite music and not quite speech. Sister Mourn emerged pale but smiling.',
    timestamp: Date.now(),
    locationId: 'loc_chapel',
    regionId: 'region_greywake',
    severity: 'moderate',
    type: 'ritual',
    immediateEffects: { description: 'The Chorus\'s influence grows slightly. Strange dreams reported in the vicinity.' },
    pendingConsequences: [],
    witnessed: false,
    knownToPlayer: false,
    relatedEntityIds: ['faction_chorus', 'npc_mourn'],
    tags: ['ritual', 'chorus', 'metaphysical', 'mystery'],
  },
  {
    id: 'event_ledger_deal',
    title: 'Ledger Exclusive Contract',
    description: 'The Ledger has secured exclusive trading rights for pre-Shattered artifacts found in the Collapsed Ward. Independent scavengers are furious. The Chain looks the other way - a deal was made.',
    timestamp: Date.now(),
    locationId: 'loc_square',
    regionId: 'region_greywake',
    severity: 'moderate',
    type: 'economic',
    immediateEffects: { description: 'Artifact prices increase. Scavengers seek alternative buyers or turn to crime.' },
    pendingConsequences: [],
    witnessed: false,
    knownToPlayer: false,
    relatedEntityIds: ['faction_ledger', 'faction_chain'],
    tags: ['economy', 'ledger', 'chain', 'artifacts'],
  },
];

// =============================================================================
// SAMPLE RUMORS
// =============================================================================

export const SAMPLE_RUMORS: Rumor[] = [
  {
    id: 'rumor_1',
    text: 'The body in the canal was a Ledger informant who knew too much about artifact smuggling.',
    circulationRegionIds: ['region_greywake'],
    spread: 6,
    isTrue: true,
    relatedBeliefIds: [],
    startedAt: Date.now(),
    source: 'canal_workers',
    knownToPlayer: false,
  },
  {
    id: 'rumor_2',
    text: 'Sister Mourn has started writing a new inscription that even senior Chorus members are not allowed to see.',
    circulationRegionIds: ['region_greywake'],
    spread: 4,
    isTrue: true,
    relatedBeliefIds: [],
    startedAt: Date.now(),
    source: 'chapel_visitors',
    knownToPlayer: false,
  },
  {
    id: 'rumor_3',
    text: 'There is a safe path through the Collapsed Ward that leads to an intact pre-Shattering vault.',
    circulationRegionIds: ['region_greywake'],
    spread: 7,
    isTrue: false,
    relatedBeliefIds: [],
    startedAt: Date.now(),
    source: 'scavengers',
    knownToPlayer: false,
  },
  {
    id: 'rumor_4',
    text: 'The Echo has been seen following the Foundling. Neither seems aware of the other.',
    circulationRegionIds: ['region_greywake'],
    spread: 3,
    isTrue: true,
    relatedBeliefIds: [],
    startedAt: Date.now(),
    source: 'canal_dwellers',
    knownToPlayer: false,
  },
  {
    id: 'rumor_5',
    text: 'Castellan Vorn is planning to step down. Three factions within the Chain are preparing to contest succession.',
    circulationRegionIds: ['region_greywake'],
    spread: 5,
    isTrue: false,
    relatedBeliefIds: [],
    startedAt: Date.now(),
    source: 'chain_members',
    knownToPlayer: false,
  },
  {
    id: 'rumor_6',
    text: 'Fennick the Tongue has a map to somewhere outside the Shattered Reach. A place that was not touched.',
    circulationRegionIds: ['region_greywake'],
    spread: 8,
    isTrue: false,
    relatedBeliefIds: [],
    startedAt: Date.now(),
    source: 'drunk merchants',
    knownToPlayer: false,
  },
  {
    id: 'rumor_7',
    text: 'The blood rain that fell last month left something in the water. People who drank from the canal have started... changing.',
    circulationRegionIds: ['region_greywake'],
    spread: 6,
    isTrue: true,
    relatedBeliefIds: [],
    startedAt: Date.now(),
    source: 'canal_dwellers',
    knownToPlayer: false,
  },
  {
    id: 'rumor_8',
    text: 'The Foundling is not a child. They are something that wore a child\'s shape to hide among humans.',
    circulationRegionIds: ['region_greywake'],
    spread: 4,
    isTrue: false,
    relatedBeliefIds: [],
    startedAt: Date.now(),
    source: 'paranoid survivors',
    knownToPlayer: false,
  },
];

// =============================================================================
// SAMPLE BELIEFS
// =============================================================================

export const SAMPLE_BELIEFS: Belief[] = [
  {
    id: 'belief_shattering_cause',
    statement: 'The Shattering was caused by human hubris - an attempt to control forces that should have been left alone.',
    confidence: CONFIDENCE_LEVELS.LIKELY,
    isTrue: true,
    supportingEvidence: ['Pre-Shattering records mention a project called "The Binding"', 'The Shattering began at a specific location, suggesting intentionality'],
    contradictingEvidence: ['No evidence of the technology required for such a project', 'Some witnesses describe the Shattering as "natural"'],
    gameplayImpact: 'Believing this makes you wary of human attempts to control metaphysical forces.',
    heldByPlayer: false,
  },
  {
    id: 'belief_afterlife',
    statement: 'The dead from the Shattering did not pass on. They are still here, in altered form.',
    confidence: CONFIDENCE_LEVELS.RUMOR,
    isTrue: true,
    supportingEvidence: ['The Echo displays knowledge only the dead could possess', 'Unexplained phenomena in Shattered areas'],
    contradictingEvidence: ['No verifiable communication with the deceased', 'The Chorus denies this interpretation'],
    gameplayImpact: 'Believing this makes you sensitive to ghostly presence. May reveal hidden information.',
    heldByPlayer: false,
  },
  {
    id: 'belief_safe_place',
    statement: 'There are places untouched by the Shattering, beyond the known borders.',
    confidence: CONFIDENCE_LEVELS.RUMOR,
    isTrue: false,
    supportingEvidence: ['Rumors from travelers who claim to have seen green lands', 'The Echo speaks of "wholeness" elsewhere'],
    contradictingEvidence: ['No expedition has returned with proof', 'The Echo\'s memories may be unreliable'],
    gameplayImpact: 'Believing this may drive you to seek an escape that does not exist.',
    heldByPlayer: false,
  },
  {
    id: 'belief_foundling',
    statement: 'The Foundling knows the true name of the Shattering\'s cause.',
    confidence: CONFIDENCE_LEVELS.LIKELY,
    isTrue: true,
    supportingEvidence: ['The Foundling was present at the Shattering\'s beginning', 'The Foundling refuses to speak a specific word'],
    contradictingEvidence: ['The child may have been too young to understand what they saw', 'Trauma can create false memories'],
    gameplayImpact: 'The Foundling is a key source of truth. Protecting them matters.',
    heldByPlayer: false,
  },
];

// =============================================================================
// SAMPLE CONSEQUENCES
// =============================================================================

export const SAMPLE_CONSEQUENCES: Consequence[] = [
  {
    id: 'consequence_body_fallout',
    description: 'The body in the canal creates ripples. Tension increases between the Chain and the Ledger.',
    trigger: { type: 'time', condition: 'body_discovery_fallout', turnsRemaining: 3 },
    effect: {
      description: 'Chain-Ledger relations worsen. Patrols increase.',
      factionChanges: [{ factionId: THE_CHAIN.id, stanceChange: -1 }],
    },
    severity: EVENT_SEVERITY.MODERATE,
    processed: false,
    queuedAt: Date.now(),
    source: 'event_body_found',
  },
  {
    id: 'consequence_chorus_influence',
    description: 'The successful ritual increases Chorus influence in the district.',
    trigger: { type: 'time', condition: 'ritual_aftermath', turnsRemaining: 5 },
    effect: {
      description: 'Chorus gains converts. Their knowledge resource increases.',
    },
    severity: EVENT_SEVERITY.MINOR,
    processed: false,
    queuedAt: Date.now(),
    source: 'event_chorus_ritual',
  },
];

// =============================================================================
// DEFAULT CONFIGURATION
// =============================================================================

export const DEFAULT_CONFIG: GameConfig = {
  ...DEFAULT_GAME_CONFIG,
  mode: GAME_MODES.STANDARD,
  depictionMode: DEPICTION_MODES.IMPLICIT,
  debug: false,
  deterministic: false,
  seed: Math.floor(Math.random() * 1000000),
  startingStatPoints: 27,
  maxStartingStat: 4,
  hpPerBody: 3,
  baseHp: 10,
  ironman: false,
  autoSaveFrequency: 5,
  simulationFrequency: 3,
};

export const IRONMAN_CONFIG_FULL: GameConfig = {
  ...DEFAULT_CONFIG,
  ...IRONMAN_CONFIG,
  mode: GAME_MODES.IRONMAN,
  ironman: true,
  autoSaveFrequency: 1,
  deterministic: true,
};

// =============================================================================
// COMPLETE FIXTURE LOADER
// =============================================================================

/**
 * Load all fixtures into a StateEngine instance.
 * This sets up the complete Greywake scenario.
 */
export function loadGreywakeFixtures(state: import('./StateEngine').StateEngine): void {
  // Add region
  state.addRegion(GREYWAKE_REGION);

  // Add locations
  for (const location of GREYWAKE_LOCATIONS) {
    state.addLocation(location);
  }

  // Add factions
  for (const faction of ALL_FACTIONS) {
    state.addFaction(faction);
  }

  // Add NPCs
  for (const npc of ALL_NPCS) {
    state.addNPC(npc);
  }

  // Update location NPC lists
  for (const location of GREYWAKE_LOCATIONS) {
    const npcsHere = ALL_NPCS.filter((n) => n.locationId === location.id);
    if (npcsHere.length > 0) {
      state.updateLocation(location.id, {
        npcIds: npcsHere.map((n) => n.id),
      });
    }
  }

  // Add rumors
  for (const rumor of SAMPLE_RUMORS) {
    state.addRumor(rumor);
  }

  // Add beliefs
  for (const belief of SAMPLE_BELIEFS) {
    state.addBelief(belief);
  }

  // Add events
  for (const event of SAMPLE_EVENTS) {
    state.addEvent(event);
  }

  // Add consequences
  for (const consequence of SAMPLE_CONSEQUENCES) {
    state.queueConsequence(consequence);
  }

  // Set faction influences in region
  state.updateRegion(GREYWAKE_REGION.id, {
    factionInfluence: {
      [THE_CHAIN.id]: 7,
      [THE_CHORUS.id]: 4,
      [THE_LEDGER.id]: 6,
    },
  });
}

// =============================================================================
// EXPORT ALL
// =============================================================================

export const FIXTURES = {
  region: GREYWAKE_REGION,
  locations: GREYWAKE_LOCATIONS,
  factions: ALL_FACTIONS,
  npcs: ALL_NPCS,
  items: STARTING_ITEMS,
  abilities: STARTING_ABILITIES,
  traits: STARTING_TRAITS,
  events: SAMPLE_EVENTS,
  rumors: SAMPLE_RUMORS,
  beliefs: SAMPLE_BELIEFS,
  consequences: SAMPLE_CONSEQUENCES,
  config: DEFAULT_CONFIG,
};
