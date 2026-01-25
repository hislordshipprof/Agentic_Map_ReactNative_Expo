import { Injectable, Logger } from '@nestjs/common';
import type { Coordinates } from '../../../common/types';
import type { DetourCategory } from '../../../common/constants/detour.constants';
import { GoogleMapsService } from '../../maps/google-maps.service';
import type { PlaceCandidate } from '../../places/google-places.service';
import { ClusterService, type StopCluster } from './cluster.service';
import { DetourBufferService } from './detour-buffer.service';
import { EntityResolverService, type AnchorInput, type ResolvedStop } from './entity-resolver.service';
import { OptimizationService } from './optimization.service';
import { RouteBuilderService } from './route-builder.service';
import { RouteCorridorService } from './route-corridor.service';

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
  /** When true, only return 1 route option (faster for voice mode) */
  voiceMode?: boolean;
}

/**
 * A route option representing one cluster of stops.
 */
export interface RouteOption {
  id: string;
  label: string;
  isRecommended: boolean;
  totalTimeMin: number;
  totalDistanceMi: number;
  extraTimeMin: number;
  clusterRadiusKm: number;
  stops: Array<{
    name: string;
    address?: string;
    location: Coordinates;
    placeId: string;
  }>;
  route: ReturnType<RouteBuilderService['build']>;
}

/**
 * Configuration for filtering route options.
 */
const ROUTE_OPTIONS_CONFIG = {
  maxExtraTimeMin: 10,      // Max extra time vs best option
  maxClusterRadiusKm: 5,    // Max distance between stops in cluster
  maxOptions: 3,            // Number of options to return
};

@Injectable()
export class ErrandService {
  private readonly logger = new Logger(ErrandService.name);

  constructor(
    private readonly cluster: ClusterService,
    private readonly corridor: RouteCorridorService,
    private readonly detour: DetourBufferService,
    private readonly entity: EntityResolverService,
    private readonly optimization: OptimizationService,
    private readonly routeBuilder: RouteBuilderService,
    private readonly maps: GoogleMapsService,
  ) {}

