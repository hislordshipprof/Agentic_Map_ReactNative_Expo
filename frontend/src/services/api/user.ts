/**
 * User API Service - Agentic Mobile Map
 *
 * API endpoints for user management and anchors.
 * Per requirements-frontend.md Key Integration Points:
 * - GET /api/v1/user/anchors (fetch saved locations)
 */

import { apiClient } from './client';
import type { ApiResponse } from '@/types/api';
import type { Anchor, UserPreferences } from '@/types/user';

/**
 * User profile response
 */
export interface UserProfileResponse {
  id: string;
  email?: string;
  displayName?: string;
  isAnonymous: boolean;
  createdAt: string;
  lastActiveAt: string;
}

/**
 * Anchors response
 */
export interface AnchorsResponse {
  anchors: Anchor[];
}

/**
 * Create/update anchor request
 */
export interface SaveAnchorRequest {
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  address?: string;
  type?: 'home' | 'work' | 'gym' | 'custom';
}

/**
 * User API endpoints
 */
export const userApi = {
  /**
   * Get current user profile
   * GET /api/v1/user/profile
   */
  getProfile: async (): Promise<ApiResponse<UserProfileResponse>> => {
    return apiClient.get<UserProfileResponse>('/user/profile');
  },

  /**
   * Get user's saved anchors (home, work, etc.)
   * GET /api/v1/user/anchors
   */
  getAnchors: async (): Promise<ApiResponse<AnchorsResponse>> => {
    return apiClient.get<AnchorsResponse>('/user/anchors');
  },

  /**
   * Save a new anchor
   * POST /api/v1/user/anchors
   */
  saveAnchor: async (
    request: SaveAnchorRequest
  ): Promise<ApiResponse<Anchor>> => {
    return apiClient.post<Anchor>('/user/anchors', request);
  },

  /**
   * Update an existing anchor
   * PUT /api/v1/user/anchors/:anchorId
   */
  updateAnchor: async (
    anchorId: string,
    request: Partial<SaveAnchorRequest>
  ): Promise<ApiResponse<Anchor>> => {
    return apiClient.put<Anchor>(`/user/anchors/${anchorId}`, request);
  },

  /**
   * Delete an anchor
   * DELETE /api/v1/user/anchors/:anchorId
   */
  deleteAnchor: async (anchorId: string): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>(`/user/anchors/${anchorId}`);
  },

  /**
   * Get user preferences
   * GET /api/v1/user/preferences
   */
  getPreferences: async (): Promise<ApiResponse<UserPreferences>> => {
    return apiClient.get<UserPreferences>('/user/preferences');
  },

  /**
   * Update user preferences
   * PATCH /api/v1/user/preferences
   */
  updatePreferences: async (
    preferences: Partial<UserPreferences>
  ): Promise<ApiResponse<UserPreferences>> => {
    return apiClient.patch<UserPreferences>('/user/preferences', preferences);
  },

  /**
   * Get conversation history
   * GET /api/v1/user/history
   */
  getHistory: async (request?: {
    limit?: number;
    offset?: number;
  }): Promise<
    ApiResponse<{
      conversations: Array<{
        id: string;
        utterance: string;
        response: string;
        timestamp: string;
        route?: {
          origin: string;
          destination: string;
          stops: string[];
        };
      }>;
      total: number;
    }>
  > => {
    const params = new URLSearchParams();
    if (request?.limit) params.set('limit', request.limit.toString());
    if (request?.offset) params.set('offset', request.offset.toString());

    const queryString = params.toString();
    return apiClient.get(`/user/history${queryString ? `?${queryString}` : ''}`);
  },

  /**
   * Delete conversation history
   * DELETE /api/v1/user/history
   */
  clearHistory: async (): Promise<ApiResponse<void>> => {
    return apiClient.delete<void>('/user/history');
  },
};

export default userApi;
