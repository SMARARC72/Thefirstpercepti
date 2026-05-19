/**
 * ============================================================================
 * WORLD SIMULATION ENGINE - The First Perception RPG
 * ============================================================================
 * Living world simulation: faction turns, NPC decisions, economy ticks,
 * weather, disease, ecology, rumor spread, world pulse generation,
 * consequence queue evaluation, time advancement.
 *
 * @module engine/WorldSimulation
 * @version 1.0.0
 * ============================================================================
 */

import {
  EntityId,
  Faction,
  FactionTurn,
  FactionAction,
  FactionGoal,
  NPC,
  NPCDecision,
  Region,
  Location,
  Rumor,
  Belief,
  Consequence,
  WorldPulse,
  EconomyTick,
  WeatherTick,
  DiseaseTick,
  EcologyTick,
  WeatherState,
  DiseaseLevel,
  STANCES,
  EMOTIONAL_STATES,
  DISPOSITIONS,
  WEATHER_STATES,
  DISEASE_LEVELS,
  EVENT_SEVERITY,
} from '../engine-types';
import { DiceEngine } from './DiceEngine';
import { StateEngine } from './StateEngine';

// =============================================================================
// WEATHER STATE MACHINE
// =============================================================================

/** Weather transition probabilities: current -> possible next states */
const WEATHER_TRANSITIONS: Record<WeatherState, { next: WeatherState; weight: number }[]> = {
  clear: [
    { next: WEATHER_STATES.CLEAR, weight: 4 },
    { next: WEATHER_STATES.OVERCAST, weight: 3 },
    { next: WEATHER_STATES.LIGHT_RAIN, weight: 1 },
    { next: WEATHER_STATES.FOG, weight: 1 },
    { next: WEATHER_STATES.DROUGHT, weight: 1 },
  ],
  overcast: [
    { next: WEATHER_STATES.OVERCAST, weight: 3 },
    { next: WEATHER_STATES.CLEAR, weight: 2 },
    { next: WEATHER_STATES.LIGHT_RAIN, weight: 3 },
    { next: WEATHER_STATES.HEAVY_RAIN, weight: 1 },
    { next: WEATHER_STATES.FOG, weight: 2 },
  ],
  light_rain: [
    { next: WEATHER_STATES.LIGHT_RAIN, weight: 3 },
    { next: WEATHER_STATES.OVERCAST, weight: 2 },
    { next: WEATHER_STATES.HEAVY_RAIN, weight: 2 },
    { next: WEATHER_STATES.CLEAR, weight: 1 },
  ],
  heavy_rain: [
    { next: WEATHER_STATES.HEAVY_RAIN, weight: 2 },
    { next: WEATHER_STATES.LIGHT_RAIN, weight: 3 },
    { next: WEATHER_STATES.STORM, weight: 2 },
    { next: WEATHER_STATES.OVERCAST, weight: 1 },
  ],
  storm: [
    { next: WEATHER_STATES.STORM, weight: 2 },
    { next: WEATHER_STATES.HEAVY_RAIN, weight: 3 },
    { next: WEATHER_STATES.OVERCAST, weight: 2 },
    { next: WEATHER_STATES.LIGHT_RAIN, weight: 1 },
  ],
  fog: [
    { next: WEATHER_STATES.FOG, weight: 3 },
    { next: WEATHER_STATES.OVERCAST, weight: 3 },
    { next: WEATHER_STATES.CLEAR, weight: 2 },
    { next: WEATHER_STATES.LIGHT_RAIN, weight: 1 },
  ],
  snow: [
    { next: WEATHER_STATES.SNOW, weight: 3 },
    { next: WEATHER_STATES.BLIZZARD, weight: 1 },
    { next: WEATHER_STATES.CLEAR, weight: 1 },
    { next: WEATHER_STATES.OVERCAST, weight: 2 },
  ],
  blizzard: [
    { next: WEATHER_STATES.BLIZZARD, weight: 2 },
    { next: WEATHER_STATES.SNOW, weight: 3 },
    { next: WEATHER_STATES.OVERCAST, weight: 2 },
  ],
  drought: [
    { next: WEATHER_STATES.DROUGHT, weight: 3 },
    { next: WEATHER_STATES.CLEAR, weight: 3 },
    { next: WEATHER_STATES.OVERCAST, weight: 1 },
  ],
  haze: [
    { next: WEATHER_STATES.HAZE, weight: 2 },
    { next: WEATHER_STATES.OVERCAST, weight: 2 },
    { next: WEATHER_STATES.FOG, weight: 2 },
    { next: WEATHER_STATES.CLEAR, weight: 1 },
  ],
  blood_rain: [
    { next: WEATHER_STATES.BLOOD_RAIN, weight: 1 },
    { next: WEATHER_STATES.HEAVY_RAIN, weight: 3 },
    { next: WEATHER_STATES.STORM, weight: 2 },
  ],
  stillness: [
    { next: WEATHER_STATES.STILLNESS, weight: 1 },
    { next: WEATHER_STATES.CLEAR, weight: 2 },
    { next: WEATHER_STATES.FOG, weight: 2 },
    { next: WEATHER_STATES.OVERCAST, weight: 2 },
  ],
};

