/**
 * TanStack Query key factory for API cache.
 * Use these keys in useQuery/useMutation and invalidateQueries.
 */

const all: readonly ['api'] = ['api'];

export const queryKeys = {
  all,

  anchors: () => [...all, 'anchors'] as const,

  profile: () => [...all, 'user', 'profile'] as const,
  preferences: () => [...all, 'user', 'preferences'] as const,
  history: (limit?: number, offset?: number) =>
    [...all, 'user', 'history', { limit, offset }] as const,

  placeSearch: (query: string, lat?: number, lng?: number) =>
    [...all, 'places', 'search', query, lat, lng] as const,
  placeDetails: (placeId: string) => [...all, 'places', placeId] as const,

  suggestStops: (o: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    categories?: string[];
    limit?: number;
    maxDetourPercent?: number;
  }) => [...all, 'suggestions', o] as const,
};
