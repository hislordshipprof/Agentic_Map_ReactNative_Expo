/**
 * API Services Index - Agentic Mobile Map
 *
 * Central export for all API services.
 */

// API Client
export { apiClient, setAuthToken, getAuthToken, checkBackendConnectivity } from './client';

// Query keys for TanStack Query
export { queryKeys } from './queryKeys';

// TanStack Query hooks
export { useAnchors, useNavigateWithStops } from './hooks';

// Errand API (route planning)
export { errandApi } from './errand';

// Places API (search, disambiguation)
export {
  placesApi,
  type PlaceSearchRequest,
  type PlaceSearchResponse,
  type DisambiguateRequest,
  type DisambiguateResponse,
  type PlaceDetailsResponse,
} from './places';

// User API (profile, anchors, preferences)
export {
  userApi,
  type UserProfileResponse,
  type AnchorsResponse,
  type SaveAnchorRequest,
} from './user';

/**
 * Unified API object for convenience
 */
export const api = {
  errand: require('./errand').errandApi,
  places: require('./places').placesApi,
  user: require('./user').userApi,
};
