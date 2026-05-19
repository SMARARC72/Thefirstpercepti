import type { LocationNode, Exit, UUID } from '@first-perception/types';

export class LocationGraph {
  private locations: Map<UUID, LocationNode> = new Map();

  constructor(locations: LocationNode[] = []) {
    for (const loc of locations) {
      this.locations.set(loc.id, loc);
    }
  }

  static fromData(data: LocationNode[]): LocationGraph {
    return new LocationGraph(data);
  }

  addLocation(location: LocationNode): void {
    this.locations.set(location.id, location);
  }

  getLocation(id: UUID): LocationNode | undefined {
    return this.locations.get(id);
  }

  getAllLocations(): LocationNode[] {
    return Array.from(this.locations.values());
  }

  getExits(locationId: UUID): Exit[] {
    const loc = this.locations.get(locationId);
    return loc ? loc.exits : [];
  }

  getVisibleExits(locationId: UUID): Exit[] {
    return this.getExits(locationId).filter((e) => e.visible);
  }

  getExitRisk(locationId: UUID, exitIndex: number): number {
    const exits = this.getExits(locationId);
    return exits[exitIndex]?.travelRisk ?? 50;
  }

  discoverExit(locationId: UUID, toLocationId: UUID): boolean {
    const loc = this.locations.get(locationId);
    if (!loc) return false;
    const exit = loc.exits.find((e) => e.toLocationId === toLocationId);
    if (exit && !exit.visible) {
      exit.visible = true;
      return true;
    }
    return false;
  }

  unlockExit(locationId: UUID, toLocationId: UUID, _keyItemId?: UUID): boolean {
    const loc = this.locations.get(locationId);
    if (!loc) return false;
    const exit = loc.exits.find((e) => e.toLocationId === toLocationId);
    if (exit && exit.locked) {
      exit.locked = undefined;
      return true;
    }
    return false;
  }

  updateLocation(location: LocationNode): void {
    this.locations.set(location.id, location);
  }
}