// =============================================================================
// DISEASE TRANSITIONS
// =============================================================================

const DISEASE_TRANSITIONS: Record<DiseaseLevel, { next: DiseaseLevel; weight: number }[]> = {
  none: [
    { next: DISEASE_LEVELS.NONE, weight: 8 },
    { next: DISEASE_LEVELS.RUMORED, weight: 1 },
    { next: DISEASE_LEVELS.CONTAINED, weight: 1 },
  ],
  rumored: [
    { next: DISEASE_LEVELS.RUMORED, weight: 3 },
    { next: DISEASE_LEVELS.NONE, weight: 2 },
    { next: DISEASE_LEVELS.CONTAINED, weight: 3 },
    { next: DISEASE_LEVELS.SPREADING, weight: 2 },
  ],
  contained: [
    { next: DISEASE_LEVELS.CONTAINED, weight: 4 },
    { next: DISEASE_LEVELS.NONE, weight: 3 },
    { next: DISEASE_LEVELS.RUMORED, weight: 1 },
    { next: DISEASE_LEVELS.SPREADING, weight: 2 },
  ],
  spreading: [
    { next: DISEASE_LEVELS.SPREADING, weight: 3 },
    { next: DISEASE_LEVELS.EPIDEMIC, weight: 3 },
    { next: DISEASE_LEVELS.CONTAINED, weight: 2 },
    { next: DISEASE_LEVELS.RUMORED, weight: 1 },
  ],
  epidemic: [
    { next: DISEASE_LEVELS.EPIDEMIC, weight: 3 },
    { next: DISEASE_LEVELS.PANDEMIC, weight: 2 },
    { next: DISEASE_LEVELS.SPREADING, weight: 2 },
    { next: DISEASE_LEVELS.CONTAINED, weight: 1 },
  ],
  pandemic: [
    { next: DISEASE_LEVELS.PANDEMIC, weight: 4 },
    { next: DISEASE_LEVELS.EPIDEMIC, weight: 2 },
    { next: DISEASE_LEVELS.SPREADING, weight: 1 },
  ],
};

// =============================================================================
// WORLD SIMULATION ENGINE
// =============================================================================

/**
 * The WorldSimulationEngine runs all background world systems.
 * Factions scheme, NPCs act, economies fluctuate, weather changes,
 * diseases spread, and rumors propagate - all without player input.
 */
export class WorldSimulationEngine {
  private dice: DiceEngine;
  private state: StateEngine;
  private tickCounter: number = 0;

  constructor(diceEngine: DiceEngine, stateEngine: StateEngine) {
    this.dice = diceEngine;
    this.state = stateEngine;
  }

  // =============================================================================
  // MAIN TICK
  // =============================================================================

