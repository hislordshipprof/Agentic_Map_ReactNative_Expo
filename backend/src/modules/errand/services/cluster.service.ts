import { Injectable, Logger } from '@nestjs/common';
import type { Coordinates } from '../../../common/types';
import type { PlaceCandidate } from '../../places/google-places.service';
import type { CategoryCandidates } from './entity-resolver.service';
import type { RouteCorridor } from './route-corridor.service';

/**
 * A cluster of stops (one from each category) that are geographically close together.
 */
export interface StopCluster {
  /** Unique cluster identifier */
  id: string;
  /** One stop per category */
  stops: PlaceCandidate[];
  /** Category names in order */
  categories: string[];
  /** Geographic center of the cluster */
  centroid: Coordinates;
  /** Maximum distance from centroid to any stop (meters) */
  radiusM: number;
  /** Maximum distance between any two stops in the cluster (meters) */
  maxPairwiseDistanceM: number;
  /** Distance from centroid to nearest point on route (meters) */
  distanceFromRouteM: number;
  /** Cluster score (lower is better) */
  score: number;
}

/**
 * Configuration for cluster detection.
 */
export interface ClusterConfig {
  /** Weight for cluster tightness in scoring (0-1, default: 0.5) */
  tightnessWeight?: number;
  /** Weight for route proximity in scoring (0-1, default: 0.5) */
  routeProximityWeight?: number;
  /** Maximum number of clusters to return (default: 10) */
  maxClusters?: number;
  /** Maximum combinations to evaluate before pruning (default: 500) */
  maxCombinations?: number;
}

const DEFAULT_CONFIG: Required<ClusterConfig> = {
  tightnessWeight: 0.5,
  routeProximityWeight: 0.5,
  maxClusters: 10,
  maxCombinations: 500,
};

@Injectable()
export class ClusterService {
  private readonly logger = new Logger(ClusterService.name);

  /**
   * Detect and rank stop clusters from category candidates.
   * Finds combinations of stops (one from each category) that are geographically close together.
   */
  detectClusters(
    candidates: CategoryCandidates,
    corridor: RouteCorridor,
    config?: ClusterConfig,
  ): StopCluster[] {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    const categories = Object.keys(candidates);

    this.logger.log(`[detectClusters] ========== CLUSTER DETECTION START ==========`);
    this.logger.log(`[detectClusters] Categories: ${categories.join(', ')}`);

    // Log candidate counts
    for (const cat of categories) {
      this.logger.log(`[detectClusters] ${cat}: ${candidates[cat].length} candidates`);
    }

    // Handle edge cases
    if (categories.length === 0) {
      this.logger.log(`[detectClusters] No categories, returning empty`);
      return [];
    }

    if (categories.length === 1) {
      // Single category - each candidate is its own "cluster"
      return this.createSingleCategoryClusters(candidates[categories[0]], categories[0], corridor, cfg);
    }

    // Check if any category has no candidates
    for (const cat of categories) {
      if (candidates[cat].length === 0) {
        this.logger.warn(`[detectClusters] Category "${cat}" has no candidates`);
        // Remove empty category and continue with remaining
        const filteredCandidates = { ...candidates };
        delete filteredCandidates[cat];
        return this.detectClusters(filteredCandidates, corridor, cfg);
      }
    }

    // Calculate total combinations
    const totalCombinations = categories.reduce((acc, cat) => acc * candidates[cat].length, 1);
    this.logger.log(`[detectClusters] Total possible combinations: ${totalCombinations}`);

    // If too many combinations, prune candidates first
    let workingCandidates = candidates;
    if (totalCombinations > cfg.maxCombinations) {
      this.logger.log(`[detectClusters] Pruning candidates (too many combinations)`);
      workingCandidates = this.pruneCandidates(candidates, corridor, cfg.maxCombinations);
    }

    // Generate all combinations
    const combinations = this.generateCombinations(workingCandidates, categories);
    this.logger.log(`[detectClusters] Evaluating ${combinations.length} combinations`);

    // Score each combination
    const clusters: StopCluster[] = [];
    for (let i = 0; i < combinations.length; i++) {
      const combo = combinations[i];
      const cluster = this.evaluateCluster(combo, categories, corridor, cfg, i);
      clusters.push(cluster);
    }

    // Sort by score (lower is better)
    clusters.sort((a, b) => a.score - b.score);

    // Return top N
    const topClusters = clusters.slice(0, cfg.maxClusters);

    this.logger.log(`[detectClusters] ========== TOP CLUSTERS ==========`);
    topClusters.slice(0, 5).forEach((c, i) => {
      this.logger.log(`[detectClusters] #${i + 1}: score=${c.score.toFixed(2)}, radius=${(c.radiusM / 1000).toFixed(1)}km, routeDist=${(c.distanceFromRouteM / 1000).toFixed(1)}km`);
      this.logger.log(`[detectClusters]     stops: ${c.stops.map(s => s.name).join(', ')}`);
    });
    this.logger.log(`[detectClusters] ========== CLUSTER DETECTION END ==========`);

    return topClusters;
  }

