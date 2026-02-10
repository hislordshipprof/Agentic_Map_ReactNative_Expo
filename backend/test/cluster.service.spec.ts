import { ClusterService } from '../src/modules/errand/services/cluster.service';
import type { RouteCorridor } from '../src/modules/errand/services/route-corridor.service';
import type { CategoryCandidates } from '../src/modules/errand/services/entity-resolver.service';
import type { PlaceCandidate } from '../src/modules/places/google-places.service';

describe('ClusterService', () => {
  let service: ClusterService;

  const mockCorridor: RouteCorridor = {
    polyline: 'encoded',
    decodedPath: [
      { lat: 39.0, lng: -104.0 },
      { lat: 39.5, lng: -104.5 },
      { lat: 40.0, lng: -105.0 },
    ],
    corridorPoints: [
      { lat: 39.0, lng: -104.0, distanceFromOriginM: 0 },
      { lat: 39.5, lng: -104.5, distanceFromOriginM: 50000 },
      { lat: 40.0, lng: -105.0, distanceFromOriginM: 100000 },
    ],
    totalDistanceM: 100000,
    totalDurationMin: 60,
    origin: { lat: 39.0, lng: -104.0 },
    destination: { lat: 40.0, lng: -105.0 },
  };

  const createPlace = (id: string, name: string, lat: number, lng: number): PlaceCandidate => ({
    placeId: id,
    name,
    location: { lat, lng },
    rating: 4.0,
    isOpen: true,
  });

  beforeEach(() => {
    service = new ClusterService();
  });

  describe('detectClusters', () => {
    it('should return empty array for empty candidates', () => {
      const result = service.detectClusters({}, mockCorridor);
      expect(result).toEqual([]);
    });

    it('should handle single category with multiple candidates', () => {
      const candidates: CategoryCandidates = {
        Walmart: [
          createPlace('w1', 'Walmart 1', 39.2, -104.2),
          createPlace('w2', 'Walmart 2', 39.4, -104.4),
        ],
      };

      const result = service.detectClusters(candidates, mockCorridor);

      expect(result.length).toBe(2);
      expect(result[0].stops.length).toBe(1);
      expect(result[0].categories).toEqual(['Walmart']);
    });

    it('should find clusters for two categories', () => {
      const candidates: CategoryCandidates = {
        Walmart: [
          createPlace('w1', 'Walmart 1', 39.2, -104.2),
          createPlace('w2', 'Walmart 2', 39.8, -104.8),
        ],
        Target: [
          createPlace('t1', 'Target 1', 39.21, -104.21), // Close to w1
          createPlace('t2', 'Target 2', 39.79, -104.79), // Close to w2
        ],
      };

      const result = service.detectClusters(candidates, mockCorridor);

      // Should have 4 combinations (2 Walmart × 2 Target)
      expect(result.length).toBe(4);

      // Best cluster should have stops that are close together
      const bestCluster = result[0];
      expect(bestCluster.stops.length).toBe(2);
      expect(bestCluster.maxPairwiseDistanceM).toBeLessThan(10000); // Less than 10km
    });

    it('should rank tighter clusters higher', () => {
      // Create two scenarios:
      // Scenario 1: Walmart and Target very close (same shopping center)
      // Scenario 2: Walmart and Target far apart
      const candidates: CategoryCandidates = {
        Walmart: [
          createPlace('w-close', 'Walmart Close', 39.5, -104.5),
          createPlace('w-far', 'Walmart Far', 39.0, -104.0),
        ],
        Target: [
          createPlace('t-close', 'Target Close', 39.501, -104.501), // ~100m from w-close
          createPlace('t-far', 'Target Far', 40.0, -105.0), // ~111km from w-far
        ],
      };

      const result = service.detectClusters(candidates, mockCorridor);

      // The cluster with close stores should rank first
      const bestCluster = result[0];
      expect(bestCluster.stops.some(s => s.name === 'Walmart Close')).toBe(true);
      expect(bestCluster.stops.some(s => s.name === 'Target Close')).toBe(true);
    });

    it('should handle three categories', () => {
      const candidates: CategoryCandidates = {
        Walmart: [createPlace('w1', 'Walmart', 39.3, -104.3)],
        Target: [createPlace('t1', 'Target', 39.31, -104.31)],
        Starbucks: [createPlace('s1', 'Starbucks', 39.32, -104.32)],
      };

      const result = service.detectClusters(candidates, mockCorridor);

      expect(result.length).toBe(1);
      expect(result[0].stops.length).toBe(3);
      expect(result[0].categories).toEqual(['Walmart', 'Target', 'Starbucks']);
    });

    it('should skip categories with no candidates', () => {
      const candidates: CategoryCandidates = {
        Walmart: [createPlace('w1', 'Walmart', 39.3, -104.3)],
        Target: [], // Empty
        Starbucks: [createPlace('s1', 'Starbucks', 39.31, -104.31)],
      };

      const result = service.detectClusters(candidates, mockCorridor);

      // Should only include Walmart and Starbucks
      expect(result.length).toBeGreaterThan(0);
      expect(result[0].categories).toEqual(['Walmart', 'Starbucks']);
    });

    it('should respect maxClusters config', () => {
      const candidates: CategoryCandidates = {
        Walmart: [
          createPlace('w1', 'Walmart 1', 39.2, -104.2),
          createPlace('w2', 'Walmart 2', 39.4, -104.4),
          createPlace('w3', 'Walmart 3', 39.6, -104.6),
        ],
        Target: [
          createPlace('t1', 'Target 1', 39.21, -104.21),
          createPlace('t2', 'Target 2', 39.41, -104.41),
          createPlace('t3', 'Target 3', 39.61, -104.61),
        ],
      };

      const result = service.detectClusters(candidates, mockCorridor, { maxClusters: 3 });

      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should prune candidates when combinations exceed limit', () => {
      // Create many candidates to trigger pruning
      const candidates: CategoryCandidates = {
        Walmart: Array.from({ length: 10 }, (_, i) =>
          createPlace(`w${i}`, `Walmart ${i}`, 39 + i * 0.1, -104 - i * 0.1)
        ),
        Target: Array.from({ length: 10 }, (_, i) =>
          createPlace(`t${i}`, `Target ${i}`, 39 + i * 0.1, -104 - i * 0.1)
        ),
        Starbucks: Array.from({ length: 10 }, (_, i) =>
          createPlace(`s${i}`, `Starbucks ${i}`, 39 + i * 0.1, -104 - i * 0.1)
        ),
      };

      // 10 × 10 × 10 = 1000 combinations, should trigger pruning at 500
      const result = service.detectClusters(candidates, mockCorridor, { maxCombinations: 500 });

      // Should still return results without error
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('cluster metrics', () => {
    it('should calculate correct centroid', () => {
      const candidates: CategoryCandidates = {
        A: [createPlace('a', 'A', 39.0, -104.0)],
        B: [createPlace('b', 'B', 40.0, -105.0)],
      };

      const result = service.detectClusters(candidates, mockCorridor);
      const cluster = result[0];

      // Centroid should be midpoint
      expect(cluster.centroid.lat).toBeCloseTo(39.5, 1);
      expect(cluster.centroid.lng).toBeCloseTo(-104.5, 1);
    });

    it('should calculate correct maxPairwiseDistance', () => {
      const candidates: CategoryCandidates = {
        A: [createPlace('a', 'A', 39.0, -104.0)],
        B: [createPlace('b', 'B', 39.0, -104.0)], // Same location
      };

      const result = service.detectClusters(candidates, mockCorridor);
      const cluster = result[0];

      expect(cluster.maxPairwiseDistanceM).toBe(0);
    });

    it('should calculate distance from route correctly', () => {
      // Place cluster directly on route
      const candidates: CategoryCandidates = {
        A: [createPlace('a', 'A', 39.5, -104.5)], // Middle of route
      };

      const result = service.detectClusters(candidates, mockCorridor);
      const cluster = result[0];

      // Should be very close to route
      expect(cluster.distanceFromRouteM).toBeLessThan(1000);
    });
  });
});