  /**
   * Run a complete world simulation tick.
   * Called every N turns (configurable, default 3).
   */
  tick(): {
    factionTurns: FactionTurn[];
    npcDecisions: NPCDecision[];
    economyTicks: EconomyTick[];
    weatherTicks: WeatherTick[];
    diseaseTicks: DiseaseTick[];
    ecologyTicks: EcologyTick[];
    rumorSpreads: Rumor[];
    consequencesProcessed: Consequence[];
    pulse: WorldPulse;
  } {
    this.tickCounter++;
    const config = this.state.getConfig();
    const day = this.state.getWorldState().day;

    // 1. Process faction turns
    const factionTurns = this.processFactionTurns();

    // 2. Process NPC decisions
    const npcDecisions = this.processNPCDecisions();

    // 3. Economy tick
    const economyTicks = this.processEconomyTicks();

    // 4. Weather tick
    const weatherTicks = this.processWeatherTicks();

    // 5. Disease tick
    const diseaseTicks = this.processDiseaseTicks();

    // 6. Ecology tick
    const ecologyTicks = this.processEcologyTicks();

    // 7. Rumor spread
    const rumorSpreads = this.processRumorSpreads();

    // 8. Process consequences
    const { processed: consequencesProcessed } = this.state.processConsequences();

    // 9. Generate world pulse
    const pulse = this.generateWorldPulse(
      day,
      factionTurns,
      npcDecisions,
      economyTicks,
      weatherTicks,
      diseaseTicks,
      rumorSpreads,
      consequencesProcessed
    );

    return {
      factionTurns,
      npcDecisions,
      economyTicks,
      weatherTicks,
      diseaseTicks,
      ecologyTicks,
      rumorSpreads,
      consequencesProcessed,
      pulse,
    };
  }

  /** Get the current tick counter */
  getTickCount(): number {
    return this.tickCounter;
  }

  // =============================================================================
  // FACTION TURN PROCESSOR
  // =============================================================================

  /** Process turns for all active factions */
  processFactionTurns(): FactionTurn[] {
    const factions = this.state.getAllFactions().filter((f) => f.active);
    const turns: FactionTurn[] = [];

    for (const faction of factions) {
      const turn = this.processSingleFactionTurn(faction);
      turns.push(turn);

      // Apply faction changes to state
      for (const stance of turn.stanceChanges) {
        const existingFaction = this.state.getFaction(faction.id);
        if (existingFaction) {
          existingFaction.factionStances[stance.targetFactionId] = stance.newStance;
          this.state.updateFaction(faction.id, { factionStances: existingFaction.factionStances });
        }
      }

      if (turn.goalProgress.length > 0) {
        const existingFaction = this.state.getFaction(faction.id);
        if (existingFaction) {
          const goals = existingFaction.goals.map((goal) => {
            const progress = turn.goalProgress.find((candidate) => candidate.goalId === goal.id);
            return progress ? { ...goal, progress: progress.newProgress } : goal;
          });
          this.state.updateFaction(faction.id, { goals });
        }
      }

      // Apply resource changes
      if (Object.keys(turn.resourceChanges).length > 0) {
        const existingFaction = this.state.getFaction(faction.id);
        if (existingFaction) {
          const updatedResources = { ...existingFaction.resources };
          for (const [key, value] of Object.entries(turn.resourceChanges)) {
            if (value !== undefined && key in updatedResources) {
              (updatedResources as Record<string, number>)[key] = Math.max(
                0,
                Math.min(10, (updatedResources as Record<string, number>)[key] + value)
              );
            }
          }
          this.state.updateFaction(faction.id, { resources: updatedResources });
        }
      }
    }

    return turns;
  }