  async navigateWithStops(inp: NavigateWithStopsIn): Promise<{
    route: ReturnType<RouteBuilderService['build']>;
    routeOptions: RouteOption[];
    excludedStops?: Array<{ name: string; reason: string }>;
    warnings?: Array<{ stopName: string; message: string; detourMinutes: number; category: DetourCategory }>;
    destination: { name: string; location: Coordinates };
    directTimeMin: number;
  }> {
    this.logger.log(`[navigateWithStops] ========== CLUSTER-BASED ROUTE PLANNING START ==========`);
    this.logger.log(`[navigateWithStops] Origin: (${inp.origin.lat}, ${inp.origin.lng})`);
    this.logger.log(`[navigateWithStops] Destination: "${inp.destination.name}" ${inp.destination.location ? `at (${inp.destination.location.lat}, ${inp.destination.location.lng})` : '(needs resolution)'}`);
    this.logger.log(`[navigateWithStops] Requested stops: ${inp.stops.map(s => `"${s.name}"`).join(', ') || 'none'}`);

    const anchors = inp.anchors ?? [];

    // SMART DESTINATION RESOLUTION:
    // When destination is a place name (needs resolution) AND we have stops,
    // find the nearest stop first, then resolve destination NEAR THAT STOP.
    // This ensures clustered routing (e.g., "King Soopers then Dollar Tree" finds
    // a Dollar Tree near the King Soopers, not just nearest to user).
    let dest: { name: string; location: Coordinates };

    if (inp.destination.location) {
      // Destination has explicit coordinates - use as-is
      dest = { name: inp.destination.name, location: inp.destination.location };
      this.logger.log(`[navigateWithStops] STEP 1: Using provided destination "${dest.name}" at (${dest.location.lat}, ${dest.location.lng})`);
    } else if (inp.stops.length === 0) {
      // No stops - resolve destination relative to origin
      dest = await this.entity.resolveDestination(inp.destination.name, anchors, inp.origin);
      this.logger.log(`[navigateWithStops] STEP 1: Resolved destination to "${dest.name}" at (${dest.location.lat}, ${dest.location.lng})`);
    } else {
      // HAS STOPS + NEEDS RESOLUTION: Find nearest stop first, then resolve destination near it
      this.logger.log(`[navigateWithStops] STEP 1a: Finding nearest stop to determine destination search area...`);

      // Quick search for the first stop to find a reference point
      const firstStopName = inp.stops[0].name;
      const nearestStopResults = await this.entity.resolveStops(
        [firstStopName],
        inp.origin,
        10000, // 10km radius from origin
      );

      if (nearestStopResults.length > 0) {
        const nearestStop = nearestStopResults[0].place;
        this.logger.log(`[navigateWithStops] STEP 1b: Found nearest "${firstStopName}" at (${nearestStop.location.lat}, ${nearestStop.location.lng})`);

        // Now resolve destination near the stop, not near origin
        dest = await this.entity.resolveDestination(inp.destination.name, anchors, nearestStop.location);
        this.logger.log(`[navigateWithStops] STEP 1c: Resolved destination "${dest.name}" NEAR STOP at (${dest.location.lat}, ${dest.location.lng})`);
      } else {
        // Fallback: no stop found, resolve destination near origin
        this.logger.warn(`[navigateWithStops] STEP 1b: No stops found, falling back to origin-based destination`);
        dest = await this.entity.resolveDestination(inp.destination.name, anchors, inp.origin);
        this.logger.log(`[navigateWithStops] STEP 1c: Resolved destination to "${dest.name}" at (${dest.location.lat}, ${dest.location.lng})`);
      }
    }

    // STEP 2: Extract route corridor
    this.logger.log(`[navigateWithStops] STEP 2: Extracting route corridor...`);
    const routeCorridor = await this.corridor.extractCorridor(inp.origin, dest.location);
    const bufferM = this.detour.calculateBuffer(routeCorridor.totalDistanceM);

    this.logger.log(`[navigateWithStops]   Direct distance: ${(routeCorridor.totalDistanceM / 1609.34).toFixed(1)} miles`);
    this.logger.log(`[navigateWithStops]   Direct duration: ${routeCorridor.totalDurationMin.toFixed(1)} min`);
    this.logger.log(`[navigateWithStops]   Corridor points: ${routeCorridor.corridorPoints.length}`);
    this.logger.log(`[navigateWithStops]   Detour buffer: ${bufferM}m (${(bufferM / 1609.34).toFixed(1)} miles)`);

    // Handle no stops case
    if (inp.stops.length === 0) {
      this.logger.log(`[navigateWithStops] No stops requested, returning direct route`);
      const direct = await this.maps.getDirections(inp.origin, dest.location);
      const route = this.routeBuilder.build({
        origin: { name: 'Origin', location: inp.origin },
        destination: { name: dest.name, location: dest.location },
        orderedStops: [],
        directions: direct!,
        detourBudget: { total: bufferM, used: 0, remaining: bufferM },
      });
      const directOption: RouteOption = {
        id: 'direct',
        label: 'Direct Route',
        isRecommended: true,
        totalTimeMin: direct!.totalDurationMin,
        totalDistanceMi: direct!.totalDistanceM / 1609.34,
        extraTimeMin: 0,
        clusterRadiusKm: 0,
        stops: [],
        route,
      };
      return {
        route,
        routeOptions: [directOption],
        destination: dest,
        directTimeMin: routeCorridor.totalDurationMin,
      };
    }

    // STEP 3: Multi-candidate search along corridor
    this.logger.log(`[navigateWithStops] STEP 3: Searching for candidates along corridor...`);
    const stopQueries = inp.stops.map(s => s.name);
    const candidates = await this.entity.resolveStopsAlongCorridor(stopQueries, routeCorridor, {
      searchRadiusM: 5000,
      maxCandidatesPerCategory: 8,
    });

    // Check which categories found results
    const excluded: Array<{ name: string; reason: string }> = [];
    const foundCategories: string[] = [];
    for (const query of stopQueries) {
      if (candidates[query] && candidates[query].length > 0) {
        foundCategories.push(query);
        this.logger.log(`[navigateWithStops]   ${query}: ${candidates[query].length} candidates found`);
      } else {
        excluded.push({ name: query, reason: 'No places found along route corridor' });
        this.logger.warn(`[navigateWithStops]   ${query}: NO CANDIDATES FOUND`);
      }
    }

    // If no candidates found for any category, return direct route
    if (foundCategories.length === 0) {
      this.logger.log(`[navigateWithStops] No candidates found for any stop, returning direct route`);
      const direct = await this.maps.getDirections(inp.origin, dest.location);
      const route = this.routeBuilder.build({
        origin: { name: 'Origin', location: inp.origin },
        destination: { name: dest.name, location: dest.location },
        orderedStops: [],
        directions: direct!,
        detourBudget: { total: bufferM, used: 0, remaining: bufferM },
      });
      const directOption: RouteOption = {
        id: 'direct',
        label: 'Direct Route',
        isRecommended: true,
        totalTimeMin: direct!.totalDurationMin,
        totalDistanceMi: direct!.totalDistanceM / 1609.34,
        extraTimeMin: 0,
        clusterRadiusKm: 0,
        stops: [],
        route,
      };
      return {
        route,
        routeOptions: [directOption],
        excludedStops: excluded,
        destination: dest,
        directTimeMin: routeCorridor.totalDurationMin,
      };
    }

    // STEP 4: Detect clusters (find combinations that are close together)
    this.logger.log(`[navigateWithStops] STEP 4: Detecting stop clusters...`);
    const clusters = this.cluster.detectClusters(candidates, routeCorridor, {
      tightnessWeight: 0.6,
      routeProximityWeight: 0.4,
      maxClusters: 3, // Reduced from 5 to speed up evaluation
    });

    if (clusters.length === 0) {
      this.logger.warn(`[navigateWithStops] No clusters found, falling back to best individual stops`);
      return this.fallbackToIndividualStops(inp, dest, routeCorridor, bufferM, excluded);
    }

    this.logger.log(`[navigateWithStops]   Found ${clusters.length} clusters`);
    clusters.slice(0, 3).forEach((c, i) => {
      this.logger.log(`[navigateWithStops]   Cluster ${i + 1}: radius=${(c.maxPairwiseDistanceM / 1000).toFixed(1)}km, routeDist=${(c.distanceFromRouteM / 1000).toFixed(1)}km, stops=${c.stops.map(s => s.name).join(', ')}`);
    });

    // STEP 5: Evaluate top clusters with actual driving time (PARALLELIZED)
    this.logger.log(`[navigateWithStops] STEP 5: Evaluating top ${Math.min(clusters.length, 3)} clusters in parallel...`);
    const evaluatedClusters = await this.evaluateClustersWithDrivingTime(
      clusters.slice(0, 3), // Reduced from 5 to 3 for faster response
      inp.origin,
      dest.location,
      routeCorridor.totalDurationMin,
    );

    if (evaluatedClusters.length === 0) {
      this.logger.warn(`[navigateWithStops] No clusters could be evaluated, falling back`);
      return this.fallbackToIndividualStops(inp, dest, routeCorridor, bufferM, excluded);
    }

    // STEP 6: Build route options for top clusters
    this.logger.log(`[navigateWithStops] STEP 6: Building route options${inp.voiceMode ? ' (voice mode - single option)' : ''}...`);
    const routeOptions = await this.buildRouteOptions(
      evaluatedClusters,
      inp.origin,
      dest,
      routeCorridor,
      bufferM,
      inp.voiceMode,
    );

    // Best route is the first option (recommended)
    const bestOption = routeOptions[0];
    const detourCategory = this.detour.getDetourCategory(bestOption.extraTimeMin);

    // Log final summary
    this.logger.log(`[navigateWithStops] ========== FINAL SUMMARY ==========`);
    this.logger.log(`[navigateWithStops] Route options: ${routeOptions.length}`);
    routeOptions.forEach((opt, i) => {
      this.logger.log(`[navigateWithStops]   Option ${i + 1}: ${opt.label} - ${opt.totalTimeMin.toFixed(1)}min, ${opt.totalDistanceMi.toFixed(1)}mi (+${opt.extraTimeMin.toFixed(1)}min)`);
    });
    this.logger.log(`[navigateWithStops] Direct route was: ${routeCorridor.totalDurationMin.toFixed(1)}min`);
    this.logger.log(`[navigateWithStops] ========== CLUSTER-BASED ROUTE PLANNING END ==========`);

    // Build warnings for best option
    const warnings: Array<{ stopName: string; message: string; detourMinutes: number; category: DetourCategory }> = [];
    if (detourCategory !== 'MINIMAL') {
      warnings.push({
        stopName: 'Total trip',
        message: this.detour.getWarningMessage(detourCategory, bestOption.extraTimeMin),
        detourMinutes: bestOption.extraTimeMin,
        category: detourCategory,
      });
    }

    return {
      route: bestOption.route,
      routeOptions,
      excludedStops: excluded.length ? excluded : undefined,
      warnings: warnings.length ? warnings : undefined,
      destination: dest,
      directTimeMin: routeCorridor.totalDurationMin,
    };
  }

