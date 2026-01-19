/**
 * Sync Service - Agentic Mobile Map
 *
 * Handles background synchronization between local cache and server.
 * Per requirements-frontend.md Phase 4.3:
 * - Debounce sync (2-3 seconds after network returns)
 * - Non-blocking UI updates
 * - Sync anchors, stops, routes when online
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import { CacheService, CacheDuration } from './cache.service';
import { userApi, errandApi } from '@/services/api';
import { store } from '@/redux/store';
import {
  setNetworkStatus,
  setSyncStatus,
  updateLastSyncTime,
  updateCacheStats,
} from '@/redux/slices/offlineSlice';
import type { Anchor } from '@/types/user';

/**
 * Sync configuration
 */
const SyncConfig = {
  DEBOUNCE_MS: 3000,        // Wait 3 seconds after network returns
  STALE_THRESHOLD_MS: CacheDuration.STOPS, // 7 days
  RETRY_DELAY_MS: 5000,     // Retry after 5 seconds on failure
  MAX_RETRIES: 3,
} as const;

/**
 * Sync status type
 */
export type SyncState = 'idle' | 'syncing' | 'success' | 'error';

/**
 * Sync result
 */
export interface SyncResult {
  success: boolean;
  anchorsUpdated: number;
  stopsUpdated: number;
  routesUpdated: number;
  error?: string;
  timestamp: number;
}

/**
 * Sync Service Class
 */
class SyncServiceImpl {
  private isInitialized = false;
  private unsubscribeNetInfo: (() => void) | null = null;
  private syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  private isSyncing = false;
  private retryCount = 0;

  /**
   * Initialize the sync service and start listening to network changes
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Initialize cache first
    await CacheService.initialize();

    // Subscribe to network state changes
    this.unsubscribeNetInfo = NetInfo.addEventListener(this.handleNetworkChange);

    // Check initial network state
    const state = await NetInfo.fetch();
    this.handleNetworkChange(state);

    this.isInitialized = true;
    console.log('[SyncService] Initialized');
  }

  /**
   * Handle network state changes
   */
  private handleNetworkChange = (state: NetInfoState): void => {
    const isOnline = state.isConnected && state.isInternetReachable !== false;

    // Update Redux state
    store.dispatch(setNetworkStatus(isOnline ? 'online' : 'offline'));

    if (isOnline) {
      // Network came back - debounce sync
      this.scheduleSyncDebounced();
    } else {
      // Network lost - cancel any pending sync
      if (this.syncDebounceTimer) {
        clearTimeout(this.syncDebounceTimer);
        this.syncDebounceTimer = null;
      }
    }
  };

  /**
   * Schedule a debounced sync
   */
  private scheduleSyncDebounced(): void {
    // Clear existing timer
    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
    }

    // Schedule new sync after debounce period
    this.syncDebounceTimer = setTimeout(() => {
      this.performSync();
    }, SyncConfig.DEBOUNCE_MS);
  }

  /**
   * Perform the actual sync
   */
  async performSync(force = false): Promise<SyncResult> {
    if (this.isSyncing && !force) {
      return {
        success: false,
        anchorsUpdated: 0,
        stopsUpdated: 0,
        routesUpdated: 0,
        error: 'Sync already in progress',
        timestamp: Date.now(),
      };
    }

    this.isSyncing = true;
    store.dispatch(setSyncStatus('syncing'));

    const result: SyncResult = {
      success: true,
      anchorsUpdated: 0,
      stopsUpdated: 0,
      routesUpdated: 0,
      timestamp: Date.now(),
    };

    try {
      // Check if cache is stale
      const lastSync = await CacheService.getLastSyncTime();
      const isStale = Date.now() - lastSync > SyncConfig.STALE_THRESHOLD_MS;

      if (!isStale && !force) {
        console.log('[SyncService] Cache is fresh, skipping sync');
        this.isSyncing = false;
        store.dispatch(setSyncStatus('idle'));
        return result;
      }

      console.log('[SyncService] Starting sync...');

      // Sync anchors
      try {
        const anchorsResponse = await userApi.getAnchors();
        if (anchorsResponse.data?.anchors) {
          const anchors = anchorsResponse.data.anchors;
          await CacheService.cacheAnchors(anchors);
          result.anchorsUpdated = anchors.length;

          // Sync popular stops for each anchor
          for (const anchor of anchors) {
            await this.syncStopsForAnchor(anchor);
            result.stopsUpdated += 1;
          }
        }
      } catch (error) {
        console.warn('[SyncService] Failed to sync anchors:', error);
      }

      // Update last sync time
      await CacheService.setLastSyncTime(result.timestamp);
      store.dispatch(updateLastSyncTime(result.timestamp));

      // Update cache stats
      const stats = await CacheService.getStats();
      store.dispatch(updateCacheStats({
        anchorCount: stats.anchorsCount,
        placeCount: stats.stopsCount,
        routeCount: stats.routesCount,
      }));

      // Cleanup expired entries
      await CacheService.cleanup();

      this.retryCount = 0;
      store.dispatch(setSyncStatus('idle'));
      console.log('[SyncService] Sync completed:', result);

    } catch (error) {
      result.success = false;
      result.error = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SyncService] Sync failed:', error);

      // Retry logic
      if (this.retryCount < SyncConfig.MAX_RETRIES) {
        this.retryCount++;
        setTimeout(() => this.performSync(), SyncConfig.RETRY_DELAY_MS);
      } else {
        store.dispatch(setSyncStatus('error'));
        this.retryCount = 0;
      }
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Sync popular stops for a specific anchor
   */
  private async syncStopsForAnchor(anchor: Anchor): Promise<void> {
    try {
      // Get a default destination (could be home if this isn't home)
      const response = await errandApi.suggestStops({
        origin: anchor.location,
        destination: anchor.location, // Use same location for nearby stops
        categories: ['coffee', 'gas', 'grocery'],
        maxStops: 20,
      });

      if (response.data?.suggestions) {
        await CacheService.cacheStopsForAnchor(anchor.id, response.data.suggestions as import('@/types/route').RouteStop[]);
      }
    } catch (error) {
      console.warn(`[SyncService] Failed to sync stops for anchor ${anchor.id}:`, error);
    }
  }

  /**
   * Force a sync regardless of cache state
   */
  async forceSync(): Promise<SyncResult> {
    return this.performSync(true);
  }

  /**
   * Get current sync state
   */
  getSyncState(): SyncState {
    if (this.isSyncing) return 'syncing';
    return 'idle';
  }

  /**
   * Check if data needs sync
   */
  async needsSync(): Promise<boolean> {
    const lastSync = await CacheService.getLastSyncTime();
    return Date.now() - lastSync > SyncConfig.STALE_THRESHOLD_MS;
  }

  /**
   * Cleanup and stop listening to network changes
   */
  dispose(): void {
    if (this.unsubscribeNetInfo) {
      this.unsubscribeNetInfo();
      this.unsubscribeNetInfo = null;
    }

    if (this.syncDebounceTimer) {
      clearTimeout(this.syncDebounceTimer);
      this.syncDebounceTimer = null;
    }

    this.isInitialized = false;
    console.log('[SyncService] Disposed');
  }
}

// Export singleton instance
export const SyncService = new SyncServiceImpl();
export default SyncService;