  /**
   * Create clusters for single-category search (each candidate is its own cluster).
   */
  private createSingleCategoryClusters(
    places: PlaceCandidate[],
    category: string,
    corridor: RouteCorridor,
    cfg: Required<ClusterConfig>,
  ): StopCluster[] {
    return places.map((place, i) => {
      const distFromRoute = this.distanceToRoute(place.location, corridor);
      return {
        id: `cluster-single-${i}`,
        stops: [place],
        categories: [category],
        centroid: place.location,
        radiusM: 0,
        maxPairwiseDistanceM: 0,
        distanceFromRouteM: distFromRoute,
        score: distFromRoute * cfg.routeProximityWeight,
      };
    }).sort((a, b) => a.score - b.score).slice(0, cfg.maxClusters);
  }

  /**
   * Prune candidates to reduce combinations while keeping the best options.
   */
  private pruneCandidates(
    candidates: CategoryCandidates,
    corridor: RouteCorridor,
    maxCombinations: number,
  ): CategoryCandidates {
    const categories = Object.keys(candidates);
    const counts = categories.map(cat => candidates[cat].length);

    // Calculate how many to keep per category to stay under limit
    // Aim for equal reduction across categories
    const targetPerCategory = Math.floor(Math.pow(maxCombinations, 1 / categories.length));
    const maxPerCategory = Math.max(3, Math.min(targetPerCategory, 10));

    this.logger.log(`[pruneCandidates] Reducing to max ${maxPerCategory} per category`);

    const pruned: CategoryCandidates = {};

    for (const cat of categories) {
      if (candidates[cat].length <= maxPerCategory) {
        pruned[cat] = candidates[cat];
      } else {
        // Score by distance to route and keep closest
        const scored = candidates[cat].map(place => ({
          place,
          routeDist: this.distanceToRoute(place.location, corridor),
        }));
        scored.sort((a, b) => a.routeDist - b.routeDist);
        pruned[cat] = scored.slice(0, maxPerCategory).map(s => s.place);
      }
    }

    return pruned;
  }

  /**
   * Generate all combinations of stops (one from each category).
   */
  private generateCombinations(
    candidates: CategoryCandidates,
    categories: string[],
  ): PlaceCandidate[][] {
    if (categories.length === 0) return [[]];

    const [first, ...rest] = categories;
    const restCombos = this.generateCombinations(candidates, rest);

    const result: PlaceCandidate[][] = [];
    for (const place of candidates[first]) {
      for (const combo of restCombos) {
        result.push([place, ...combo]);
      }
    }

    return result;
  }

