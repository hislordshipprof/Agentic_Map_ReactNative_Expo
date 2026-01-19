/**
 * useOffline Hook - Agentic Mobile Map
 *
 * Provides offline state and cached data access.
 * Per requirements-frontend.md Phase 4:
 * - Track network status
 * - Access cached anchors, stops, routes
 * - Trigger sync when needed
 * - Show offline mode indicators
 */

import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import { setForcedOffline } from '@/redux/slices';
import { CacheService } from '@/services/cache';
import { SyncService } from '@/services/cache';
import type { Anchor } from '@/types/user';
import type { Route, RouteStop } from '@/types/route';
import type { Message } from '@/types/conversation';

/**
 * Cached data structure
 */
export interface CachedData {
  anchors: Anchor[] | null;
  routes: Route[];
  messages: Message[];
  stopsForAnchor: (anchorId: string) => Promise<RouteStop[] | null>;
}

/**
 * Offline hook result
 */
export interface UseOfflineResult {
  // Network state
  isOnline: boolean;
  isOffline: boolean;
  isForcedOffline: boolean;
  networkStatus: 'online' | 'offline' | 'limited';

  // Sync state
  isSyncing: boolean;
  lastSyncTime: number | null;
  needsSync: boolean;

  // Cache stats
  cacheStats: {
    routeCount: number;
    placeCount: number;
    anchorCount: number;
    totalSizeBytes: number;
  };

  // Cached data
  cachedAnchors: Anchor[] | null;
  cachedRoutes: Route[];
  cachedMessages: Message[];

  // Actions
  toggleForcedOffline: () => void;
  triggerSync: () => Promise<void>;
  getCachedStops: (anchorId: string) => Promise<RouteStop[] | null>;
  clearCache: () => Promise<void>;
  loadCachedData: () => Promise<void>;

  // Helpers
  getCacheFreshness: () => 'fresh' | 'stale' | 'expired';
  getOfflineMessage: () => string;
}

/**
 * useOffline Hook
 *
 * Manages offline state and provides access to cached data.
 */
export const useOffline = (): UseOfflineResult => {
  const dispatch = useAppDispatch();

  // Select offline state from Redux
  const {
    networkStatus,
    syncStatus,
    lastSyncAt,
    forcedOffline,
    cacheStats,
  } = useAppSelector((state) => state.offline);

  // Local state for cached data
  const [cachedAnchors, setCachedAnchors] = useState<Anchor[] | null>(null);
  const [cachedRoutes, setCachedRoutes] = useState<Route[]>([]);
  const [cachedMessages, setCachedMessages] = useState<Message[]>([]);
  const [needsSync, setNeedsSync] = useState(false);

  // Derived state
  const isOnline = networkStatus === 'online' && !forcedOffline;
  const isOffline = networkStatus === 'offline' || forcedOffline;
  const isSyncing = syncStatus === 'syncing';

  /**
   * Load cached data from storage
   */
  const loadCachedData = useCallback(async () => {
    try {
      const [anchors, routes, messages] = await Promise.all([
        CacheService.getAnchors(),
        CacheService.getRoutes(),
        CacheService.getMessages(),
      ]);

      setCachedAnchors(anchors);
      setCachedRoutes(routes);
      setCachedMessages(messages);

      // Check if sync is needed
      const syncNeeded = await SyncService.needsSync();
      setNeedsSync(syncNeeded);
    } catch (error) {
      console.error('[useOffline] Failed to load cached data:', error);
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    const initialize = async () => {
      await SyncService.initialize();
      await loadCachedData();
    };

    initialize();

    return () => {
      SyncService.dispose();
    };
  }, [loadCachedData]);

  /**
   * Reload cached data when sync completes
   */
  useEffect(() => {
    if (syncStatus === 'complete' || syncStatus === 'idle') {
      loadCachedData();
    }
  }, [syncStatus, loadCachedData]);

  /**
   * Toggle forced offline mode
   */
  const handleToggleForcedOffline = useCallback(() => {
    dispatch(setForcedOffline(!forcedOffline));
  }, [dispatch, forcedOffline]);

  /**
   * Trigger a sync
   */
  const triggerSync = useCallback(async () => {
    if (isOnline) {
      await SyncService.forceSync();
      await loadCachedData();
    }
  }, [isOnline, loadCachedData]);

  /**
   * Get cached stops for an anchor
   */
  const getCachedStops = useCallback(async (anchorId: string): Promise<RouteStop[] | null> => {
    return CacheService.getStopsForAnchor(anchorId);
  }, []);

  /**
   * Clear all cached data
   */
  const clearCache = useCallback(async () => {
    await CacheService.clearAll();
    setCachedAnchors(null);
    setCachedRoutes([]);
    setCachedMessages([]);
  }, []);

  /**
   * Get cache freshness status
   */
  const getCacheFreshness = useCallback((): 'fresh' | 'stale' | 'expired' => {
    if (!lastSyncAt) return 'expired';

    const ageMs = Date.now() - lastSyncAt;
    const oneDay = 24 * 60 * 60 * 1000;
    const sevenDays = 7 * oneDay;

    if (ageMs < oneDay) return 'fresh';
    if (ageMs < sevenDays) return 'stale';
    return 'expired';
  }, [lastSyncAt]);

  /**
   * Get user-friendly offline message
   */
  const getOfflineMessage = useCallback((): string => {
    if (forcedOffline) {
      return 'Offline mode enabled. Using cached data.';
    }

    if (networkStatus === 'offline') {
      const freshness = getCacheFreshness();
      switch (freshness) {
        case 'fresh':
          return 'You\'re offline. Using recent cached data.';
        case 'stale':
          return 'You\'re offline. Some data may be outdated.';
        case 'expired':
          return 'You\'re offline. Connect to refresh suggestions.';
      }
    }

    if (networkStatus === 'limited') {
      return 'Limited connection. Some features may be slow.';
    }

    return '';
  }, [forcedOffline, networkStatus, getCacheFreshness]);

  return {
    // Network state
    isOnline,
    isOffline,
    isForcedOffline: forcedOffline,
    networkStatus,

    // Sync state
    isSyncing,
    lastSyncTime: lastSyncAt,
    needsSync,

    // Cache stats
    cacheStats,

    // Cached data
    cachedAnchors,
    cachedRoutes,
    cachedMessages,

    // Actions
    toggleForcedOffline: handleToggleForcedOffline,
    triggerSync,
    getCachedStops,
    clearCache,
    loadCachedData,

    // Helpers
    getCacheFreshness,
    getOfflineMessage,
  };
};

export default useOffline;