  private processSingleFactionTurn(faction: Faction): FactionTurn {
    const actions: FactionAction[] = [];
    const stanceChanges: FactionTurn['stanceChanges'] = [];
    const resourceChanges: Partial<Record<string, number>> = {};
    const goalProgress: FactionTurn['goalProgress'] = [];

    // Process each goal
    for (const goal of faction.goals) {
      if (goal.progress >= 10) continue; // Goal complete

      // Determine if faction works on this goal
      const effortRoll = this.dice.roll(10);
      if (effortRoll <= goal.priority) {
        // Progress the goal
        const progressIncrease = this.dice.roll(3);
        const oldProgress = goal.progress;
        goal.progress = Math.min(10, goal.progress + progressIncrease);

        goalProgress.push({
          goalId: goal.id,
          oldProgress,
          newProgress: goal.progress,
          description: `${faction.name} advances toward: ${goal.description}`,
        });

        // Spend resources
        if (goal.type === 'expand' || goal.type === 'destroy_goal') {
          resourceChanges.military = (resourceChanges.military ?? 0) - 1;
        } else if (goal.type === 'prosper') {
          resourceChanges.wealth = (resourceChanges.wealth ?? 0) + 1;
        } else if (goal.type === 'convert') {
          resourceChanges.faith = (resourceChanges.faith ?? 0) + 1;
        }

        // Generate action
        actions.push({
          type: goal.type,
          description: `${faction.name} works on: ${goal.description}`,
          targetId: goal.targetId,
          resourcesSpent: { ...faction.resources },
          expectedOutcome: goal.progress >= 10 ? 'Goal complete' : 'Progress made',
        });
      }
    }

    // Check for stance changes toward other factions
    const otherFactions = this.state.getAllFactions().filter((f) => f.id !== faction.id && f.active);
    for (const other of otherFactions) {
      const currentStance = faction.factionStances[other.id] ?? 'neutral';
      // Random chance of stance shift based on power differential
      const powerDiff = faction.power - other.power;
      if (this.dice.chance(15)) {
        const stanceOrder = ['hostile', 'suspicious', 'cautious', 'neutral', 'friendly', 'allied'];
        const currentIdx = stanceOrder.indexOf(currentStance);
        let shift = 0;
        if (powerDiff > 2) shift = 1; // Stronger = more likely to be aggressive
        else if (powerDiff < -2) shift = -1; // Weaker = more likely to be cautious
        else shift = this.dice.roll(3) - 2; // Random small shift

        const newIdx = Math.max(0, Math.min(stanceOrder.length - 1, currentIdx + shift));
        const newStance = stanceOrder[newIdx] as any;

        if (newStance !== currentStance) {
          stanceChanges.push({
            targetFactionId: other.id,
            oldStance: currentStance as any,
            newStance,
            reason: `Shift due to power dynamics and ongoing operations`,
          });
        }
      }
    }

    return {
      factionId: faction.id,
      actions,
      stanceChanges,
      resourceChanges,
      goalProgress,
    };
  }

  // =============================================================================
  // NPC DECISION ENGINE
  // =============================================================================

  /** Process decision-making for all NPCs */
  processNPCDecisions(): NPCDecision[] {
    const npcs = this.state.getAllNPCs().filter((n) => n.alive);
    const decisions: NPCDecision[] = [];

    for (const npc of npcs) {
      const decision = this.makeNPCDecision(npc);
      decisions.push(decision);

      // Apply emotional state changes
      if (decision.emotionalState !== npc.emotionalState) {
        this.state.updateNPC(npc.id, { emotionalState: decision.emotionalState });
      }

      // NPC might move locations
      if (decision.action.includes('move') || decision.action.includes('go to') || decision.action.includes('travel')) {
        const locations = this.state.getAllLocations();
        const connections = locations.find((l) => l.id === npc.locationId)?.connections ?? [];
        if (connections.length > 0 && this.dice.chance(30)) {
          const conn = this.dice.pickRandom(connections);
          if (conn) {
            this.state.updateNPC(npc.id, { locationId: conn.targetId });
          }
        }
      }
    }

    return decisions;
  }

  private makeNPCDecision(npc: NPC): NPCDecision {
    // Weight decisions by desires and fears
    const desireWeight = npc.desires.length * 2;
    const fearWeight = npc.fears.length * 3;
    const totalWeight = desireWeight + fearWeight + 5; // +5 for neutral actions

    const roll = this.dice.roll(totalWeight);

    let action: string;
    let motivation: string;
    let emotionalState = npc.emotionalState;

    if (roll <= desireWeight) {
      // Desire-driven action
      const desire = this.dice.pickRandom(npc.desires) ?? 'pursue their interests';
      action = this.generateDesireAction(npc, desire);
      motivation = `Desire: ${desire}`;
      // Positive emotions
      emotionalState = this.dice.pickRandom(['calm', 'confident', 'hopeful', 'eager']) ?? 'calm';
    } else if (roll <= desireWeight + fearWeight) {
      // Fear-driven action
      const fear = this.dice.pickRandom(npc.fears) ?? 'avoid danger';
      action = this.generateFearAction(npc, fear);
      motivation = `Fear: ${fear}`;
      // Negative emotions
      emotionalState = this.dice.pickRandom(['anxious', 'fearful', 'uncertain']) ?? 'anxious';
    } else {
      // Neutral/routine action
      action = this.generateRoutineAction(npc);
      motivation = 'Routine';
    }

    return {
      npcId: npc.id,
      action,
      targetId: undefined,
      motivation,
      emotionalState: emotionalState as any,
      confidence: this.dice.roll(10) / 10,
    };
  }

