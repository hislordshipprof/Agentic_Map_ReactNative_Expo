import { Injectable } from '@nestjs/common';
import type { Coordinates } from '../../../common/types';
import type { DetourStatus } from '../../../common/constants/detour.constants';
import type { DirectionsResult } from '../../maps/google-maps.service';
import type { PlaceCandidate } from '../../places/google-places.service';

const M_TO_MI = 1 / 1609.34;

export interface RouteBuildInput {
  origin: { name: string; location: Coordinates };
  destination: { name: string; location: Coordinates };
  orderedStops: Array< {
    place: PlaceCandidate;
    detourCostM: number;
    status: DetourStatus;
    order: number;
  }>;
  directions: DirectionsResult;
  detourBudget: { total: number; used: number; remaining: number };
}

@Injectable()
export class RouteBuilderService {
  /**
   * Build frontend Route from directions and stop metadata.
   */
  build(input: RouteBuildInput): {
    id: string;
    origin: { name: string; location: Coordinates };
    destination: { name: string; location: Coordinates };
    stops: Array<{
      id: string;
      name: string;
      address?: string;
      location: Coordinates;
      mileMarker: number;
      detourCost: number;
      status: DetourStatus;
      category?: string;
      rating?: number;
      isOpen?: boolean;
      order: number;
    }>;
    waypoints: Array<{ id: string; location: Coordinates; type: 'start' | 'stop' | 'destination'; stopId?: string }>;
    legs: Array<{ id: string; startWaypoint: string; endWaypoint: string; distance: number; duration: number; polyline: string }>;
    totalDistance: number;
    totalTime: number;
    polyline: string;
    detourBudget: { total: number; used: number; remaining: number };
    createdAt: number;
  } {
    const { origin, destination, orderedStops, directions, detourBudget } = input;
    const waypoints: Array<{ id: string; location: Coordinates; type: 'start' | 'stop' | 'destination'; stopId?: string }> = [];
    const wpStart = 'wp-0';
    waypoints.push({ id: wpStart, location: origin.location, type: 'start' });

    let accM = 0;
    const stops = orderedStops.map((s, i) => {
      const legM = directions.legs[i]?.distanceM ?? 0;
      accM += legM;
      const mileMarker = accM * M_TO_MI;
      const wpId = `wp-${i + 1}`;
      waypoints.push({ id: wpId, location: s.place.location, type: 'stop', stopId: s.place.placeId });
      return {
        id: s.place.placeId,
        name: s.place.name,
        address: s.place.address,
        location: s.place.location,
        mileMarker,
        detourCost: s.detourCostM,
        status: s.status,
        category: s.place.types?.[0],
        rating: s.place.rating,
        isOpen: s.place.isOpen,
        order: s.order,
      };
    });

    const wpEnd = `wp-${orderedStops.length + 1}`;
    waypoints.push({ id: wpEnd, location: destination.location, type: 'destination' });

    const legs = directions.legs.map((leg, i) => ({
      id: `leg-${i}`,
      startWaypoint: waypoints[i]?.id ?? `wp-${i}`,
      endWaypoint: waypoints[i + 1]?.id ?? `wp-${i + 1}`,
      distance: leg.distanceM * M_TO_MI,
      duration: leg.durationMin,
      polyline: directions.polyline,
    }));

    return {
      id: `route-${Date.now()}`,
      origin,
      destination,
      stops,
      waypoints,
      legs,
      totalDistance: directions.totalDistanceM * M_TO_MI,
      totalTime: directions.totalDurationMin,
      polyline: directions.polyline,
      detourBudget,
      createdAt: Date.now(),
    };
  }
}
