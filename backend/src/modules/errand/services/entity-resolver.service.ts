import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import type { Coordinates } from '../../../common/types';
import { GoogleMapsService } from '../../maps/google-maps.service';
import { PlaceSearchService } from '../../places/place-search.service';
import { GooglePlacesService } from '../../places/google-places.service';
import type { PlaceCandidate, PlaceCandidateWithDetour } from '../../places/google-places.service';

// Re-export for consumers
export type { PlaceCandidateWithDetour };
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
 * Uses PlaceCandidateWithDetour to carry SAR detour data when available.
 */
export interface CategoryCandidates {
  [category: string]: PlaceCandidateWithDetour[];
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
  /** Origin coordinates — passed to SAR for accurate leg 0 measurement */
  origin?: Coordinates;
  /** Direct route duration in seconds — used to compute per-place SAR detour */
  directDurationSec?: number;
}

@Injectable()
export class EntityResolverService {
  private readonly logger = new Logger(EntityResolverService.name);

  constructor(
    private readonly maps: GoogleMapsService,
    private readonly placeSearch: PlaceSearchService,
    private readonly googlePlaces: GooglePlacesService,
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

    // When we have a hint location, try Places API first — it returns proper
    // place names ("Church of the Pentecost") instead of geocoded addresses
    // ("5900 E 39th Ave, Denver, CO 80207, USA"). Falls back to geocode for
    // actual street addresses that Places won't find.
    if (hintLocation) {
      const searchTiers = [
        { radiusM: 5_000, label: '5km' },
        { radiusM: 15_000, label: '15km' },
        { radiusM: 50_000, label: '30km' },
      ];

      for (const tier of searchTiers) {
        const list = await this.placeSearch.searchPlaces(text, hintLocation, tier.radiusM, 10);
        if (list.length > 0) {
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

    // Fallback to geocode (for street addresses or when no hint location)
    const g = await this.maps.geocode(text);

    if (g && hintLocation) {
      const MAX_GEOCODE_DISTANCE_KM = 50;
      const distKm = this.haversineM(hintLocation, g.location) / 1000;
      if (distKm > MAX_GEOCODE_DISTANCE_KM) {
        this.logger.log(`[resolveDestination] Geocode result "${g.address}" is ${distKm.toFixed(0)}km from hint location, too far`);
        // Fall through to throw
      } else {
        this.logger.log(`[resolveDestination] Geocode result "${g.address}" is ${distKm.toFixed(1)}km from hint location, using it`);
        return { name: g.address, location: g.location, source: 'geocode' };
      }
    } else if (g) {
      return { name: g.address, location: g.location, source: 'geocode' };
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
    // Try Search Along Route API first (2 API calls vs 10+)
    try {
      const result = await this.resolveStopsAlongRoute(queries, corridor, config);

      // Verify we got results for every category
      const emptyCategories = queries.filter((q) => (result[q]?.length ?? 0) === 0);
      if (emptyCategories.length === 0) {
        return result;
      }

      // Partial success: only re-search empty categories via legacy, keep SAR results for the rest
      this.logger.warn(
        `[resolveStopsAlongCorridor] SAR found ${queries.length - emptyCategories.length}/${queries.length} categories. ` +
        `Empty: ${emptyCategories.join(', ')}. Falling back to legacy for empty categories only.`,
      );
      const legacyResult = await this.resolveStopsAlongCorridorLegacy(emptyCategories, corridor, config);

      // Merge: keep SAR results for successful categories, use legacy for empty ones
      for (const q of queries) {
        if ((result[q]?.length ?? 0) > 0) {
          legacyResult[q] = result[q];
        }
      }
      return legacyResult;
    } catch (error) {
      this.logger.warn(
        `[resolveStopsAlongCorridor] Search Along Route failed: ${error}. Falling back to corridor point search.`,
      );
    }

    return this.resolveStopsAlongCorridorLegacy(queries, corridor, config);
  }

  /**
   * NEW: Search Along Route using Google's NEW Places API.
   * Makes 1 API call per category (vs 5+ corridor point searches).
   * Returns places biased by minimal detour along the encoded polyline.
   */
  private async resolveStopsAlongRoute(
    queries: string[],
    corridor: RouteCorridor,
    config?: CorridorSearchConfig,
  ): Promise<CategoryCandidates> {
    const maxPerCategory = config?.maxCandidatesPerCategory ?? 10;
    const origin = config?.origin;
    const directDurationSec = config?.directDurationSec;

    // Compute route midpoint for locationBias — biases results toward center of route
    // where detours are cheapest (going off-route near origin/dest costs more)
    const midIndex = Math.floor(corridor.decodedPath.length / 2);
    const routeMidpoint = corridor.decodedPath[midIndex] ?? corridor.origin;

    // Scale bias radius proportionally to route length:
    // Short routes (1km) → 500m, Medium (5km) → 2500m, Long (10km+) → 5000m cap
    const biasRadiusM = Math.min(5000, Math.max(500, corridor.totalDistanceM / 2));

    // Max detour threshold: 2x the direct duration, minimum 5 minutes
    // Candidates beyond this are too far off-route to be useful
    const maxDetourSec = directDurationSec != null
      ? Math.max(300, directDurationSec * 2)
      : undefined;

    this.logger.log(`[resolveStopsAlongRoute] ========== SEARCH ALONG ROUTE START ==========`);
    this.logger.log(`[resolveStopsAlongRoute] Categories: ${queries.join(', ')}`);
    this.logger.log(`[resolveStopsAlongRoute] Polyline length: ${corridor.polyline.length} chars`);
    this.logger.log(`[resolveStopsAlongRoute] Location bias: (${routeMidpoint.lat.toFixed(4)}, ${routeMidpoint.lng.toFixed(4)}) radius=${Math.round(biasRadiusM)}m`);
    if (directDurationSec != null) {
      this.logger.log(`[resolveStopsAlongRoute] Direct duration: ${(directDurationSec / 60).toFixed(1)}min, max detour: ${((maxDetourSec ?? 0) / 60).toFixed(1)}min`);
    }

    const locationBias = { center: routeMidpoint, radiusM: biasRadiusM };

    // Search ALL categories in parallel (1 call per category)
    const searchResults = await Promise.all(
      queries.map(async (query) => {
        const results = await this.googlePlaces.searchAlongRoute(
          query,
          corridor.polyline,
          maxPerCategory + 5, // fetch extra to account for filtering
          origin,
          locationBias,
        );
        return { query, results };
      }),
    );

    // Build CategoryCandidates with filtering
    const candidates: CategoryCandidates = {};
    for (const query of queries) {
      candidates[query] = [];
    }

    for (const { query, results } of searchResults) {
      const seen = new Set<string>();

      for (const place of results) {
        if (candidates[query].length >= maxPerCategory) break;
        if (seen.has(place.placeId)) continue;

        // Name relevance check
        if (!this.isNameRelevant(place.name, query)) continue;

        // Location dedup: skip if another candidate is within 100m
        const isDuplicate = candidates[query].some(
          (existing) => this.haversineM(existing.location, place.location) < 100,
        );
        if (isDuplicate) continue;

        // Compute per-place SAR detour if we have both legs + direct duration
        if (directDurationSec != null && place.leg0DurationSec != null && place.leg1DurationSec != null) {
          place.sarDetourSec = Math.max(0, place.leg0DurationSec + place.leg1DurationSec - directDurationSec);
        }

        // Detour filter: skip places with excessive detour (> 2x direct duration, min 5min)
        // BUT always keep at least 1 candidate per category — unique places like
        // "Makola African Market" may only have 1 result; filtering it forces a
        // wasteful legacy fallback and loses SAR data.
        const hasCandidate = candidates[query].length > 0;
        if (hasCandidate && maxDetourSec != null && place.sarDetourSec != null && place.sarDetourSec > maxDetourSec) {
          this.logger.log(
            `[resolveStopsAlongRoute]   SKIPPED "${place.name}": detour ${Math.round(place.sarDetourSec / 60)}min exceeds max ${Math.round(maxDetourSec / 60)}min`,
          );
          continue;
        }

        seen.add(place.placeId);
        candidates[query].push(place);

        const detourInfo = place.sarDetourSec != null
          ? ` (detour: ${Math.round(place.sarDetourSec / 60)}min)`
          : place.leg0DurationSec != null
            ? ` (leg0: ${Math.round(place.leg0DurationSec / 60)}min)`
            : '';
        this.logger.log(
          `[resolveStopsAlongRoute]   Found "${query}": "${place.name}" at (${place.location.lat.toFixed(4)}, ${place.location.lng.toFixed(4)})${detourInfo}`,
        );
      }
    }

    // Sort each category by detour (ascending) so closest-first for cluster scoring
    for (const query of queries) {
      candidates[query].sort((a, b) => {
        // Prefer candidates with known detour; unknowns go to end
        if (a.sarDetourSec != null && b.sarDetourSec != null) return a.sarDetourSec - b.sarDetourSec;
        if (a.sarDetourSec != null) return -1;
        if (b.sarDetourSec != null) return 1;
        return 0;
      });
    }

    // Log summary
    this.logger.log(`[resolveStopsAlongRoute] ========== RESULTS ==========`);
    for (const query of queries) {
      const best = candidates[query][0];
      const bestInfo = best?.sarDetourSec != null ? ` (best detour: ${Math.round(best.sarDetourSec / 60)}min)` : '';
      this.logger.log(`[resolveStopsAlongRoute] ${query}: ${candidates[query].length} candidates${bestInfo}`);
    }
    this.logger.log(`[resolveStopsAlongRoute] ========== SEARCH ALONG ROUTE END ==========`);

    return candidates;
  }

  /**
   * LEGACY: Resolve stop queries using corridor point × category grid search.
   * Used as fallback when Search Along Route API is unavailable or returns empty.
   */
  private async resolveStopsAlongCorridorLegacy(
    queries: string[],
    corridor: RouteCorridor,
    config?: CorridorSearchConfig,
  ): Promise<CategoryCandidates> {
    const cfg = {
      searchRadiusM: config?.searchRadiusM ?? 5000,
      maxCandidatesPerCategory: config?.maxCandidatesPerCategory ?? 10,
      resultsPerSearch: config?.resultsPerSearch ?? 5,
      corridorPointSkip: config?.corridorPointSkip ?? 1,
    };

    this.logger.log(`[resolveStopsAlongCorridorLegacy] ========== MULTI-CANDIDATE SEARCH START ==========`);
    this.logger.log(`[resolveStopsAlongCorridorLegacy] Categories: ${queries.join(', ')}`);
    this.logger.log(`[resolveStopsAlongCorridorLegacy] Corridor points: ${corridor.corridorPoints.length}`);
    this.logger.log(`[resolveStopsAlongCorridorLegacy] Config: radius=${cfg.searchRadiusM}m, maxPerCategory=${cfg.maxCandidatesPerCategory}, skip=${cfg.corridorPointSkip}`);

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
    this.logger.log(`[resolveStopsAlongCorridorLegacy] Using ${searchPoints.length} search points`);

    // Search ALL corridor points × ALL categories in PARALLEL
    interface SearchTask {
      pointIndex: number;
      point: { lat: number; lng: number; distanceFromOriginM: number };
      query: string;
    }

    const searchTasks: SearchTask[] = [];
    for (let i = 0; i < searchPoints.length; i++) {
      for (const query of queries) {
        searchTasks.push({ pointIndex: i, point: searchPoints[i], query });
      }
    }

    this.logger.log(`[resolveStopsAlongCorridorLegacy] Launching ${searchTasks.length} parallel search tasks`);

    const searchResults = await Promise.all(
      searchTasks.map(async (task) => {
        try {
          const results = await this.placeSearch.searchPlaces(
            task.query,
            { lat: task.point.lat, lng: task.point.lng },
            cfg.searchRadiusM,
            cfg.resultsPerSearch,
          );
          return { task, results };
        } catch (error) {
          this.logger.warn(`[resolveStopsAlongCorridorLegacy] Error searching "${task.query}" from point ${task.pointIndex + 1}: ${error}`);
          return { task, results: [] as PlaceCandidate[] };
        }
      }),
    );

    // Merge results with deduplication (process in corridor-point order for consistency)
    searchResults.sort((a, b) => a.task.pointIndex - b.task.pointIndex);

    for (const { task, results } of searchResults) {
      const query = task.query;

      // Skip if we already have enough candidates for this category
      if (candidates[query].length >= cfg.maxCandidatesPerCategory) {
        continue;
      }

      for (const place of results) {
        if (candidates[query].length >= cfg.maxCandidatesPerCategory) break;
        if (seenByCategory[query].has(place.placeId)) continue;

        // Name relevance check
        if (!this.isNameRelevant(place.name, query)) continue;

        // Location dedup: skip if another candidate is within 100m
        const isDuplicate = candidates[query].some(
          (existing) => this.haversineM(existing.location, place.location) < 100,
        );
        if (isDuplicate) continue;

        seenByCategory[query].add(place.placeId);
        candidates[query].push(place);

        this.logger.log(`[resolveStopsAlongCorridorLegacy]   Found "${query}": "${place.name}" at (${place.location.lat.toFixed(4)}, ${place.location.lng.toFixed(4)})`);
      }
    }

    // Log summary
    this.logger.log(`[resolveStopsAlongCorridorLegacy] ========== RESULTS ==========`);
    for (const query of queries) {
      this.logger.log(`[resolveStopsAlongCorridorLegacy] ${query}: ${candidates[query].length} candidates`);
    }
    this.logger.log(`[resolveStopsAlongCorridorLegacy] ========== MULTI-CANDIDATE SEARCH END ==========`);

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
   * Check if a place name is relevant to the search query.
   * "Ross Dress for Less" is relevant to "Ross"; "Town Center at Aurora" is not.
   */
  private isNameRelevant(placeName: string, query: string): boolean {
    const name = placeName.toLowerCase();
    const q = query.toLowerCase();

    // Direct containment: "walmart supercenter" contains "walmart"
    if (name.includes(q)) return true;

    // Space-stripped containment: "kingsoopers" matches "King Soopers"
    const nameNoSpaces = name.replace(/\s+/g, '');
    const qNoSpaces = q.replace(/\s+/g, '');
    if (nameNoSpaces.includes(qNoSpaces) || qNoSpaces.includes(nameNoSpaces)) return true;

    // Check each query word (skip short words like "of", "the")
    const queryWords = q.split(/\s+/).filter((w) => w.length > 2);
    return queryWords.some((word) => name.includes(word));
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
