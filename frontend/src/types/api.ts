/**
 * API Types - Agentic Mobile Map
 *
 * Type definitions for backend API communication.
 * Per CLAUDE.md Core API Endpoints
 */

import { Entities, Intent, NLUResponse } from './nlu';
import { Route, RouteStop, LatLng } from './route';
import { Anchor, UserPreferences } from './user';

/**
 * Base API response wrapper
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: {
    requestId: string;
    timestamp: number;
    processingTime: number;
  };
}

/**
 * API error structure
 */
export interface ApiError {
  code: string;
  message: string;
  status?: number;
  details?: Record<string, unknown>;
  suggestion?: string;
  suggestions?: string[];
}

/**
 * Common API error codes
 */
export const ApiErrorCode = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT',
  UNAUTHORIZED: 'UNAUTHORIZED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RATE_LIMITED: 'RATE_LIMITED',
  NO_PLACES_FOUND: 'NO_PLACES_FOUND',
  ROUTE_EXCEEDS_BUDGET: 'ROUTE_EXCEEDS_BUDGET',
  AMBIGUOUS_DESTINATION: 'AMBIGUOUS_DESTINATION',
  LOCATION_UNAVAILABLE: 'LOCATION_UNAVAILABLE',
  SERVER_ERROR: 'SERVER_ERROR',
} as const;

export type ApiErrorCodeType = typeof ApiErrorCode[keyof typeof ApiErrorCode];

// ============================================
// NLU Endpoints
// ============================================

/**
 * POST /api/v1/nlu/process
 * Process user utterance through NLU
 */
export interface ProcessUtteranceRequest {
  utterance: string;
  /** Current user location */
  currentLocation?: LatLng;
  /** Context from previous turns */
  context?: {
    previousIntent?: Intent;
    previousEntities?: Entities;
    conversationId?: string;
  };
}

export type ProcessUtteranceResponse = ApiResponse<NLUResponse>;

/**
 * POST /api/v1/nlu/escalate
 * Escalate to advanced agent (Gemini 3.0 Pro)
 */
export interface EscalateRequest {
  utterance: string;
  previousAttempts: Array<{
    utterance: string;
    confidence: number;
  }>;
  currentLocation?: LatLng;
}

export type EscalateResponse = ApiResponse<NLUResponse>;

/**
 * NLU Process Request (alias for ProcessUtteranceRequest)
 */
export type NLUProcessRequest = ProcessUtteranceRequest;

/**
 * NLU Process Response
 */
export type NLUProcessResponse = NLUResponse;

/**
 * Escalate to LLM Request (for advanced agent)
 */
export interface EscalateToLLMRequest {
  utterance: string;
  conversationHistory?: Array<{
    role: 'user' | 'system';
    content: string;
  }>;
  currentLocation?: LatLng;
  context?: Record<string, unknown>;
}

/**
 * Escalate to LLM Response
 */
export type EscalateToLLMResponse = NLUResponse;

// ============================================
// Route Endpoints
// ============================================

/**
 * POST /api/v1/errand/navigate-with-stops
 * Main route planning endpoint
 */
export interface NavigateWithStopsRequest {
  origin: LatLng;
  destination: {
    name: string;
    location?: LatLng;
  };
  stops: Array<{
    name: string;
    category?: string;
  }>;
  preferences?: Partial<UserPreferences>;
}

export interface NavigateWithStopsData {
  route: Route;
  alternatives?: Route[];
  /** Stops that couldn't fit in budget */
  excludedStops?: Array<{
    name: string;
    reason: string;
    nearestMatch?: RouteStop;
  }>;
}

export type NavigateWithStopsResponse = ApiResponse<NavigateWithStopsData>;

/**
 * GET /api/v1/errand/suggest-stops-on-route
 * Proactive route suggestions
 */
export interface SuggestStopsRequest {
  origin: LatLng;
  destination: LatLng;
  categories?: string[];
  maxStops?: number;
  maxDetourPercent?: number;
  limit?: number;
}

export interface SuggestStopsData {
  suggestions: RouteStop[];
  categoryCounts: Record<string, number>;
}

export type SuggestStopsResponse = ApiResponse<SuggestStopsData>;

// ============================================
// Places Endpoints
// ============================================

/**
 * GET /api/v1/places/search
 * Search for places
 */
export interface PlaceSearchRequest {
  query: string;
  location: LatLng;
  radius?: number;  // meters
  category?: string;
  openNow?: boolean;
}

export interface PlaceResult {
  id: string;
  name: string;
  address: string;
  location: LatLng;
  category: string;
  rating?: number;
  priceLevel?: number;
  isOpen?: boolean;
  distance: number;  // meters
  photos?: string[];
}

export interface PlaceSearchData {
  results: PlaceResult[];
  nextPageToken?: string;
}

export type PlaceSearchResponse = ApiResponse<PlaceSearchData>;

/**
 * GET /api/v1/places/disambiguate
 * Handle ambiguous destinations
 */
export interface DisambiguateRequest {
  query: string;
  location: LatLng;
  limit?: number;
}

export interface DisambiguateData {
  options: PlaceResult[];
  originalQuery: string;
}

export type DisambiguateResponse = ApiResponse<DisambiguateData>;

// ============================================
// User Endpoints
// ============================================

/**
 * GET /api/v1/user/anchors
 * Get user's saved locations
 */
export type GetAnchorsResponse = ApiResponse<{ anchors: Anchor[] }>;

/**
 * POST /api/v1/user/anchors
 * Save a new anchor
 */
export interface CreateAnchorRequest {
  name: string;
  location: LatLng;
  address?: string;
  type: 'home' | 'work' | 'custom';
}

export type CreateAnchorResponse = ApiResponse<{ anchor: Anchor }>;

/**
 * PUT /api/v1/user/preferences
 * Update user preferences
 */
export interface UpdatePreferencesRequest {
  preferences: Partial<UserPreferences>;
}

export type UpdatePreferencesResponse = ApiResponse<{ preferences: UserPreferences }>;

// ============================================
// Sync Endpoints
// ============================================

/**
 * POST /api/v1/sync
 * Sync offline data
 */
export interface SyncRequest {
  /** Pending local changes */
  changes: Array<{
    type: 'anchor' | 'preference' | 'history';
    action: 'create' | 'update' | 'delete';
    data: Record<string, unknown>;
    timestamp: number;
  }>;
  /** Last sync timestamp */
  lastSyncAt: number;
}

export interface SyncData {
  /** Server changes since last sync */
  serverChanges: Array<{
    type: string;
    action: string;
    data: Record<string, unknown>;
  }>;
  /** New sync timestamp */
  syncedAt: number;
}

export type SyncResponse = ApiResponse<SyncData>;
