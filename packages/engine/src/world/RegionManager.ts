import type { Region, WeatherPattern, UUID } from '@first-perception/types';
import { SeededRNG } from '../engine/DiceEngine';

export class RegionManager {
  private regions: Map<UUID, Region> = new Map();

  constructor(regions: Region[] = []) {
    for (const r of regions) {
      this.regions.set(r.id, r);
    }
  }

  addRegion(region: Region): void {
    this.regions.set(region.id, region);
  }

  getRegion(id: UUID): Region | undefined {
    return this.regions.get(id);
  }

  getAllRegions(): Region[] {
    return Array.from(this.regions.values());
  }

  getDangerModifier(locationId: UUID, locations: { regionId: UUID }[]): number {
    const loc = locations.find((l) => (l as any).id === locationId);
    if (!loc) return 0;
    const region = this.regions.get(loc.regionId);
    return region ? region.dangerModifier : 0;
  }

  getFactionPresence(regionId: UUID): UUID[] {
    const region = this.regions.get(regionId);
    return region ? region.factions : [];
  }

  advanceWeather(regionId: UUID, rng: SeededRNG): { oldPattern: WeatherPattern | undefined; newPattern: WeatherPattern | undefined } {
    const region = this.regions.get(regionId);
    if (!region || region.weatherPatterns.length === 0) {
      return { oldPattern: undefined, newPattern: undefined };
    }
    const oldPattern = region.weatherPatterns[0];
    if (region.weatherPatterns.length > 1 && rng.next() < 0.3) {
      const nextIdx = Math.floor(rng.next() * region.weatherPatterns.length);
      const newPattern = region.weatherPatterns[nextIdx];
      region.weatherPatterns = [newPattern, ...region.weatherPatterns.filter((_, i) => i !== nextIdx)];
      return { oldPattern, newPattern };
    }
    return { oldPattern, newPattern: oldPattern };
  }
}
