import { Injectable, Logger } from '@nestjs/common';
import type { Coordinates } from '../../../common/types';
import { GoogleMapsService, type DirectionsResult } from '../../maps/google-maps.service';

/**
 * A point along the route corridor used as a search anchor.
 */
export interface CorridorPoint {
  lat: number;
  lng: number;
  distanceFromOriginM: number;
}

/**
 * Represents the driving route corridor with sampled points for searching.
 */
export interface RouteCorridor {
  polyline: string;
  decodedPath: Coordinates[];
  corridorPoints: CorridorPoint[];
  totalDistanceM: number;
  totalDurationMin: number;
  origin: Coordinates;
  destination: Coordinates;
}

/**
 * Configuration for corridor extraction.
 */
export interface CorridorConfig {
  /** Distance between corridor points in meters (default: 2000m) */
  samplingIntervalM?: number;
  /** Maximum number of corridor points (default: 25) */
  maxPoints?: number;
  /** Minimum number of corridor points for short routes (default: 3) */
  minPoints?: number;
}

const DEFAULT_CONFIG: Required<CorridorConfig> = {
  samplingIntervalM: 2000,
  maxPoints: 25,
  minPoints: 3,
};

@Injectable()
export class RouteCorridorService {
  private readonly logger = new Logger(RouteCorridorService.name);

  constructor(private readonly maps: GoogleMapsService) {}

  /**
   * Extract a route corridor from origin to destination.
   * Returns the polyline, decoded path, and sampled corridor points for searching.
   */
  async extractCorridor(
    origin: Coordinates,
    destination: Coordinates,
    config?: CorridorConfig,
  ): Promise<RouteCorridor> {
    const cfg = { ...DEFAULT_CONFIG, ...config };

    this.logger.log(`[extractCorridor] Getting route: (${origin.lat}, ${origin.lng}) -> (${destination.lat}, ${destination.lng})`);

    const directions = await this.maps.getDirections(origin, destination);
    if (!directions) {
      throw new Error('Could not get directions for corridor extraction');
    }

    this.logger.log(`[extractCorridor] Route: ${(directions.totalDistanceM / 1609.34).toFixed(1)}mi, ${directions.totalDurationMin}min`);

    const decodedPath = this.decodePolyline(directions.polyline);
    this.logger.log(`[extractCorridor] Decoded polyline: ${decodedPath.length} points`);

    const corridorPoints = this.sampleCorridorPoints(decodedPath, cfg);
    this.logger.log(`[extractCorridor] Sampled ${corridorPoints.length} corridor points`);

    return {
      polyline: directions.polyline,
      decodedPath,
      corridorPoints,
      totalDistanceM: directions.totalDistanceM,
      totalDurationMin: directions.totalDurationMin,
      origin,
      destination,
    };
  }

  /**
   * Decode a Google Maps encoded polyline into an array of coordinates.
   * Implementation of the Polyline Algorithm:
   * https://developers.google.com/maps/documentation/utilities/polylinealgorithm
   */
  decodePolyline(encoded: string): Coordinates[] {
    if (!encoded || encoded.length === 0) {
      return [];
    }

    const points: Coordinates[] = [];
    let index = 0;
    let lat = 0;
    let lng = 0;

    while (index < encoded.length) {
      // Decode latitude
      let shift = 0;
      let result = 0;
      let byte: number;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
      lat += deltaLat;

      // Decode longitude
      shift = 0;
      result = 0;

      do {
        byte = encoded.charCodeAt(index++) - 63;
        result |= (byte & 0x1f) << shift;
        shift += 5;
      } while (byte >= 0x20);

      const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
      lng += deltaLng;

      points.push({
        lat: lat / 1e5,
        lng: lng / 1e5,
      });
    }

    return points;
  }

  /**
   * Sample corridor points at regular intervals along the decoded path.
   * Always includes origin (first point) and destination (last point).
   */
  private sampleCorridorPoints(
    path: Coordinates[],
    config: Required<CorridorConfig>,
  ): CorridorPoint[] {
    if (path.length === 0) {
      return [];
    }

    if (path.length === 1) {
      return [{ ...path[0], distanceFromOriginM: 0 }];
    }

    const points: CorridorPoint[] = [];
    let accumulatedDistanceM = 0;
    let lastSampledDistanceM = 0;

    // Always include the origin
    points.push({
      lat: path[0].lat,
      lng: path[0].lng,
      distanceFromOriginM: 0,
    });

    // Walk through the path and sample points at intervals
    for (let i = 1; i < path.length; i++) {
      const segmentDistanceM = this.haversineM(path[i - 1], path[i]);
      accumulatedDistanceM += segmentDistanceM;

      // Check if we've traveled far enough to sample a new point
      const distanceSinceLastSample = accumulatedDistanceM - lastSampledDistanceM;

      if (distanceSinceLastSample >= config.samplingIntervalM) {
        // Don't add if we're too close to the end (will add destination separately)
        const remainingDistance = this.calculateTotalDistance(path.slice(i)) ;
        if (remainingDistance > config.samplingIntervalM * 0.5) {
          points.push({
            lat: path[i].lat,
            lng: path[i].lng,
            distanceFromOriginM: accumulatedDistanceM,
          });
          lastSampledDistanceM = accumulatedDistanceM;
        }

        // Check if we've hit max points (reserve 1 for destination)
        if (points.length >= config.maxPoints - 1) {
          break;
        }
      }
    }

    // Always include the destination (last point)
    const totalDistance = this.calculateTotalDistance(path);
    const lastPoint = path[path.length - 1];

    // Only add if not too close to last sampled point
    if (points.length === 1 ||
        this.haversineM(points[points.length - 1], lastPoint) > config.samplingIntervalM * 0.3) {
      points.push({
        lat: lastPoint.lat,
        lng: lastPoint.lng,
        distanceFromOriginM: totalDistance,
      });
    }

    // Ensure minimum points for short routes
    if (points.length < config.minPoints && path.length >= config.minPoints) {
      return this.sampleUniformPoints(path, config.minPoints);
    }

    return points;
  }

