import { EntityResolverService } from '../src/modules/errand/services/entity-resolver.service';
import type { RouteCorridor } from '../src/modules/errand/services/route-corridor.service';

describe('EntityResolverService', () => {
  let service: EntityResolverService;
  let mockPlaceSearch: { searchPlaces: jest.Mock };
  let mockMaps: { geocode: jest.Mock };

  beforeEach(() => {
    mockPlaceSearch = {
      searchPlaces: jest.fn(),
    };
    mockMaps = {
      geocode: jest.fn(),
    };
    service = new EntityResolverService(mockMaps as any, mockPlaceSearch as any);
  });

  describe('resolveStopsAlongCorridor', () => {
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

    it('should search for each category from corridor points', async () => {
      mockPlaceSearch.searchPlaces.mockResolvedValue([
        { placeId: 'place1', name: 'Walmart Store', location: { lat: 39.1, lng: -104.1 } },
      ]);

      const result = await service.resolveStopsAlongCorridor(
        ['Walmart'],
        mockCorridor,
        { searchRadiusM: 5000, maxCandidatesPerCategory: 10 },
      );

      expect(result).toHaveProperty('Walmart');
      expect(result['Walmart'].length).toBeGreaterThan(0);
      expect(mockPlaceSearch.searchPlaces).toHaveBeenCalled();
    });

    it('should deduplicate results by placeId', async () => {
      // Return same place from multiple corridor points
      mockPlaceSearch.searchPlaces.mockResolvedValue([
        { placeId: 'same-place', name: 'Walmart', location: { lat: 39.1, lng: -104.1 } },
      ]);

      const result = await service.resolveStopsAlongCorridor(
        ['Walmart'],
        mockCorridor,
        { searchRadiusM: 5000, maxCandidatesPerCategory: 10 },
      );

      // Should only have 1 unique place despite searching from 3 corridor points
      expect(result['Walmart'].length).toBe(1);
    });

    it('should respect maxCandidatesPerCategory limit', async () => {
      // Return different places each time
      let callCount = 0;
      mockPlaceSearch.searchPlaces.mockImplementation(() => {
        callCount++;
        return Promise.resolve([
          { placeId: `place-${callCount}`, name: `Store ${callCount}`, location: { lat: 39.1, lng: -104.1 } },
        ]);
      });

      const result = await service.resolveStopsAlongCorridor(
        ['Walmart'],
        mockCorridor,
        { searchRadiusM: 5000, maxCandidatesPerCategory: 2 },
      );

      // Should stop at 2 candidates
      expect(result['Walmart'].length).toBeLessThanOrEqual(2);
    });

    it('should search for multiple categories', async () => {
      mockPlaceSearch.searchPlaces.mockImplementation((query: string) => {
        if (query === 'Walmart') {
          return Promise.resolve([
            { placeId: 'walmart-1', name: 'Walmart', location: { lat: 39.1, lng: -104.1 } },
          ]);
        }
        if (query === 'Target') {
          return Promise.resolve([
            { placeId: 'target-1', name: 'Target', location: { lat: 39.2, lng: -104.2 } },
          ]);
        }
        return Promise.resolve([]);
      });

      const result = await service.resolveStopsAlongCorridor(
        ['Walmart', 'Target'],
        mockCorridor,
      );

      expect(result).toHaveProperty('Walmart');
      expect(result).toHaveProperty('Target');
      expect(result['Walmart'].length).toBeGreaterThan(0);
      expect(result['Target'].length).toBeGreaterThan(0);
    });

    it('should handle empty search results gracefully', async () => {
      mockPlaceSearch.searchPlaces.mockResolvedValue([]);

      const result = await service.resolveStopsAlongCorridor(
        ['NonexistentStore'],
        mockCorridor,
      );

      expect(result).toHaveProperty('NonexistentStore');
      expect(result['NonexistentStore'].length).toBe(0);
    });

    it('should handle search errors gracefully', async () => {
      mockPlaceSearch.searchPlaces.mockRejectedValue(new Error('API error'));

      const result = await service.resolveStopsAlongCorridor(
        ['Walmart'],
        mockCorridor,
      );

      // Should return empty array for the category, not throw
      expect(result).toHaveProperty('Walmart');
      expect(result['Walmart'].length).toBe(0);
    });
  });

  describe('haversineM', () => {
    it('should calculate distance correctly', () => {
      // ~111km for 1 degree latitude at equator
      const a = { lat: 0, lng: 0 };
      const b = { lat: 1, lng: 0 };
      const distance = service.haversineM(a, b);

      expect(distance).toBeGreaterThan(110000);
      expect(distance).toBeLessThan(112000);
    });

    it('should return 0 for same point', () => {
      const point = { lat: 39.5, lng: -104.5 };
      const distance = service.haversineM(point, point);
      expect(distance).toBe(0);
    });
  });
});
