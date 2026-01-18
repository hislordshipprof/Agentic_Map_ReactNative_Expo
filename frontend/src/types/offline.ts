/**
 * Offline Types - Agentic Mobile Map
 *
 * Type definitions for offline support, caching, and sync.
 * Per CLAUDE.md Caching Strategy and Offline Support
 */

/**
 * Network connection status
 */
export type NetworkStatus = 'online' | 'offline' | 'limited';

/**
 * Cache entry metadata
 */
export interface CacheEntry<T> {
  key: string;
  data: T;
  /** When the entry was cached */
  cachedAt: number;
  /** When the entry expires */
  expiresAt: number;
  /** Source of the data */
  source: 'api' | 'local';
}

/**
 * Cache durations in milliseconds
 * Per CLAUDE.md Cache Durations
 */
export const CacheDuration = {
  /** Routes: 1 hour (traffic changes) */
  ROUTE: 60 * 60 * 1000,
  /** Places: 7 days (details stable) */
  PLACE: 7 * 24 * 60 * 60 * 1000,
  /** Anchors: 30 days (user locations) */
  ANCHOR: 30 * 24 * 60 * 60 * 1000,
  /** Disambiguation results: 14 days */
  DISAMBIGUATION: 14 * 24 * 60 * 60 * 1000,
  /** User preferences: 30 days */
  PREFERENCES: 30 * 24 * 60 * 60 * 1000,
} as const;

/**
 * Sync status
 */
export type SyncStatus =
  | 'idle'           // No sync in progress
  | 'syncing'        // Sync in progress
  | 'error'          // Sync failed
  | 'complete';      // Sync completed

/**
 * Pending sync action
 */
export interface PendingSyncAction {
  id: string;
  type: 'anchor' | 'preference' | 'history';
  action: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
  timestamp: number;
  /** Number of sync attempts */
  attempts: number;
  /** Last error if any */
  lastError?: string;
}

/**
 * Offline state for Redux slice
 */
export interface OfflineState {
  /** Current network status */
  networkStatus: NetworkStatus;
  /** Sync status */
  syncStatus: SyncStatus;
  /** Last successful sync timestamp */
  lastSyncAt: number | null;
  /** Pending actions to sync */
  pendingActions: PendingSyncAction[];
  /** Whether offline mode is forced by user */
  forcedOffline: boolean;
  /** Cache stats */
  cacheStats: {
    routeCount: number;
    placeCount: number;
    anchorCount: number;
    totalSizeBytes: number;
  };
}

/**
 * Initial offline state
 */
export const initialOfflineState: OfflineState = {
  networkStatus: 'online',
  syncStatus: 'idle',
  lastSyncAt: null,
  pendingActions: [],
  forcedOffline: false,
  cacheStats: {
    routeCount: 0,
    placeCount: 0,
    anchorCount: 0,
    totalSizeBytes: 0,
  },
};

/**
 * Cache keys for different data types
 */
export const CacheKey = {
  ROUTES: 'routes',
  PLACES: 'places',
  ANCHORS: 'anchors',
  PREFERENCES: 'preferences',
  DISAMBIGUATION: 'disambiguation',
  POPULAR_STOPS: 'popular_stops',
} as const;

/**
 * Check if cache entry is expired
 */
export const isCacheExpired = <T>(entry: CacheEntry<T>): boolean => {
  return Date.now() > entry.expiresAt;
};

/**
 * Create a cache entry
 */
export const createCacheEntry = <T>(
  key: string,
  data: T,
  duration: number
): CacheEntry<T> => ({
  key,
  data,
  cachedAt: Date.now(),
  expiresAt: Date.now() + duration,
  source: 'api',
});

/**
 * Offline storage schema version
 */
export const OFFLINE_SCHEMA_VERSION = 1;

/**
 * Offline database tables
 */
export const OfflineTables = {
  CACHE: 'cache',
  PENDING_SYNC: 'pending_sync',
  POPULAR_STOPS: 'popular_stops',
  RECENT_ROUTES: 'recent_routes',
} as const;