  /**
   * Build route options from evaluated clusters.
   * Filters to only include reasonable alternatives.
   * @param voiceMode When true, only builds 1 option (faster for voice interactions)
   */
  private async buildRouteOptions(
    evaluatedClusters: Array<StopCluster & { totalDurationMin: number; extraMinutes: number }>,
    origin: Coordinates,
    dest: { name: string; location: Coordinates },
    routeCorridor: Awaited<ReturnType<RouteCorridorService['extractCorridor']>>,
    bufferM: number,
    voiceMode?: boolean,
  ): Promise<RouteOption[]> {
    const options: RouteOption[] = [];
    const bestTime = evaluatedClusters[0]?.totalDurationMin ?? 0;
    // Voice mode: only build 1 option to reduce latency (skip alternatives)
    const maxOptions = voiceMode ? 1 : ROUTE_OPTIONS_CONFIG.maxOptions;

    for (let i = 0; i < evaluatedClusters.length && options.length < maxOptions; i++) {
      const cluster = evaluatedClusters[i];

      // Filter: skip if too much extra time vs best option (but always include the best)
      const extraVsBest = cluster.totalDurationMin - bestTime;
      if (i > 0 && extraVsBest > ROUTE_OPTIONS_CONFIG.maxExtraTimeMin) {
        this.logger.log(`[buildRouteOptions] Skipping cluster ${cluster.id}: +${extraVsBest.toFixed(1)}min vs best exceeds limit`);
        continue;
      }

      // Filter: skip if cluster is too spread out (but always include the best)
      const clusterRadiusKm = cluster.maxPairwiseDistanceM / 1000;
      if (i > 0 && clusterRadiusKm > ROUTE_OPTIONS_CONFIG.maxClusterRadiusKm) {
        this.logger.log(`[buildRouteOptions] Skipping cluster ${cluster.id}: radius ${clusterRadiusKm.toFixed(1)}km exceeds limit`);
        continue;
      }

      try {
        const option = await this.buildSingleRouteOption(
          cluster,
          origin,
          dest,
          routeCorridor,
          bufferM,
          options.length, // index for labeling
        );
        options.push(option);
      } catch (error) {
        this.logger.warn(`[buildRouteOptions] Failed to build option for cluster ${cluster.id}: ${error}`);
      }
    }

    return options;
  }

