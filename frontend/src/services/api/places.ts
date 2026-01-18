/**
 * Places API Service - Agentic Mobile Map
 *
 * API endpoints for place search and disambiguation.
 * Per requirements-frontend.md Key Integration Points:
 * - GET /api/v1/places/search (place search)
 * - GET /api/v1/places/disambiguate (disambiguation)
 */

import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { PlaceCandidate } from '@/components/Dialogs';

/**
 * Place search request
 */
export interface PlaceSearchRequest {
  query: string;
  location?: {
    lat: number;
    lng: number;
  };
  radius?: number; // in meters
  type?: string; // place type filter
  limit?: number;
}

/**
 * Place search response
 */
export interface PlaceSearchResponse {
  places: PlaceCandidate[];
  nextPageToken?: string;
}

/**
 * Disambiguation request
 */
export interface DisambiguateRequest {
  query: string;
  candidates: string[]; // place IDs to disambiguate between
  context?: {
    origin?: { lat: number; lng: number };
    destination?: { lat: number; lng: number };
    userPreferences?: string[];
  };
}

/**
 * Disambiguation response
 */
export interface DisambiguateResponse {
  candidates: PlaceCandidate[];
  recommendedId?: string;
  reason?: string;
}

/**
 * Place details response
 */
export interface PlaceDetailsResponse {
  id: string;
  name: string;
  address: string;
  location: {
    lat: number;
    lng: number;
  };
  types: string[];
  rating?: number;
  reviewCount?: number;
  priceLevel?: number;
  isOpen?: boolean;
  openingHours?: {
    weekdayText: string[];
    periods: Array<{
      open: { day: number; time: string };
      close?: { day: number; time: string };
    }>;
  };
  phoneNumber?: string;
  website?: string;
  photos?: string[];
}

/**
 * Places API endpoints
 */
export const placesApi = {
  /**
   * Search for places
   * GET /api/v1/places/search
   */
  search: async (
    request: PlaceSearchRequest
  ): Promise<ApiResponse<PlaceSearchResponse>> => {
    const params = new URLSearchParams({
      query: request.query,
      ...(request.location && {
        lat: request.location.lat.toString(),
        lng: request.location.lng.toString(),
      }),
      ...(request.radius && { radius: request.radius.toString() }),
      ...(request.type && { type: request.type }),
      ...(request.limit && { limit: request.limit.toString() }),
    });

    return apiClient.get<PlaceSearchResponse>(
      `/places/search?${params.toString()}`
    );
  },

  /**
   * Disambiguate between multiple place options
   * GET /api/v1/places/disambiguate
   */
  disambiguate: async (
    request: DisambiguateRequest
  ): Promise<ApiResponse<DisambiguateResponse>> => {
    return apiClient.post<DisambiguateResponse>('/places/disambiguate', request);
  },

  /**
   * Get place details by ID
   * GET /api/v1/places/:placeId
   */
  getDetails: async (
    placeId: string
  ): Promise<ApiResponse<PlaceDetailsResponse>> => {
    return apiClient.get<PlaceDetailsResponse>(`/places/${placeId}`);
  },

  /**
   * Get nearby places by category
   * GET /api/v1/places/nearby
   */
  getNearby: async (request: {
    location: { lat: number; lng: number };
    category: string;
    radius?: number;
    limit?: number;
  }): Promise<ApiResponse<PlaceSearchResponse>> => {
    const params = new URLSearchParams({
      lat: request.location.lat.toString(),
      lng: request.location.lng.toString(),
      category: request.category,
      ...(request.radius && { radius: request.radius.toString() }),
      ...(request.limit && { limit: request.limit.toString() }),
    });

    return apiClient.get<PlaceSearchResponse>(
      `/places/nearby?${params.toString()}`
    );
  },

  /**
   * Autocomplete place search
   * GET /api/v1/places/autocomplete
   */
  autocomplete: async (request: {
    input: string;
    location?: { lat: number; lng: number };
    sessionToken?: string;
  }): Promise<
    ApiResponse<{
      predictions: Array<{
        placeId: string;
        description: string;
        mainText: string;
        secondaryText: string;
      }>;
    }>
  > => {
    const params = new URLSearchParams({
      input: request.input,
      ...(request.location && {
        lat: request.location.lat.toString(),
        lng: request.location.lng.toString(),
      }),
      ...(request.sessionToken && { sessionToken: request.sessionToken }),
    });

    return apiClient.get(`/places/autocomplete?${params.toString()}`);
  },
};

export default placesApi;
