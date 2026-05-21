import type { GameState, CoreStat, Domain } from "@first-perception/types";

export interface GameStateBindings {
  get_player_stat: (statName: string) => number;
  get_world_danger: () => number;
  get_faction_trust: (factionId: string) => number;
  get_faction_fear: (factionId: string) => number;
  has_condition: (conditionId: string) => boolean;
  has_item: (itemId: string) => boolean;
  get_turn_count: () => number;
  roll_check: (domain: string, difficulty: number) => number;
  add_journal_entry: (label: string, detail: string) => void;
  set_variable: (name: string, value: unknown) => void;
}

export interface BindingsCallbacks {
  onJournalEntry?: (label: string, detail: string) => void;
}

export function createGameStateBindings(
  stateRef: { current: GameState | null },
  callbacks?: BindingsCallbacks
): GameStateBindings {
  return {
    get_player_stat(statName: string): number {
      const validStats: CoreStat[] = [
        "body",
        "grace",
        "sense",
        "mind",
        "will",
        "presence",
        "authority",
        "ruin",
        "creation",
      ];
      if (!validStats.includes(statName as CoreStat)) return 0;
      return stateRef.current?.player.stats[statName as CoreStat] ?? 0;
    },

    get_world_danger(): number {
      const g = stateRef.current;
      if (!g) return 0;
      const location = g.locations.find((l) => l.id === g.currentLocationId);
      const region = location ? g.regions.find((r) => r.id === location.regionId) : undefined;
      return (location?.dangerBase ?? 0) + (region?.dangerModifier ?? 0);
    },

    get_faction_trust(factionId: string): number {
      const faction = stateRef.current?.factions.find((f) => f.id === factionId);
      return faction?.trust ?? 0;
    },

    get_faction_fear(factionId: string): number {
      const faction = stateRef.current?.factions.find((f) => f.id === factionId);
      return faction?.fear ?? 0;
    },

    has_condition(conditionId: string): boolean {
      const conditions = stateRef.current?.player.conditions ?? [];
      return conditions.some(
        (c) =>
          c.typeId === conditionId ||
          c.name.toLowerCase().replace(/\s+/g, "_") === conditionId.toLowerCase()
      );
    },

    has_item(itemId: string): boolean {
      const inventory = stateRef.current?.player.inventory ?? [];
      return inventory.some(
        (i) =>
          i.item_id === itemId ||
          i.name.toLowerCase().replace(/\s+/g, "_") === itemId.toLowerCase()
      );
    },

    get_turn_count(): number {
      return stateRef.current?.turnCount ?? 0;
    },

    roll_check(domain: string, difficulty: number): number {
      const g = stateRef.current;
      if (!g) return 0;

      const validDomains: Domain[] = [
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
      const validDomain = validDomains.includes(domain as Domain) ? (domain as Domain) : "physical";

      const statMap: Record<Domain, CoreStat> = {
        physical: "body",
        social: "presence",
        metaphysical: "will",
        combat: "ruin",
        craft: "creation",
        stealth: "grace",
        lore: "mind",
        wilderness: "sense",
        intrigue: "authority",
      };

      const stat = g.player.stats[statMap[validDomain]] ?? 0;
      const rng = mulberry32(g.seed + g.turnCount + difficulty);
      const die = Math.floor(rng() * 20) + 1;
      const modifier = Math.max(-2, Math.min(4, stat - 1));
      return die + modifier;
    },

    add_journal_entry(label: string, detail: string): void {
      callbacks?.onJournalEntry?.(label, detail);
    },

    set_variable(name: string, value: unknown): void {
      const g = stateRef.current;
      if (!g) return;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (g as unknown as Record<string, unknown>)[name] = value;
    },
  };
}

function mulberry32(seed: number): () => number {
  let current = seed >>> 0;
  return () => {
    current += 0x6d2b79f5;
    let next = current;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}