  /**
   * Build a single route option from a cluster.
   */
  private async buildSingleRouteOption(
    cluster: StopCluster & { totalDurationMin: number; extraMinutes: number },
    origin: Coordinates,
    dest: { name: string; location: Coordinates },
    routeCorridor: Awaited<ReturnType<RouteCorridorService['extractCorridor']>>,
    bufferM: number,
    index: number,
  ): Promise<RouteOption> {
    // Optimize stop order
    const stopInputs = cluster.stops.map(s => ({ id: s.placeId, location: s.location }));
    const opt = this.optimization.optimizeStopOrder(origin, dest.location, stopInputs);
    const orderedStops = (opt.sequence.filter((x): x is string => x !== 'start' && x !== 'end'))
      .map(id => cluster.stops.find(s => s.placeId === id)!);

    // Get directions
    const waypointLocs = orderedStops.map(s => s.location);
    const fullDir = await this.maps.getDirections(origin, dest.location, waypointLocs);
    if (!fullDir) throw new Error('Could not get directions for cluster');

    // Build ordered stops with metadata
    const orderedStopsWithMeta = this.buildOrderedStopsWithMeta(
      orderedStops,
      origin,
      dest.location,
      fullDir,
      bufferM,
    );

    // Calculate metrics
    const totalExtraM = Math.max(0, fullDir.totalDistanceM - routeCorridor.totalDistanceM);

    // Build route
    const route = this.routeBuilder.build({
      origin: { name: 'Origin', location: origin },
      destination: { name: dest.name, location: dest.location },
      orderedStops: orderedStopsWithMeta,
      directions: fullDir,
      detourBudget: { total: bufferM, used: Math.round(totalExtraM), remaining: Math.max(0, bufferM - totalExtraM) },
    });

    // Generate label
    const label = index === 0 ? 'Recommended' : `Alternative ${index}`;
    const isRecommended = index === 0;

    return {
      id: cluster.id,
      label,
      isRecommended,
      totalTimeMin: fullDir.totalDurationMin,
      totalDistanceMi: fullDir.totalDistanceM / 1609.34,
      extraTimeMin: cluster.extraMinutes,
      clusterRadiusKm: cluster.maxPairwiseDistanceM / 1000,
      stops: orderedStops.map(s => ({
        name: s.name,
        address: s.address,
        location: s.location,
        placeId: s.placeId,
      })),
      route,
    };
  }

