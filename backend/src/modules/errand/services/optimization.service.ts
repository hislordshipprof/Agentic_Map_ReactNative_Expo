import { Injectable } from '@nestjs/common';
import type { Coordinates } from '../../../common/types';

const METERS_PER_MILE = 1609.34;

function haversineMeters(a: Coordinates, b: Coordinates): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

export interface StopInput {
  id: string;
  location: Coordinates;
}

export interface OptimizationResult {
  sequence: string[];
  totalDistanceM: number;
  legs: Array<{ from: string; to: string; distanceM: number }>;
}

@Injectable()
export class OptimizationService {
  /**
   * Optimize stop order: start -> stops -> end using nearest neighbor.
   * Returns sequence of ids and leg distances (haversine).
   */
  optimizeStopOrder(
    start: Coordinates,
    end: Coordinates,
    stops: StopInput[],
  ): OptimizationResult {
    const order = this.nearestNeighbor(start, end, stops);
    const totalDistanceM = this.calculateTotalDistanceOrdered(start, end, stops, order);
    const legs: Array<{ from: string; to: string; distanceM: number }> = [];
    let prev = start;
    let prevId = 'start';
    for (let i = 0; i < order.length; i++) {
      const idx = order[i];
      const stop = stops[idx];
      const d = haversineMeters(prev, stop.location);
      legs.push({ from: prevId, to: stop.id, distanceM: d });
      prev = stop.location;
      prevId = stop.id;
    }
    legs.push({ from: prevId, to: 'end', distanceM: haversineMeters(prev, end) });
    const sequence = ['start', ...order.map((i) => stops[i].id), 'end'];
    return { sequence, totalDistanceM, legs };
  }

  /**
   * Nearest neighbor: start -> nearest unvisited stop -> ... -> end.
   * Returns indices into stops array in visit order.
   */
  nearestNeighbor(start: Coordinates, end: Coordinates, stops: StopInput[]): number[] {
    const n = stops.length;
    const used = new Set<number>();
    const order: number[] = [];
    let cur: Coordinates = start;

    while (order.length < n) {
      let best = -1;
      let bestD = Infinity;
      for (let i = 0; i < n; i++) {
        if (used.has(i)) continue;
        const d = haversineMeters(cur, stops[i].location);
        if (d < bestD) {
          bestD = d;
          best = i;
        }
      }
      if (best < 0) break;
      order.push(best);
      used.add(best);
      cur = stops[best].location;
    }
    return order;
  }

  /**
   * Total distance in meters for sequence: start -> stops[order[0]] -> ... -> end.
   * Uses haversine for segment distances.
   */
  calculateTotalDistance(
    start: Coordinates,
    end: Coordinates,
    stops: StopInput[],
    order: number[],
  ): number {
    return this.calculateTotalDistanceOrdered(start, end, stops, order);
  }

  private calculateTotalDistanceOrdered(
    start: Coordinates,
    end: Coordinates,
    stops: StopInput[],
    order: number[],
  ): number {
    let d = 0;
    let prev = start;
    for (const i of order) {
      d += haversineMeters(prev, stops[i].location);
      prev = stops[i].location;
    }
    d += haversineMeters(prev, end);
    return d;
  }

  /** Convert meters to miles. */
  metersToMiles(m: number): number {
    return m / METERS_PER_MILE;
  }
}
