import { Injectable } from '@nestjs/common';
import type { Coordinates } from '../../common/types';
import { GooglePlacesService, type PlaceCandidate } from './google-places.service';

@Injectable()
export class PlaceSearchService {
  constructor(private readonly google: GooglePlacesService) {}

  /**
   * Search and rank by: proximity to ref, rating, popularity (review count).
   * Returns sorted candidates, best first.
   */
  async searchPlaces(
    query: string,
    location: Coordinates,
    radiusM: number,
    limit = 5,
  ): Promise<PlaceCandidate[]> {
    const raw = await this.google.textSearch(query, location, radiusM, Math.max(limit, 20));
    const ranked = this.rankCandidates(raw, location);
    return ranked.slice(0, limit);
  }

  rankCandidates(candidates: PlaceCandidate[], ref: Coordinates): PlaceCandidate[] {
    return [...candidates].sort((a, b) => {
      const sa = this.calculateRelevanceScore(a, ref);
      const sb = this.calculateRelevanceScore(b, ref);
      return sb - sa;
    });
  }

  calculateRelevanceScore(place: PlaceCandidate, ref: Coordinates): number {
    const distM = this.haversine(ref, place.location);
    const distRatio = Math.min(distM / 5000, 1);
    const proximity = 1 - distRatio * 0.5;
    const rating = ((place.rating ?? 0) / 5) * 0.3;
    const popularity = Math.min((place.reviewCount ?? 0) / 100, 1) * 0.2;
    return proximity + rating + popularity;
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