  private generateDesireAction(npc: NPC, desire: string): string {
    const actions = [
      `seeks to fulfill their desire: ${desire}`,
      `works toward: ${desire}`,
      `approaches someone who might help with: ${desire}`,
      `plans carefully for: ${desire}`,
    ];
    return this.dice.pickRandom(actions) ?? 'pursues their goals';
  }

  private generateFearAction(npc: NPC, fear: string): string {
    const actions = [
      `acts to avoid: ${fear}`,
      `hides from the threat of: ${fear}`,
      `seeks protection against: ${fear}`,
      `warns others about: ${fear}`,
    ];
    return this.dice.pickRandom(actions) ?? 'reacts to perceived threats';
  }

  private generateRoutineAction(npc: NPC): string {
    if (npc.schedule) {
      const hour = this.state.getWorldState().hour;
      const activity = npc.schedule.entries[hour] ?? npc.schedule.defaultActivity;
      return activity;
    }
    return 'goes about their business';
  }

  // =============================================================================
  // ECONOMY TICK
  // =============================================================================

  /** Process economy for all regions */
  processEconomyTicks(): EconomyTick[] {
    const regions = this.state.getAllRegions();
    const ticks: EconomyTick[] = [];

    for (const region of regions) {
      const tick = this.processSingleEconomyTick(region);
      ticks.push(tick);

      // Apply changes to state
      this.state.updateRegion(region.id, {
        economicHealth: Math.max(0, Math.min(10, tick.overallHealth)),
      });
    }

    return ticks;
  }

  private processSingleEconomyTick(region: Region): EconomyTick {
    const commodities = ['food', 'water', 'medicine', 'tools', 'weapons', 'information', 'labor', 'shelter'];
    const priceChanges = commodities.map((commodity) => {
      const oldPrice = 5 + this.dice.roll(5);
      const change = this.dice.roll(6) - 3; // -2 to +3
      const newPrice = Math.max(1, oldPrice + change);
      const reasons = [
        'scarcity',
        'abundance',
        'trade disruption',
        'faction manipulation',
        'seasonal change',
        'rumor-driven demand',
      ];

      return {
        commodity,
        oldPrice,
        newPrice,
        reason: this.dice.pickRandom(reasons) ?? 'market forces',
      };
    });

    const tradeEvents: EconomyTick['tradeEvents'] = [];
    if (this.dice.chance(20)) {
      tradeEvents.push({
        description: `A trade caravan ${this.dice.chance(50) ? 'arrives in' : 'departs from'} the region.`,
        affectedRegions: [region.id],
        impact: this.dice.roll(5) - 2,
      });
    }

    const overallHealth = region.economicHealth + priceChanges.reduce((sum, p) => {
      return sum + (p.newPrice > p.oldPrice ? -0.5 : 0.5);
    }, 0);

    return {
      regionId: region.id,
      priceChanges,
      tradeEvents,
      overallHealth: Math.max(0, Math.min(10, overallHealth)),
    };
  }

  // =============================================================================
  // WEATHER TICK
  // =============================================================================

  /** Process weather for all regions */
  processWeatherTicks(): WeatherTick[] {
    const regions = this.state.getAllRegions();
    const ticks: WeatherTick[] = [];

    for (const region of regions) {
      const tick = this.processSingleWeatherTick(region);
      ticks.push(tick);

      // Apply to state
      this.state.updateRegion(region.id, {
        weather: tick.newWeather,
        weatherIntensity: tick.intensity,
        temperature: tick.temperature,
      });
    }

    return ticks;
  }

  private processSingleWeatherTick(region: Region): WeatherTick {
    const transitions = WEATHER_TRANSITIONS[region.weather] ?? WEATHER_TRANSITIONS.overcast;
    const nextState = this.dice.rollWeightedTable(transitions.map((t) => ({ item: t.next, weight: t.weight })))
      ?? region.weather;

    // Intensity changes gradually
    const intensityShift = this.dice.roll(3) - 2; // -1 to +1
    const newIntensity = Math.max(0, Math.min(10, region.weatherIntensity + intensityShift));

    // Temperature drifts
    const tempShift = this.dice.roll(3) - 2;
    const newTemperature = Math.max(-10, Math.min(10, region.temperature + tempShift));

    const effects: string[] = [];
    if (newIntensity > 7) effects.push('Severe conditions impede travel and activity.');
    if (newTemperature < -5) effects.push('Bitter cold threatens the unprepared.');
    if (newTemperature > 7) effects.push('Heat exhaustion is a real danger.');

    return {
      regionId: region.id,
      oldWeather: region.weather,
      newWeather: nextState,
      intensity: newIntensity,
      temperature: newTemperature,
      effects,
    };
  }