  /**
   * Sample a fixed number of uniformly distributed points along the path.
   * Used for short routes where interval-based sampling produces too few points.
   */
  private sampleUniformPoints(path: Coordinates[], numPoints: number): CorridorPoint[] {
    if (path.length <= numPoints) {
      let dist = 0;
      return path.map((p, i) => {
        if (i > 0) {
          dist += this.haversineM(path[i - 1], path[i]);
        }
        return { lat: p.lat, lng: p.lng, distanceFromOriginM: dist };
      });
    }

    const totalDistance = this.calculateTotalDistance(path);
    const interval = totalDistance / (numPoints - 1);
    const points: CorridorPoint[] = [];

    // Always include origin
    points.push({ lat: path[0].lat, lng: path[0].lng, distanceFromOriginM: 0 });

    let accumulatedDistance = 0;
    let pathIndex = 1;

    for (let i = 1; i < numPoints - 1; i++) {
      const targetDistance = interval * i;

      // Walk along path until we reach or pass the target distance
      while (pathIndex < path.length) {
        const segmentDistance = this.haversineM(path[pathIndex - 1], path[pathIndex]);

        if (accumulatedDistance + segmentDistance >= targetDistance) {
          // Interpolate to find exact point
          const ratio = (targetDistance - accumulatedDistance) / segmentDistance;
          const interpolated = this.interpolatePoint(path[pathIndex - 1], path[pathIndex], ratio);
          points.push({
            lat: interpolated.lat,
            lng: interpolated.lng,
            distanceFromOriginM: targetDistance,
          });
          break;
        }

        accumulatedDistance += segmentDistance;
        pathIndex++;
      }
    }

    // Always include destination
    const lastPoint = path[path.length - 1];
    points.push({
      lat: lastPoint.lat,
      lng: lastPoint.lng,
      distanceFromOriginM: totalDistance,
    });

    return points;
  }

  /**
   * Interpolate between two points.
   */
  private interpolatePoint(a: Coordinates, b: Coordinates, ratio: number): Coordinates {
    return {
      lat: a.lat + (b.lat - a.lat) * ratio,
      lng: a.lng + (b.lng - a.lng) * ratio,
    };
  }

  /**
   * Calculate total distance of a path in meters.
   */
  private calculateTotalDistance(path: Coordinates[]): number {
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += this.haversineM(path[i - 1], path[i]);
    }
    return total;
  }

  /**
   * Calculate haversine distance between two points in meters.
   */
  private haversineM(a: Coordinates, b: Coordinates): number {
    const R = 6371000; // Earth radius in meters
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

  /**
   * Find the nearest corridor point to a given location.
   */
  findNearestCorridorPoint(location: Coordinates, corridor: RouteCorridor): CorridorPoint {
    let nearest = corridor.corridorPoints[0];
    let minDistance = this.haversineM(location, nearest);

    for (const point of corridor.corridorPoints) {
      const distance = this.haversineM(location, point);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = point;
      }
    }

    return nearest;
  }

  /**
   * Calculate the minimum distance from a point to the route corridor.
   * Returns the distance to the nearest point on the decoded path.
   */
  distanceToRoute(location: Coordinates, corridor: RouteCorridor): number {
    if (corridor.decodedPath.length === 0) {
      return Infinity;
    }

    let minDistance = Infinity;

    // Check distance to each segment of the path
    for (let i = 0; i < corridor.decodedPath.length - 1; i++) {
      const segmentDist = this.pointToSegmentDistance(
        location,
        corridor.decodedPath[i],
        corridor.decodedPath[i + 1],
      );
      if (segmentDist < minDistance) {
        minDistance = segmentDist;
      }
    }

    return minDistance;
  }

  /**
   * Calculate the distance from a point to a line segment.
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
   * Calculate the projection parameter of point P onto segment AB.
   * Returns t where 0 = at A, 1 = at B, <0 = before A, >1 = after B.
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
}