  /**
   * Evaluate a cluster combination and calculate its metrics.
   */
  private evaluateCluster(
    stops: PlaceCandidate[],
    categories: string[],
    corridor: RouteCorridor,
    cfg: Required<ClusterConfig>,
    index: number,
  ): StopCluster {
    const centroid = this.calculateCentroid(stops);
    const radiusM = this.calculateRadius(stops, centroid);
    const maxPairwiseDistanceM = this.calculateMaxPairwiseDistance(stops);
    const distanceFromRouteM = this.distanceToRoute(centroid, corridor);

    // Calculate score (lower is better)
    // Normalize distances to roughly 0-1 range for fair weighting
    const normalizedTightness = maxPairwiseDistanceM / 10000; // Assume 10km is "bad"
    const normalizedRouteDist = distanceFromRouteM / 10000;   // Assume 10km is "bad"

    const score =
      normalizedTightness * cfg.tightnessWeight +
      normalizedRouteDist * cfg.routeProximityWeight;

    return {
      id: `cluster-${index}`,
      stops,
      categories,
      centroid,
      radiusM,
      maxPairwiseDistanceM,
      distanceFromRouteM,
      score,
    };
  }

  /**
   * Calculate the geographic centroid of a set of stops.
   */
  private calculateCentroid(stops: PlaceCandidate[]): Coordinates {
    if (stops.length === 0) {
      return { lat: 0, lng: 0 };
    }

    const sumLat = stops.reduce((sum, s) => sum + s.location.lat, 0);
    const sumLng = stops.reduce((sum, s) => sum + s.location.lng, 0);

    return {
      lat: sumLat / stops.length,
      lng: sumLng / stops.length,
    };
  }

  /**
   * Calculate the radius (max distance from centroid to any stop).
   */
  private calculateRadius(stops: PlaceCandidate[], centroid: Coordinates): number {
    if (stops.length === 0) return 0;

    let maxDist = 0;
    for (const stop of stops) {
      const dist = this.haversineM(centroid, stop.location);
      if (dist > maxDist) maxDist = dist;
    }

    return maxDist;
  }

  /**
   * Calculate the maximum pairwise distance between any two stops.
   * This is a better measure of cluster "tightness" than radius.
   */
  private calculateMaxPairwiseDistance(stops: PlaceCandidate[]): number {
    if (stops.length <= 1) return 0;

    let maxDist = 0;
    for (let i = 0; i < stops.length; i++) {
      for (let j = i + 1; j < stops.length; j++) {
        const dist = this.haversineM(stops[i].location, stops[j].location);
        if (dist > maxDist) maxDist = dist;
      }
    }

    return maxDist;
  }

  /**
   * Calculate minimum distance from a point to the route corridor.
   */
  private distanceToRoute(location: Coordinates, corridor: RouteCorridor): number {
    if (corridor.decodedPath.length === 0) {
      // Fallback to distance from corridor points
      if (corridor.corridorPoints.length === 0) return Infinity;

      let minDist = Infinity;
      for (const point of corridor.corridorPoints) {
        const dist = this.haversineM(location, point);
        if (dist < minDist) minDist = dist;
      }
      return minDist;
    }

    // Check distance to each segment of the decoded path
    let minDist = Infinity;
    for (let i = 0; i < corridor.decodedPath.length - 1; i++) {
      const segDist = this.pointToSegmentDistance(
        location,
        corridor.decodedPath[i],
        corridor.decodedPath[i + 1],
      );
      if (segDist < minDist) minDist = segDist;
    }

    return minDist;
  }

  /**
   * Calculate distance from point P to line segment AB.
   */
  private pointToSegmentDistance(P: Coordinates, A: Coordinates, B: Coordinates): number {
    const t = this.projectionParam(P, A, B);
    if (t <= 0) return this.haversineM(P, A);
    if (t >= 1) return this.haversineM(P, B);

    const projected = {
      lat: A.lat + t * (B.lat - A.lat),
      lng: A.lng + t * (B.lng - A.lng),
    };
    return this.haversineM(P, projected);
  }

  /**
   * Calculate projection parameter of P onto segment AB.
   */
  private projectionParam(P: Coordinates, A: Coordinates, B: Coordinates): number {
    const dx = B.lat - A.lat;
    const dy = B.lng - A.lng;
    const d2 = dx * dx + dy * dy;
    if (d2 === 0) return 0;

    const vx = P.lat - A.lat;
    const vy = P.lng - A.lng;
    return (vx * dx + vy * dy) / d2;
  }

  /**
   * Calculate haversine distance between two points in meters.
   */
  private haversineM(a: Coordinates, b: Coordinates): number {
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
