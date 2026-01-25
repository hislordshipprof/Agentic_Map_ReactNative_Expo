import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { Coordinates } from '../../../common/types';
import { GoogleMapsService } from '../../maps/google-maps.service';
import { PlaceSearchService } from '../../places/place-search.service';
import type { PlaceCandidate } from '../../places/google-places.service';
import type { RouteCorridor } from './route-corridor.service';

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

/**
 * Multiple candidates per category for cluster-based search.
 * Key is the query (e.g., "Walmart"), value is array of matching places.
 */
export interface CategoryCandidates {
  [category: string]: PlaceCandidate[];
}

/**
 * Configuration for corridor-based search.
 */
export interface CorridorSearchConfig {
  /** Search radius around each corridor point in meters (default: 5000) */
  searchRadiusM?: number;
  /** Maximum candidates to keep per category (default: 10) */
  maxCandidatesPerCategory?: number;
  /** Maximum results per search call (default: 5) */
  resultsPerSearch?: number;
  /** Skip every N corridor points to reduce API calls (default: 1 = use all) */
  corridorPointSkip?: number;
}

@Injectable()
export class EntityResolverService {
  private readonly logger = new Logger(EntityResolverService.name);

  constructor(
    private readonly maps: GoogleMapsService,
    private readonly placeSearch: PlaceSearchService,
  ) {}

  /**
   * Resolve "home" -> anchor; address -> geocode; place name (e.g. "Walmart") -> Places search.
   * If anchors are provided, try matchAnchor first. Then geocode. If geocode fails and
   * hintLocation is given, fallback to Places Text Search (finds "Walmart", "Chick-fil-A", etc.).
   *
   * For place name searches, we fetch multiple candidates and pick the NEAREST one.
   * This ensures the destination minimizes base trip time before adding stops.
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
      // OPTION E: Use small radius first to find truly nearby places
      // Google Text Search ranks by "relevance" not distance, so a large radius
      // can return popular far-away places. Small radius forces nearby results.
      const searchTiers = [
        { radiusM: 5_000, label: '5km' },   // Tier 1: Very close (covers most cases)
        { radiusM: 15_000, label: '15km' }, // Tier 2: Medium range
        { radiusM: 50_000, label: '30km' }, // Tier 3: Fallback for rural areas
      ];

      for (const tier of searchTiers) {
        const list = await this.placeSearch.searchPlaces(text, hintLocation, tier.radiusM, 10);
        if (list.length > 0) {
          // Sort by distance from hintLocation and pick the nearest
          const sorted = [...list].sort((a, b) =>
            this.haversineM(hintLocation, a.location) - this.haversineM(hintLocation, b.location)
          );
          const nearest = sorted[0];
          const distKm = (this.haversineM(hintLocation, nearest.location) / 1000).toFixed(1);
          this.logger.log(`[resolveDestination] Found ${list.length} "${text}" candidates in ${tier.label} radius, picked nearest: "${nearest.name}" at ${distKm}km`);
          return { name: nearest.name, location: nearest.location, source: 'places' };
        }
        this.logger.log(`[resolveDestination] No "${text}" found within ${tier.label}, expanding search...`);
      }
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
   * Resolve each stop query to the NEAREST place using tiered radius search.
   *
   * Google Text Search ranks by "relevance" (rating + popularity), not distance.
   * With a large radius, the closest stores may not be in the top results.
   * Using tiered search (small radius first) ensures we find truly nearby places.
   */
  async resolveStops(
    queries: string[],
    location: Coordinates,
    budgetM: number,
    context?: { destination: Coordinates },
  ): Promise<ResolvedStop[]> {
    this.logger.log(`[resolveStops] Resolving ${queries.length} stops with tiered search, budget=${budgetM}m`);
    if (context?.destination) {
      this.logger.log(`[resolveStops] Route-aware search: origin=(${location.lat},${location.lng}) -> dest=(${context.destination.lat},${context.destination.lng})`);
    }

    // Tiered search: start small to find truly nearby places
    // Google returns by relevance, not distance - small radius forces nearby results
    const searchTiers = [
      { radiusM: 5_000, label: '5km' },   // Tier 1: Very close
      { radiusM: 15_000, label: '15km' }, // Tier 2: Medium range
      { radiusM: 30_000, label: '30km' }, // Tier 3: Fallback
    ];

    const out: ResolvedStop[] = [];
    const options = context?.destination ? { destination: context.destination } : undefined;

    for (const q of queries) {
      this.logger.log(`[resolveStops] Searching for "${q}"...`);
      let found = false;

      for (const tier of searchTiers) {
        // Fetch 10 candidates to sort by distance
        const list = await this.placeSearch.searchPlaces(q, location, tier.radiusM, 10, options);

        if (list.length > 0) {
          // Sort by distance from user location and pick the nearest
          const sorted = [...list].sort((a, b) =>
            this.haversineM(location, a.location) - this.haversineM(location, b.location)
          );
          const nearest = sorted[0];
          const distKm = (this.haversineM(location, nearest.location) / 1000).toFixed(1);

          this.logger.log(`[resolveStops]   FOUND: ${list.length} "${q}" in ${tier.label}, picked nearest: "${nearest.name}" at ${distKm}km (${nearest.location.lat},${nearest.location.lng})`);
          out.push({ query: q, place: nearest });
          found = true;
          break; // Found in this tier, no need to expand
        }
        this.logger.log(`[resolveStops]   No "${q}" in ${tier.label}, expanding...`);
      }

      if (!found) {
        this.logger.warn(`[resolveStops]   NOT FOUND: No results for "${q}" in any tier`);
      }
    }

    this.logger.log(`[resolveStops] Resolved ${out.length}/${queries.length} stops`);
    return out;
  }

