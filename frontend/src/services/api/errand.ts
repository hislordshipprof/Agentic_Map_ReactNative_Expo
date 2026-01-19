/**
 * Errand API Service - Agentic Mobile Map
 *
 * API endpoints for errand/route planning.
 * Per requirements-frontend.md Key Integration Points:
 * - POST /api/v1/errand/navigate-with-stops (main endpoint)
 * - GET /api/v1/errand/suggest-stops-on-route (suggestions)
 * - POST /api/escalate-to-llm (low confidence fallback)
 */

import { apiClient } from './client';
import type {
  NavigateWithStopsRequest,
  NavigateWithStopsResponse,
  SuggestStopsRequest,
  SuggestStopsData,
  EscalateToLLMRequest,
  EscalateToLLMResponse,
  NLUProcessRequest,
  NLUProcessResponse,
  ApiResponse,
} from '@/types/api';
import type { Route } from '@/types/route';

/**
 * Errand API endpoints
 */
export const errandApi = {
  /**
   * Main route planning endpoint
   * POST /api/v1/errand/navigate-with-stops
   *
   * Plans a route with multiple stops, optimizing for minimal detour.
   */
  navigateWithStops: async (
    request: NavigateWithStopsRequest
  ): Promise<ApiResponse<NavigateWithStopsResponse>> => {
    return apiClient.post<NavigateWithStopsResponse>(
      '/errand/navigate-with-stops',
      request
    );
  },

  /**
   * Get stop suggestions for a route
   * GET /api/v1/errand/suggest-stops-on-route
   *
   * Returns proactive suggestions for stops along the planned route.
   */
  suggestStops: async (
    request: SuggestStopsRequest
  ): Promise<ApiResponse<SuggestStopsData>> => {
    const limit = request.limit ?? request.maxStops;
    const params = new URLSearchParams({
      originLat: request.origin.lat.toString(),
      originLng: request.origin.lng.toString(),
      destinationLat: request.destination.lat.toString(),
      destinationLng: request.destination.lng.toString(),
      ...(request.categories && { categories: request.categories.join(',') }),
      ...(request.maxDetourPercent && {
        maxDetourPercent: request.maxDetourPercent.toString(),
      }),
      ...(limit != null && { limit: limit.toString() }),
    });

    return apiClient.get<SuggestStopsData>(
      `/errand/suggest-stops-on-route?${params.toString()}`
    );
  },

  /**
   * Process natural language input
   * POST /api/v1/nlu/process
   *
   * Processes user utterance and returns parsed intent/entities.
   */
  processNLU: async (
    request: NLUProcessRequest
  ): Promise<ApiResponse<NLUProcessResponse>> => {
    return apiClient.post<NLUProcessResponse>('/nlu/process', request, {
      timeout: 45000, // Gemini/backend can be slow
    });
  },

  /**
   * Escalate to advanced LLM (Gemini 3.0 Pro)
   * POST /api/escalate-to-llm
   *
   * Called when confidence is low after 2 retries.
   * Uses Gemini 3.0 Pro for complex reasoning.
   */
  escalateToLLM: async (
    request: EscalateToLLMRequest
  ): Promise<ApiResponse<EscalateToLLMResponse>> => {
    return apiClient.post<EscalateToLLMResponse>('/escalate-to-llm', request, {
      timeout: 45000, // Longer timeout for LLM processing
    });
  },

  /**
   * Recalculate route after adjustments
   * POST /api/v1/errand/recalculate
   *
   * Recalculates the route after user modifies stops.
   */
  recalculateRoute: async (request: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    stops: Array<{ placeId: string; lat: number; lng: number }>;
  }): Promise<ApiResponse<{ route: Route }>> => {
    return apiClient.post<{ route: Route }>('/errand/recalculate', request);
  },

  /**
   * Get route preview (without committing)
   * POST /api/v1/errand/preview
   *
   * Returns a preview of the route for display before user confirms.
   */
  previewRoute: async (request: {
    origin: { lat: number; lng: number };
    destination: { lat: number; lng: number };
    stops: Array<{ placeId: string; lat: number; lng: number }>;
  }): Promise<
    ApiResponse<{
      polyline: string;
      totalDistance: number;
      totalDuration: number;
      legs: Array<{
        distance: number;
        duration: number;
        startAddress: string;
        endAddress: string;
      }>;
    }>
  > => {
    return apiClient.post('/errand/preview', request);
  },
};

export default errandApi;