  // =============================================================================
  // DISEASE TICK
  // =============================================================================

  /** Process disease for all regions */
  processDiseaseTicks(): DiseaseTick[] {
    const regions = this.state.getAllRegions();
    const ticks: DiseaseTick[] = [];

    for (const region of regions) {
      const tick = this.processSingleDiseaseTick(region, regions);
      ticks.push(tick);

      // Apply to state
      this.state.updateRegion(region.id, {
        diseaseLevel: tick.newLevel,
      });
    }

    return ticks;
  }

  private processSingleDiseaseTick(region: Region, allRegions: Region[]): DiseaseTick {
    const transitions = DISEASE_TRANSITIONS[region.diseaseLevel] ?? DISEASE_TRANSITIONS.none;
    const nextLevel = this.dice.rollWeightedTable(transitions.map((t) => ({ item: t.next, weight: t.weight })))
      ?? region.diseaseLevel;

    // Containment effort based on faction resources
    const factions = this.state.getAllFactions();
    let containment = 0;
    for (const f of factions) {
      if (f.resources.knowledge > 5 || f.resources.wealth > 6) {
        containment += 1;
      }
    }

    // If containment is high, downgrade severe diseases
    let finalLevel = nextLevel;
    if (containment >= 2 && (nextLevel === 'epidemic' || nextLevel === 'pandemic')) {
      finalLevel = 'spreading';
    }

    // Spread to neighboring regions
    const spreadToRegions: EntityId[] = [];
    if (finalLevel === 'spreading' || finalLevel === 'epidemic' || finalLevel === 'pandemic') {
      const neighbors = allRegions.filter((r) => r.id !== region.id);
      for (const neighbor of neighbors) {
        if (this.dice.chance(finalLevel === 'pandemic' ? 30 : finalLevel === 'epidemic' ? 20 : 10)) {
          if (neighbor.diseaseLevel === 'none' || neighbor.diseaseLevel === 'rumored') {
            spreadToRegions.push(neighbor.id);
            this.state.updateRegion(neighbor.id, {
              diseaseLevel: neighbor.diseaseLevel === 'none' ? 'rumored' : 'contained',
            });
          }
        }
      }
    }

    // Calculate deaths
    let deaths = 0;
    if (finalLevel === 'epidemic') deaths = Math.floor(region.population * 0.01);
    else if (finalLevel === 'pandemic') deaths = Math.floor(region.population * 0.03);

    return {
      regionId: region.id,
      oldLevel: region.diseaseLevel,
      newLevel: finalLevel as DiseaseLevel,
      spreadToRegions,
      containment: Math.min(10, containment * 3),
      deaths,
    };
  }

  // =============================================================================
  // ECOLOGY TICK
  // =============================================================================

  /** Process ecological changes for all regions */
  processEcologyTicks(): EcologyTick[] {
    const regions = this.state.getAllRegions();
    const ticks: EcologyTick[] = [];

    for (const region of regions) {
      const tick = this.processSingleEcologyTick(region);
      ticks.push(tick);

      // Apply population change
      if (tick.populationChange !== 0) {
        this.state.updateRegion(region.id, {
          population: Math.max(0, region.population + tick.populationChange),
        });
      }
    }

    return ticks;
  }

