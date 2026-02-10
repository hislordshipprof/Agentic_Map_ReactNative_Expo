import { RouteCorridorService } from '../src/modules/errand/services/route-corridor.service';

describe('RouteCorridorService', () => {
  let service: RouteCorridorService;

  beforeEach(() => {
    // Create service with mocked GoogleMapsService
    const mockMapsService = {
      getDirections: jest.fn(),
    };
    service = new RouteCorridorService(mockMapsService as any);
  });

  describe('decodePolyline', () => {
    it('should decode a simple polyline correctly', () => {
      // This is a known test polyline: "_p~iF~ps|U_ulLnnqC_mqNvxq`@"
      // Represents: (38.5, -120.2), (40.7, -120.95), (43.252, -126.453)
      const encoded = '_p~iF~ps|U_ulLnnqC_mqNvxq`@';
      const decoded = service.decodePolyline(encoded);

      expect(decoded).toHaveLength(3);
      expect(decoded[0].lat).toBeCloseTo(38.5, 4);
      expect(decoded[0].lng).toBeCloseTo(-120.2, 4);
      expect(decoded[1].lat).toBeCloseTo(40.7, 4);
      expect(decoded[1].lng).toBeCloseTo(-120.95, 4);
      expect(decoded[2].lat).toBeCloseTo(43.252, 4);
      expect(decoded[2].lng).toBeCloseTo(-126.453, 4);
    });

    it('should return empty array for empty string', () => {
      const decoded = service.decodePolyline('');
      expect(decoded).toHaveLength(0);
    });

    it('should handle single point polyline', () => {
      // Single point at approximately (0, 0)
      const encoded = '??';
      const decoded = service.decodePolyline(encoded);
      expect(decoded).toHaveLength(1);
      expect(decoded[0].lat).toBeCloseTo(0, 4);
      expect(decoded[0].lng).toBeCloseTo(0, 4);
    });
  });

  describe('findNearestCorridorPoint', () => {
    it('should find the nearest corridor point', () => {
      const corridor = {
        polyline: '',
        decodedPath: [],
        corridorPoints: [
          { lat: 39.0, lng: -104.0, distanceFromOriginM: 0 },
          { lat: 39.5, lng: -104.5, distanceFromOriginM: 5000 },
          { lat: 40.0, lng: -105.0, distanceFromOriginM: 10000 },
        ],
        totalDistanceM: 10000,
        totalDurationMin: 10,
        origin: { lat: 39.0, lng: -104.0 },
        destination: { lat: 40.0, lng: -105.0 },
      };

      const location = { lat: 39.4, lng: -104.4 };
      const nearest = service.findNearestCorridorPoint(location, corridor);

      expect(nearest.lat).toBe(39.5);
      expect(nearest.lng).toBe(-104.5);
    });
  });

  describe('distanceToRoute', () => {
    it('should calculate distance to route correctly', () => {
      const corridor = {
        polyline: '',
        decodedPath: [
          { lat: 39.0, lng: -104.0 },
          { lat: 40.0, lng: -104.0 },
        ],
        corridorPoints: [],
        totalDistanceM: 111000, // ~111km for 1 degree latitude
        totalDurationMin: 60,
        origin: { lat: 39.0, lng: -104.0 },
        destination: { lat: 40.0, lng: -104.0 },
      };

      // Point on the route
      const onRoute = { lat: 39.5, lng: -104.0 };
      const distOnRoute = service.distanceToRoute(onRoute, corridor);
      expect(distOnRoute).toBeLessThan(100); // Should be very close to 0

      // Point 1 degree west of the route (~85km at this latitude)
      const offRoute = { lat: 39.5, lng: -105.0 };
      const distOffRoute = service.distanceToRoute(offRoute, corridor);
      expect(distOffRoute).toBeGreaterThan(80000); // Should be ~85km
      expect(distOffRoute).toBeLessThan(90000);
    });

    it('should return Infinity for empty route', () => {
      const corridor = {
        polyline: '',
        decodedPath: [],
        corridorPoints: [],
        totalDistanceM: 0,
        totalDurationMin: 0,
        origin: { lat: 39.0, lng: -104.0 },
        destination: { lat: 40.0, lng: -105.0 },
      };

      const location = { lat: 39.5, lng: -104.5 };
      const distance = service.distanceToRoute(location, corridor);
      expect(distance).toBe(Infinity);
    });
  });
});