  /**
   * Evaluate clusters by calculating actual driving time for each.
   * PARALLELIZED: All clusters are evaluated concurrently for faster response.
   */
  private async evaluateClustersWithDrivingTime(
    clusters: StopCluster[],
    origin: Coordinates,
    destination: Coordinates,
    directDurationMin: number,
  ): Promise<Array<StopCluster & { totalDurationMin: number; extraMinutes: number }>> {
    this.logger.log(`[evaluateClusters] Evaluating ${clusters.length} clusters in parallel...`);
    const startTime = Date.now();

    // Evaluate all clusters in parallel
    const evaluationPromises = clusters.map(async (cluster) => {
      try {
        // Optimize stop order within cluster
        const stopInputs = cluster.stops.map(s => ({ id: s.placeId, location: s.location }));
        const opt = this.optimization.optimizeStopOrder(origin, destination, stopInputs);
        const orderedLocs = (opt.sequence.filter((x): x is string => x !== 'start' && x !== 'end'))
          .map(id => stopInputs.find(s => s.id === id)!.location);

        // Get actual driving time
        const dir = await this.maps.getDirections(origin, destination, orderedLocs);
        if (dir) {
          const extraMinutes = Math.max(0, dir.totalDurationMin - directDurationMin);
          this.logger.log(`[evaluateClusters] Cluster ${cluster.id}: ${dir.totalDurationMin.toFixed(1)}min total, +${extraMinutes.toFixed(1)}min detour`);
          return {
            ...cluster,
            totalDurationMin: dir.totalDurationMin,
            extraMinutes,
          };
        }
        return null;
      } catch (error) {
        this.logger.warn(`[evaluateClusters] Failed to evaluate cluster ${cluster.id}: ${error}`);
        return null;
      }
    });

    // Wait for all evaluations to complete
    const results = await Promise.all(evaluationPromises);

    // Filter out failed evaluations and sort by total duration
    const evaluated = results
      .filter((r): r is StopCluster & { totalDurationMin: number; extraMinutes: number } => r !== null)
      .sort((a, b) => a.totalDurationMin - b.totalDurationMin);

    const elapsed = Date.now() - startTime;
    this.logger.log(`[evaluateClusters] Parallel evaluation completed in ${elapsed}ms (${evaluated.length} successful)`);

    return evaluated;
  }

  /**
   * Build ordered stops with detour metadata.
   */
  private buildOrderedStopsWithMeta(
    orderedStops: PlaceCandidate[],
    origin: Coordinates,
    destination: Coordinates,
    fullDir: Awaited<ReturnType<GoogleMapsService['getDirections']>>,
    bufferM: number,
  ): Array<{
    place: PlaceCandidate;
    detourCostM: number;
    status: ReturnType<DetourBufferService['getDetourStatus']>;
    order: number;
  }> {
    const result: Array<{
      place: PlaceCandidate;
      detourCostM: number;
      status: ReturnType<DetourBufferService['getDetourStatus']>;
      order: number;
    }> = [];

    for (let i = 0; i < orderedStops.length; i++) {
      const prev = i === 0 ? origin : orderedStops[i - 1].location;
      const next = i === orderedStops.length - 1 ? destination : orderedStops[i + 1].location;
      const legIn = fullDir?.legs[i]?.distanceM ?? 0;
      const legOut = fullDir?.legs[i + 1]?.distanceM ?? 0;
      const directSeg = haversineM(prev, next);
      const detourCostM = Math.max(0, legIn + legOut - directSeg);
      const status = this.detour.getDetourStatus(detourCostM, bufferM);

      result.push({
        place: orderedStops[i],
        detourCostM,
        status,
        order: i + 1,
      });
    }

    return result;
  }

