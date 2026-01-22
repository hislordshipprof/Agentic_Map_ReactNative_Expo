import { Injectable } from '@nestjs/common';
import type { Coordinates } from '../../common/types';
import { GooglePlacesService, type PlaceCandidate } from './google-places.service';

@Injectable()
export class PlaceSearchService {
  constructor(private readonly google: GooglePlacesService) {}

  /**
   * Search and rank by: proximity to ref (or to route segment when destination is set), rating, popularity.
   * When options.destination is set: uses midpoint as search center, corridor radius, and route-aware ranking
   * (distance to segment, forwardness toward destination).
   */
  async searchPlaces(
    query: string,
    location: Coordinates,
    radiusM: number,
    limit = 5,
    options?: { destination?: Coordinates },
  ): Promise<PlaceCandidate[]> {
    let searchCenter: Coordinates;
    let searchRadius: number;

    if (options?.destination) {
      searchCenter = {
        lat: (location.lat + options.destination.lat) / 2,
        lng: (location.lng + options.destination.lng) / 2,
      };
      const segLen = this.haversine(location, options.destination);
      searchRadius = Math.min(50_000, Math.max(radiusM, segLen * 0.4));
    } else {
      searchCenter = location;
      searchRadius = radiusM;
    }

    const raw = await this.google.textSearch(query, searchCenter, searchRadius, Math.max(limit, 20));
    const routeContext = options?.destination
      ? { origin: location, destination: options.destination }
      : undefined;
    const ranked = this.rankCandidates(raw, location, routeContext);
    return ranked.slice(0, limit);
  }

  rankCandidates(
    candidates: PlaceCandidate[],
    ref: Coordinates,
    routeContext?: { origin: Coordinates; destination: Coordinates },
  ): PlaceCandidate[] {
    return [...candidates].sort((a, b) => {
      const sa = this.calculateRelevanceScore(a, ref, routeContext);
      const sb = this.calculateRelevanceScore(b, ref, routeContext);
      return sb - sa;
    });
  }

  calculateRelevanceScore(
    place: PlaceCandidate,
    ref: Coordinates,
    routeContext?: { origin: Coordinates; destination: Coordinates },
  ): number {
    let proximity: number;

    if (routeContext) {
      const distToSegment = this.pointToSegmentDistance(
        place.location,
        routeContext.origin,
        routeContext.destination,
      );
      const segmentProximity = 1 - Math.min(distToSegment / 5000, 1) * 0.5;
      const t = this.projectionParam(place.location, routeContext.origin, routeContext.destination);
      let forwardness = 0;
      if (t < 0) forwardness = -0.3;
      else if (t <= 1) forwardness = 0.1 * t;
      proximity = segmentProximity + forwardness;
    } else {
      const distM = this.haversine(ref, place.location);
      const distRatio = Math.min(distM / 5000, 1);
      proximity = 1 - distRatio * 0.5;
    }

    const rating = ((place.rating ?? 0) / 5) * 0.3;
    const popularity = Math.min((place.reviewCount ?? 0) / 100, 1) * 0.2;
    return proximity + rating + popularity;
  }

  /**
   * Projection of (P - origin) onto (dest - origin), as a fraction of segment length.
   * t in [0,1] = between origin and dest; t < 0 = behind; t > 1 = past dest.
   */
  private projectionParam(P: Coordinates, origin: Coordinates, dest: Coordinates): number {
    const dx = dest.lat - origin.lat;
    const dy = dest.lng - origin.lng;
    const d2 = dx * dx + dy * dy;
    if (d2 === 0) return 0;
    const vx = P.lat - origin.lat;
    const vy = P.lng - origin.lng;
    return (vx * dx + vy * dy) / d2;
  }

  /**
   * Distance in meters from point P to the segment [A, B].
   */
  private pointToSegmentDistance(P: Coordinates, A: Coordinates, B: Coordinates): number {
    const t = this.projectionParam(P, A, B);
    if (t <= 0) return this.haversine(P, A);
    if (t >= 1) return this.haversine(P, B);
    const mid = {
      lat: A.lat + t * (B.lat - A.lat),
      lng: A.lng + t * (B.lng - A.lng),
    };
    return this.haversine(P, mid);
  }

  private haversine(a: Coordinates, b: Coordinates): number {
    const R = 6371000;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(x));
  }

  async getPlaceDetails(placeId: string): Promise<PlaceCandidate | null> {
    return this.google.getPlaceDetails(placeId);
  }
}