  private processSingleEcologyTick(region: Region): EcologyTick {
    const wildlifeChanges: string[] = [];
    const resourceChanges: string[] = [];
    const environmentalEvents: string[] = [];

    // Population change
    let populationChange = 0;
    if (region.diseaseLevel === 'epidemic') populationChange -= Math.floor(this.dice.roll(5));
    else if (region.diseaseLevel === 'pandemic') populationChange -= Math.floor(this.dice.roll(10));
    else if (region.economicHealth > 7) populationChange += Math.floor(this.dice.roll(3));
    else if (region.economicHealth < 3) populationChange -= Math.floor(this.dice.roll(3));
    else populationChange += this.dice.roll(3) - 2;

    // Wildlife changes
    if (this.dice.chance(15)) {
      const events = [
        'Predators seen closer to settlements.',
        'Game animals are scarce this season.',
        'Birds have abandoned the area.',
        'Insect swarms reported near water sources.',
        'Domestic animals are restless.',
      ];
      wildlifeChanges.push(this.dice.pickRandom(events) ?? 'Wildlife patterns shift subtly.');
    }

    // Resource changes
    if (this.dice.chance(20)) {
      const events = [
        'Water sources show signs of contamination.',
        'Hunting grounds yield less than before.',
        'Forageable plants are abundant this season.',
        'Firewood is becoming scarce.',
        'The soil produces strange growths.',
      ];
      resourceChanges.push(this.dice.pickRandom(events) ?? 'Resources shift in availability.');
    }

    // Environmental events
    if (this.dice.chance(10)) {
      const events = [
        'Unusual plant growth spotted in ruins.',
        'The ground trembled briefly, without explanation.',
        'A strange luminescence appears in standing water.',
        'Ash falls from a cloudless sky.',
        'The local fauna exhibits unusual behavior.',
      ];
      environmentalEvents.push(this.dice.pickRandom(events) ?? 'The environment shifts subtly.');
    }

    return {
      regionId: region.id,
      populationChange,
      wildlifeChanges,
      resourceChanges,
      environmentalEvents,
    };
  }

  // =============================================================================
  // RUMOR SPREAD PROCESSOR
  // =============================================================================

  /** Process rumor spread across the world */
  processRumorSpreads(): Rumor[] {
    const rumors = this.state.getAllRumors();
    const updatedRumors: Rumor[] = [];

    for (const rumor of rumors) {
      let modified = false;

      // Rumors naturally spread
      if (rumor.spread < 10 && this.dice.chance(20 + rumor.spread * 3)) {
        const regions = this.state.getAllRegions();
        for (const region of regions) {
          if (!rumor.circulationRegionIds.includes(region.id) && this.dice.chance(30)) {
            rumor.circulationRegionIds.push(region.id);
            modified = true;
          }
        }
        rumor.spread = Math.min(10, rumor.spread + this.dice.roll(2));
        modified = true;
      }

      // Rumors fade over time
      if (rumor.spread > 0 && this.dice.chance(5)) {
        rumor.spread = Math.max(0, rumor.spread - 1);
        modified = true;
      }

      if (modified) {
        this.state.updateRumor(rumor.id, {
          spread: rumor.spread,
          circulationRegionIds: rumor.circulationRegionIds,
        });
        updatedRumors.push(rumor);
      }
    }

    return updatedRumors;
  }

  // =============================================================================
  // WORLD PULSE GENERATOR
  // =============================================================================