  /**
   * Resolve stop queries to MULTIPLE candidates per category along a route corridor.
   * This enables cluster-based search where we find groups of stops near each other.
   *
   * Unlike resolveStops() which returns 1 "best" per category, this returns many options
   * so the ClusterService can find combinations that are geographically close together.
   */
  async resolveStopsAlongCorridor(
    queries: string[],
    corridor: RouteCorridor,
    config?: CorridorSearchConfig,
  ): Promise<CategoryCandidates> {
    const cfg: Required<CorridorSearchConfig> = {
      searchRadiusM: config?.searchRadiusM ?? 5000,
      maxCandidatesPerCategory: config?.maxCandidatesPerCategory ?? 10,
      resultsPerSearch: config?.resultsPerSearch ?? 5,
      corridorPointSkip: config?.corridorPointSkip ?? 1,
    };

    this.logger.log(`[resolveStopsAlongCorridor] ========== MULTI-CANDIDATE SEARCH START ==========`);
    this.logger.log(`[resolveStopsAlongCorridor] Categories: ${queries.join(', ')}`);
    this.logger.log(`[resolveStopsAlongCorridor] Corridor points: ${corridor.corridorPoints.length}`);
    this.logger.log(`[resolveStopsAlongCorridor] Config: radius=${cfg.searchRadiusM}m, maxPerCategory=${cfg.maxCandidatesPerCategory}, skip=${cfg.corridorPointSkip}`);

    // Initialize result map
    const candidates: CategoryCandidates = {};
    for (const query of queries) {
      candidates[query] = [];
    }

    // Track seen placeIds to deduplicate
    const seenByCategory: Record<string, Set<string>> = {};
    for (const query of queries) {
      seenByCategory[query] = new Set();
    }

    // Determine which corridor points to search from
    const searchPoints = this.selectSearchPoints(corridor, cfg.corridorPointSkip);
    this.logger.log(`[resolveStopsAlongCorridor] Using ${searchPoints.length} search points`);

    // Search from each selected corridor point
    for (let i = 0; i < searchPoints.length; i++) {
      const point = searchPoints[i];
      this.logger.log(`[resolveStopsAlongCorridor] Searching from point ${i + 1}/${searchPoints.length}: (${point.lat.toFixed(4)}, ${point.lng.toFixed(4)})`);

      // Search for each category from this point
      for (const query of queries) {
        // Skip if we already have enough candidates for this category
        if (candidates[query].length >= cfg.maxCandidatesPerCategory) {
          continue;
        }

        try {
          const results = await this.placeSearch.searchPlaces(
            query,
            { lat: point.lat, lng: point.lng },
            cfg.searchRadiusM,
            cfg.resultsPerSearch,
          );

          // Add new unique results
          for (const place of results) {
            if (!seenByCategory[query].has(place.placeId)) {
              seenByCategory[query].add(place.placeId);
              candidates[query].push(place);

              this.logger.log(`[resolveStopsAlongCorridor]   Found "${query}": "${place.name}" at (${place.location.lat.toFixed(4)}, ${place.location.lng.toFixed(4)})`);

              // Stop adding if we hit the limit
              if (candidates[query].length >= cfg.maxCandidatesPerCategory) {
                break;
              }
            }
          }
        } catch (error) {
          this.logger.warn(`[resolveStopsAlongCorridor]   Error searching for "${query}": ${error}`);
        }
      }
    }

    // Log summary
    this.logger.log(`[resolveStopsAlongCorridor] ========== RESULTS ==========`);
    for (const query of queries) {
      this.logger.log(`[resolveStopsAlongCorridor] ${query}: ${candidates[query].length} candidates`);
    }
    this.logger.log(`[resolveStopsAlongCorridor] ========== MULTI-CANDIDATE SEARCH END ==========`);

    return candidates;
  }

  /**
   * Select which corridor points to use for searching.
   * For long corridors, we skip some points to reduce API calls.
   */
  private selectSearchPoints(
    corridor: RouteCorridor,
    skip: number,
  ): Array<{ lat: number; lng: number; distanceFromOriginM: number }> {
    const points = corridor.corridorPoints;

    if (points.length <= 3 || skip <= 1) {
      return points;
    }

    const selected: typeof points = [];

    // Always include first point (origin area)
    selected.push(points[0]);

    // Select intermediate points with skip
    for (let i = skip; i < points.length - 1; i += skip) {
      selected.push(points[i]);
    }

    // Always include last point (destination area)
    if (selected[selected.length - 1] !== points[points.length - 1]) {
      selected.push(points[points.length - 1]);
    }

    return selected;
  }

  /**
   * Calculate haversine distance between two points in meters.
   * Used for sorting candidates by distance.
   */
  haversineM(a: Coordinates, b: Coordinates): number {
    const R = 6371000;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const sinDLat = Math.sin(dLat / 2);
    const sinDLng = Math.sin(dLng / 2);
    const x =
      sinDLat * sinDLat +
      Math.cos((a.lat * Math.PI) / 180) *
        Math.cos((b.lat * Math.PI) / 180) *
        sinDLng * sinDLng;
    return 2 * R * Math.asin(Math.sqrt(x));
  }
}