  /**
   * Fallback to individual stop selection when clustering fails.
   */
  private async fallbackToIndividualStops(
    inp: NavigateWithStopsIn,
    dest: { name: string; location: Coordinates },
    routeCorridor: Awaited<ReturnType<RouteCorridorService['extractCorridor']>>,
    bufferM: number,
    excluded: Array<{ name: string; reason: string }>,
  ): Promise<{
    route: ReturnType<RouteBuilderService['build']>;
    routeOptions: RouteOption[];
    excludedStops?: Array<{ name: string; reason: string }>;
    warnings?: Array<{ stopName: string; message: string; detourMinutes: number; category: DetourCategory }>;
    destination: { name: string; location: Coordinates };
    directTimeMin: number;
  }> {
    this.logger.log(`[fallbackToIndividualStops] Using legacy individual stop selection`);

    const resolved = await this.entity.resolveStops(
      inp.stops.map(s => s.name),
      inp.origin,
      bufferM,
      { destination: dest.location },
    );

    if (resolved.length === 0) {
      const direct = await this.maps.getDirections(inp.origin, dest.location);
      const route = this.routeBuilder.build({
        origin: { name: 'Origin', location: inp.origin },
        destination: { name: dest.name, location: dest.location },
        orderedStops: [],
        directions: direct!,
        detourBudget: { total: bufferM, used: 0, remaining: bufferM },
      });
      const directOption: RouteOption = {
        id: 'direct',
        label: 'Direct Route',
        isRecommended: true,
        totalTimeMin: direct!.totalDurationMin,
        totalDistanceMi: direct!.totalDistanceM / 1609.34,
        extraTimeMin: 0,
        clusterRadiusKm: 0,
        stops: [],
        route,
      };
      return {
        route,
        routeOptions: [directOption],
        excludedStops: excluded,
        destination: dest,
        directTimeMin: routeCorridor.totalDurationMin,
      };
    }

    const stopInputs = resolved.map(r => ({ id: r.place.placeId, location: r.place.location }));
    const opt = this.optimization.optimizeStopOrder(inp.origin, dest.location, stopInputs);
    const waypointLocs = (opt.sequence.filter((x): x is string => x !== 'start' && x !== 'end'))
      .map(id => stopInputs.find(s => s.id === id)!.location);

    const fullDir = await this.maps.getDirections(inp.origin, dest.location, waypointLocs);
    if (!fullDir) throw new Error('Could not get route with stops');

    const orderedResolved = opt.sequence
      .filter((x): x is string => x !== 'start' && x !== 'end')
      .map(id => resolved.find(r => r.place.placeId === id)!);

    const orderedStopsWithMeta = this.buildOrderedStopsWithMeta(
      orderedResolved.map(r => r.place),
      inp.origin,
      dest.location,
      fullDir,
      bufferM,
    );

    const totalExtraM = Math.max(0, fullDir.totalDistanceM - routeCorridor.totalDistanceM);
    const totalDetourMinutes = Math.max(0, fullDir.totalDurationMin - routeCorridor.totalDurationMin);
    const detourCategory = this.detour.getDetourCategory(totalDetourMinutes);

    const warnings: Array<{ stopName: string; message: string; detourMinutes: number; category: DetourCategory }> = [];
    if (detourCategory !== 'MINIMAL') {
      warnings.push({
        stopName: 'Total trip',
        message: this.detour.getWarningMessage(detourCategory, totalDetourMinutes),
        detourMinutes: totalDetourMinutes,
        category: detourCategory,
      });
    }

    const route = this.routeBuilder.build({
      origin: { name: 'Origin', location: inp.origin },
      destination: { name: dest.name, location: dest.location },
      orderedStops: orderedStopsWithMeta,
      directions: fullDir,
      detourBudget: { total: bufferM, used: Math.round(totalExtraM), remaining: Math.max(0, bufferM - totalExtraM) },
    });

    // Build single route option for fallback
    const fallbackOption: RouteOption = {
      id: 'fallback',
      label: 'Recommended',
      isRecommended: true,
      totalTimeMin: fullDir.totalDurationMin,
      totalDistanceMi: fullDir.totalDistanceM / 1609.34,
      extraTimeMin: totalDetourMinutes,
      clusterRadiusKm: 0, // Not cluster-based
      stops: orderedResolved.map(r => ({
        name: r.place.name,
        address: r.place.address,
        location: r.place.location,
        placeId: r.place.placeId,
      })),
      route,
    };

    return {
      route,
      routeOptions: [fallbackOption],
      excludedStops: excluded.length ? excluded : undefined,
      warnings: warnings.length ? warnings : undefined,
      destination: dest,
      directTimeMin: routeCorridor.totalDurationMin,
    };
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
