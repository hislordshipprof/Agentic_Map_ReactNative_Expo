import { Injectable } from '@nestjs/common';
import type { Coordinates } from '../../common/types';
import { GooglePlacesService, type PlaceCandidate } from './google-places.service';

export interface DisambiguateInput {
  query: string;
  candidates: string[];
  context?: { origin?: Coordinates; destination?: Coordinates };
}

@Injectable()
export class DisambiguationService {
  constructor(private readonly google: GooglePlacesService) {}

  async disambiguate(input: DisambiguateInput): Promise<{
    candidates: PlaceCandidate[];
    recommendedId?: string;
    reason?: string;
  }> {
    const details: PlaceCandidate[] = [];
    for (const id of input.candidates) {
      const p = await this.google.getPlaceDetails(id);
      if (p) details.push(p);
    }
    let recommendedId: string | undefined;
    let reason: string | undefined;
    if (details.length > 0 && input.context?.origin) {
      const byDist = [...details].sort((a, b) => {
        const da = this.haversine(input.context!.origin!, a.location);
        const db = this.haversine(input.context!.origin!, b.location);
        return da - db;
      });
      recommendedId = byDist[0].placeId;
      reason = 'Closest to your location';
    } else if (details.length > 0) {
      const byRating = [...details].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
      recommendedId = byRating[0].placeId;
      reason = 'Highest rated';
    }
    return { candidates: details, recommendedId, reason };
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
}
