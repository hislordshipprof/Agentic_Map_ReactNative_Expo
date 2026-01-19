import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { Coordinates } from '../../../common/types';
import { GoogleMapsService } from '../../maps/google-maps.service';
import { PlaceSearchService } from '../../places/place-search.service';
import type { PlaceCandidate } from '../../places/google-places.service';

export interface AnchorInput {
  name: string;
  location: Coordinates;
}

export interface ResolvedDestination {
  name: string;
  location: Coordinates;
  source: 'anchor' | 'geocode' | 'places';
}

export interface ResolvedStop {
  query: string;
  place: PlaceCandidate;
}

@Injectable()
export class EntityResolverService {
  constructor(
    private readonly maps: GoogleMapsService,
    private readonly placeSearch: PlaceSearchService,
  ) {}

  /**
   * Resolve "home" -> anchor; address -> geocode; place name (e.g. "Walmart") -> Places search.
   * If anchors are provided, try matchAnchor first. Then geocode. If geocode fails and
   * hintLocation is given, fallback to Places Text Search (finds "Walmart", "Chick-fil-A", etc.).
   */
  async resolveDestination(
    text: string,
    anchors: AnchorInput[] = [],
    hintLocation?: Coordinates,
  ): Promise<ResolvedDestination> {
    const a = this.matchAnchor(text, anchors);
    if (a) return { name: a.name, location: a.location, source: 'anchor' };
    const g = await this.maps.geocode(text);
    if (g) return { name: g.address, location: g.location, source: 'geocode' };
    if (hintLocation) {
      const radiusM = 50_000;
      const list = await this.placeSearch.searchPlaces(text, hintLocation, radiusM, 1);
      const top = list[0];
      if (top) return { name: top.name, location: top.location, source: 'places' };
    }
    throw new HttpException({
      error: {
        code: 'LOCATION_UNAVAILABLE',
        message: `Could not resolve destination: ${text}`,
        suggestions: ['Check the address or place name', 'Try a different spelling'],
      },
    }, HttpStatus.BAD_REQUEST);
  }

  matchAnchor(text: string, anchors: AnchorInput[]): AnchorInput | null {
    const t = text.toLowerCase().trim();
    for (const a of anchors) {
      if (a.name.toLowerCase() === t) return a;
      if (a.name.toLowerCase().includes(t) || t.includes(a.name.toLowerCase())) return a;
    }
    return null;
  }

  /**
   * Resolve each stop query to the best place within radius (derived from budget).
   */
  async resolveStops(
    queries: string[],
    location: Coordinates,
    budgetM: number,
  ): Promise<ResolvedStop[]> {
    const radiusM = Math.max(budgetM * 2, 2000);
    const out: ResolvedStop[] = [];
    for (const q of queries) {
      const list = await this.placeSearch.searchPlaces(q, location, radiusM, 1);
      const top = list[0];
      if (top) out.push({ query: q, place: top });
    }
    return out;
  }
}
