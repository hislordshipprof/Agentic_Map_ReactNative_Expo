import { Injectable } from '@nestjs/common';
import type { Coordinates } from '../../../common/types';
import { DetourBufferService } from './detour-buffer.service';
import { EntityResolverService, type AnchorInput, type ResolvedStop } from './entity-resolver.service';
import { OptimizationService } from './optimization.service';
import { RouteBuilderService } from './route-builder.service';
import { GoogleMapsService } from '../../maps/google-maps.service';

function haversineM(a: Coordinates, b: Coordinates): number {
  const R = 6371000;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export interface NavigateWithStopsIn {
  origin: Coordinates;
  destination: { name: string; location?: Coordinates };
  stops: Array<{ name: string; category?: string }>;
  anchors?: AnchorInput[];
}

@Injectable()
export class ErrandService {
  constructor(
    private readonly detour: DetourBufferService,
    private readonly entity: EntityResolverService,
    private readonly optimization: OptimizationService,
    private readonly routeBuilder: RouteBuilderService,
    private readonly maps: GoogleMapsService,
  ) {}

  async navigateWithStops(inp: NavigateWithStopsIn): Promise<{
    route: ReturnType<RouteBuilderService['build']>;
    excludedStops?: Array<{ name: string; reason: string }>;
  }> {
    const anchors = inp.anchors ?? [];
    const dest = inp.destination.location
      ? { name: inp.destination.name, location: inp.destination.location }
      : await this.entity.resolveDestination(inp.destination.name, anchors);

    const direct = await this.maps.getDirections(inp.origin, dest.location);
    if (!direct) throw new Error('Could not get direct route');
    const bufferM = this.detour.calculateBuffer(direct.totalDistanceM);

    const resolved = await this.entity.resolveStops(
      inp.stops.map((s) => s.name),
      inp.origin,
      bufferM,
    );
    const excluded: Array<{ name: string; reason: string }> = [];
    inp.stops.forEach((s) => {
      if (!resolved.some((r) => r.query === s.name)) excluded.push({ name: s.name, reason: 'No place found within search area' });
    });

    if (resolved.length === 0) {
      const directOnly = await this.maps.getDirections(inp.origin, dest.location);
      const used = 0;
      const route = this.routeBuilder.build({
        origin: { name: 'Origin', location: inp.origin },
        destination: { name: dest.name, location: dest.location },
        orderedStops: [],
        directions: directOnly!,
        detourBudget: { total: bufferM, used, remaining: bufferM - used },
      });
      return { route, excludedStops: excluded.length ? excluded : undefined };
    }

    const stopInputs = resolved.map((r) => ({ id: r.place.placeId, location: r.place.location }));
    const opt = this.optimization.optimizeStopOrder(inp.origin, dest.location, stopInputs);
    const waypointLocs = (opt.sequence.filter((x) => x !== 'start' && x !== 'end') as string[]).map(
      (id) => stopInputs.find((s) => s.id === id)!.location,
    );
    const fullDir = await this.maps.getDirections(inp.origin, dest.location, waypointLocs);
    if (!fullDir) throw new Error('Could not get route with stops');

    const totalExtraM = Math.max(0, fullDir.totalDistanceM - direct.totalDistanceM);
    const orderedResolved: ResolvedStop[] = opt.sequence
      .filter((x): x is string => x !== 'start' && x !== 'end')
      .map((id) => resolved.find((r) => r.place.placeId === id)!);

    const orderedStopsWithMeta: Array<{
      place: ResolvedStop['place'];
      detourCostM: number;
      status: ReturnType<DetourBufferService['getDetourStatus']>;
      order: number;
    }> = [];
    for (let i = 0; i < orderedResolved.length; i++) {
      const prev = i === 0 ? inp.origin : orderedResolved[i - 1].place.location;
      const next =
        i === orderedResolved.length - 1 ? dest.location : orderedResolved[i + 1].place.location;
      const legIn = fullDir.legs[i]?.distanceM ?? 0;
      const legOut = fullDir.legs[i + 1]?.distanceM ?? 0;
      const directSeg = haversineM(prev, next);
      const detourCostM = Math.max(0, legIn + legOut - directSeg);
      const status = this.detour.getDetourStatus(detourCostM, bufferM);
      orderedStopsWithMeta.push({
        place: orderedResolved[i].place,
        detourCostM,
        status,
        order: i + 1,
      });
    }

    const used = Math.round(totalExtraM);
    const route = this.routeBuilder.build({
      origin: { name: 'Origin', location: inp.origin },
      destination: { name: dest.name, location: dest.location },
      orderedStops: orderedStopsWithMeta,
      directions: fullDir,
      detourBudget: { total: bufferM, used, remaining: Math.max(0, bufferM - used) },
    });

    return { route, excludedStops: excluded.length ? excluded : undefined };
  }

  async suggestStopsOnRoute(
    origin: Coordinates,
    destination: Coordinates,
    categories: string[] = ['coffee', 'gas', 'grocery'],
    limit = 10,
  ): Promise<{ suggestions: Array<{
    id: string;
    name: string;
    address?: string;
    location: Coordinates;
    mileMarker: number;
    detourCost: number;
    status: string;
    category?: string;
    rating?: number;
    isOpen?: boolean;
    order?: number;
  }>; categoryCounts: Record<string, number> }> {
    const direct = await this.maps.getDirections(origin, destination);
    if (!direct) return { suggestions: [], categoryCounts: {} };
    const bufferM = this.detour.calculateBuffer(direct.totalDistanceM);
    const mid = {
      lat: (origin.lat + destination.lat) / 2,
      lng: (origin.lng + destination.lng) / 2,
    };
    const M_TO_MI = 1 / 1609.34;
    const all: Array<{ place: Awaited<ReturnType<typeof this.entity.resolveStops>>[0]['place']; category: string; distFromOriginM: number }> = [];
    for (const cat of categories) {
      const resolved = await this.entity.resolveStops([cat], mid, bufferM);
      for (const r of resolved) {
        const d = haversineM(origin, r.place.location);
        all.push({ place: r.place, category: cat, distFromOriginM: d });
      }
    }
    all.sort((a, b) => a.distFromOriginM - b.distFromOriginM);
    const categoryCounts: Record<string, number> = {};
    for (const c of categories) categoryCounts[c] = 0;
    const suggestions = all.slice(0, limit).map((a, i) => {
      categoryCounts[a.category] = (categoryCounts[a.category] ?? 0) + 1;
      return {
        id: a.place.placeId,
        name: a.place.name,
        address: a.place.address,
        location: a.place.location,
        mileMarker: a.distFromOriginM * M_TO_MI,
        detourCost: 0,
        status: 'NO_DETOUR' as const,
        category: a.category,
        rating: a.place.rating,
        isOpen: a.place.isOpen,
        order: i + 1,
      };
    });
    return { suggestions, categoryCounts };
  }

  async recalculate(origin: Coordinates, destination: Coordinates, stops: Array<{ placeId: string; lat: number; lng: number }>) {
    const stopLocs = stops.map((s) => ({ id: s.placeId, location: { lat: s.lat, lng: s.lng } as Coordinates }));
    const opt = this.optimization.optimizeStopOrder(origin, destination, stopLocs);
    const seq = (opt.sequence.filter((x) => x !== 'start' && x !== 'end') as string[]);
    const waypointLocs = seq.map((id) => stopLocs.find((s) => s.id === id)!.location);
    const dir = await this.maps.getDirections(origin, destination, waypointLocs);
    if (!dir) throw new Error('Could not get route');
    const bufferM = this.detour.calculateBuffer(dir.totalDistanceM);
    const used = 0;
    const orderedStops = seq.map((id, i) => {
      const sl = stopLocs.find((s) => s.id === id)!;
      const place = { placeId: id, name: `Stop ${i + 1}`, address: undefined as string | undefined, location: sl.location, rating: undefined as number | undefined, reviewCount: undefined as number | undefined, types: undefined as string[] | undefined, isOpen: undefined as boolean | undefined };
      return { place, detourCostM: 0, status: 'NO_DETOUR' as const, order: i + 1 };
    });
    return this.routeBuilder.build({
      origin: { name: 'Origin', location: origin },
      destination: { name: 'Destination', location: destination },
      orderedStops,
      directions: dir,
      detourBudget: { total: bufferM, used, remaining: bufferM - used },
    });
  }

  async preview(origin: Coordinates, destination: Coordinates, stops: Array<{ placeId: string; lat: number; lng: number }>) {
    const waypointLocs = stops.map((s) => ({ lat: s.lat, lng: s.lng }));
    const dir = await this.maps.getDirections(origin, destination, waypointLocs.length ? waypointLocs : undefined);
    if (!dir) throw new Error('Could not get route');
    const M_TO_MI = 1 / 1609.34;
    return {
      polyline: dir.polyline,
      totalDistance: dir.totalDistanceM * M_TO_MI,
      totalDuration: dir.totalDurationMin,
      legs: dir.legs.map((l, i) => ({
        distance: l.distanceM * M_TO_MI,
        duration: l.durationMin,
        startAddress: '',
        endAddress: '',
      })),
    };
  }
}