  /** Generate a world pulse summarizing recent world changes */
  private generateWorldPulse(
    day: number,
    factionTurns: FactionTurn[],
    npcDecisions: NPCDecision[],
    economyTicks: EconomyTick[],
    weatherTicks: WeatherTick[],
    diseaseTicks: DiseaseTick[],
    rumorSpreads: Rumor[],
    consequencesProcessed: Consequence[]
  ): WorldPulse {
    // Faction movements
    const factionMovements = factionTurns
      .filter((t) => t.actions.length > 0)
      .map((t) => {
        const faction = this.state.getFaction(t.factionId);
        const action = t.actions[0];
        return `${faction?.name ?? 'A faction'}: ${action.description}`;
      });

    // NPC activities
    const npcActivities = npcDecisions
      .filter((d) => d.confidence > 0.3)
      .slice(0, 5)
      .map((d) => {
        const npc = this.state.getNPC(d.npcId);
        return `${npc?.name ?? 'Someone'} ${d.action}`;
      });

    // Economic shifts
    const economicShifts = economyTicks
      .flatMap((t) =>
        t.priceChanges
          .filter((p) => Math.abs(p.newPrice - p.oldPrice) > 1)
          .map((p) => `${p.commodity}: ${p.newPrice > p.oldPrice ? 'up' : 'down'}`)
      )
      .slice(0, 5);

    // Weather changes
    const weatherChanges = weatherTicks
      .filter((t) => t.newWeather !== t.oldWeather || t.intensity > 5)
      .map((t) => {
        const region = this.state.getRegion(t.regionId);
        return `${region?.name ?? 'A region'}: ${t.oldWeather} -> ${t.newWeather}`;
      });

    // Disease updates
    const diseaseUpdates = diseaseTicks
      .filter((t) => t.newLevel !== t.oldLevel || t.deaths > 0)
      .map((t) => {
        const region = this.state.getRegion(t.regionId);
        if (t.deaths > 0) {
          return `${region?.name ?? 'A region'}: ${t.deaths} dead from disease`;
        }
        return `${region?.name ?? 'A region'}: disease ${t.oldLevel} -> ${t.newLevel}`;
      });

    // New rumors
    const newRumors = rumorSpreads
      .filter((r) => !r.knownToPlayer && r.spread > 3)
      .slice(0, 3)
      .map((r) => r.text.substring(0, 60) + (r.text.length > 60 ? '...' : ''));

    // Consequence warnings
    const consequenceWarnings = consequencesProcessed
      .filter((c) => c.severity === 'major' || c.severity === 'catastrophic')
      .map((c) => c.description.substring(0, 80));

    // Overall mood
    const dangerSum = this.state.getAllRegions().reduce((sum, r) => sum + r.dangerLevel, 0);
    const regionCount = this.state.getAllRegions().length || 1;
    const avgDanger = dangerSum / regionCount;
    let overallMood: string;
    if (avgDanger < 3) overallMood = 'An uneasy calm settles over the Shattered Reach';
    else if (avgDanger < 6) overallMood = 'Tension simmers beneath the surface of daily life';
    else overallMood = 'Danger breathes at every corner of the world';

    const pulse: WorldPulse = {
      id: `pulse_${Date.now()}`,
      timestamp: Date.now(),
      factionMovements,
      npcActivities,
      economicShifts,
      weatherChanges,
      diseaseUpdates,
      newRumors,
      ecologicalNotes: [],
      consequenceWarnings,
      overallMood,
      day,
    };

    return pulse;
  }

  // =============================================================================
  // UTILITY
  // =============================================================================

  /** Check if a world tick should run this turn */
  shouldTickThisTurn(turnNumber: number, frequency: number): boolean {
    return turnNumber % frequency === 0;
  }

  /** Get simulation statistics */
  getSimulationStats(): {
    totalTicks: number;
    activeFactions: number;
    activeNPCs: number;
    aliveRegions: number;
    circulatingRumors: number;
  } {
    return {
      totalTicks: this.tickCounter,
      activeFactions: this.state.getAllFactions().filter((f) => f.active).length,
      activeNPCs: this.state.getAllNPCs().filter((n) => n.alive).length,
      aliveRegions: this.state.getAllRegions().length,
      circulatingRumors: this.state.getAllRumors().filter((r) => r.spread > 0).length,
    };
  }
}

// =============================================================================
// STATICS
// =============================================================================

/** Weather effects on gameplay */
export const WEATHER_EFFECTS: Record<WeatherState, { travelMod: number; visibilityMod: number; description: string }> = {
  clear: { travelMod: 0, visibilityMod: 0, description: 'No weather effects.' },
  overcast: { travelMod: 0, visibilityMod: -1, description: 'Reduced visibility.' },
  light_rain: { travelMod: -1, visibilityMod: -1, description: 'Slightly slowed travel.' },
  heavy_rain: { travelMod: -2, visibilityMod: -2, description: 'Travel significantly impeded.' },
  storm: { travelMod: -3, visibilityMod: -3, description: 'Dangerous travel conditions.' },
  fog: { travelMod: -1, visibilityMod: -4, description: 'Severely reduced visibility.' },
  snow: { travelMod: -2, visibilityMod: -2, description: 'Cold and difficult travel.' },
  blizzard: { travelMod: -4, visibilityMod: -4, description: 'Extremely dangerous. Shelter recommended.' },
  drought: { travelMod: 0, visibilityMod: 0, description: 'Water scarcity. Heat exhaustion risk.' },
  haze: { travelMod: 0, visibilityMod: -2, description: 'Hazy conditions reduce visibility.' },
  blood_rain: { travelMod: -2, visibilityMod: -2, description: 'Metaphysical contamination risk.' },
  stillness: { travelMod: 0, visibilityMod: 0, description: 'Unnatural calm. Something is wrong.' },
};
