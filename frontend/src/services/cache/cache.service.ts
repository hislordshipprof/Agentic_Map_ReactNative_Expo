/**
 * Cache Service - Agentic Mobile Map
 *
 * Persistent cache using AsyncStorage for cross-platform support.
 * SQLite was considered but AsyncStorage provides simpler API for our needs.
 *
 * Per requirements-frontend.md Phase 4.1:
 * - Cache anchors (30 days), stops (7 days), routes (1 day)
 * - Conversation history (last 50 messages)
 * - Popular stops near each anchor (top 20)
 *
 * Cache Expiry Policy:
 * - Anchor data: 30 days
 * - Popular stops: 7 days
 * - Routes: 1 day
 * - Destination index: 14 days
 * - Conversation: No expiry (limit to 50 messages)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Anchor } from '@/types/user';
import type { Route, RouteStop } from '@/types/route';
import type { Message } from '@/types/conversation';

/**
 * Cache durations in milliseconds
 */
export const CacheDuration = {
  ANCHORS: 30 * 24 * 60 * 60 * 1000,      // 30 days
  STOPS: 7 * 24 * 60 * 60 * 1000,          // 7 days
  ROUTES: 1 * 24 * 60 * 60 * 1000,         // 1 day
  DISAMBIGUATION: 14 * 24 * 60 * 60 * 1000, // 14 days
  PLACES: 7 * 24 * 60 * 60 * 1000,         // 7 days
} as const;

/**
 * Cache limits
 */
export const CacheLimits = {
  MAX_ROUTES: 10,
  MAX_STOPS_PER_ANCHOR: 20,
  MAX_MESSAGES: 50,
  MAX_RECENT_SEARCHES: 20,
} as const;

/**
 * Cache keys
 */
const CacheKeys = {
  ANCHORS: '@cache/anchors',
  ROUTES: '@cache/routes',
  MESSAGES: '@cache/messages',
  LAST_SYNC: '@cache/last_sync',
  STOPS_PREFIX: '@cache/stops_',
  PLACE_PREFIX: '@cache/place_',
} as const;

/**
 * Cached item wrapper with metadata
 */
export interface CachedItem<T> {
  data: T;
  cachedAt: number;
  expiresAt: number;
}

/**
 * Cache statistics for monitoring
 */
export interface CacheStats {
  anchorsCount: number;
  stopsCount: number;
  routesCount: number;
  messagesCount: number;
  totalSizeBytes: number;
  lastCleanup: number;
}

/**
 * Cache Service Class
 */
class CacheServiceImpl {
  private isInitialized = false;

  /**
   * Initialize the cache service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Run cleanup on init
      await this.cleanup();
      this.isInitialized = true;
    } catch {
      // Initialization failed but continue anyway
      this.isInitialized = true;
    }
  }

  // ==================== ANCHORS ====================

  /**
   * Cache user anchors
   */
  async cacheAnchors(anchors: Anchor[]): Promise<void> {
    const now = Date.now();
    const cached: CachedItem<Anchor[]> = {
      data: anchors,
      cachedAt: now,
      expiresAt: now + CacheDuration.ANCHORS,
    };
    await AsyncStorage.setItem(CacheKeys.ANCHORS, JSON.stringify(cached));
  }

  /**
   * Get cached anchors
   */
  async getAnchors(): Promise<Anchor[] | null> {
    try {
      const cached = await AsyncStorage.getItem(CacheKeys.ANCHORS);
      if (!cached) return null;

      const parsed: CachedItem<Anchor[]> = JSON.parse(cached);
      if (Date.now() > parsed.expiresAt) {
        await AsyncStorage.removeItem(CacheKeys.ANCHORS);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  // ==================== STOPS ====================

  /**
   * Cache popular stops near an anchor
   */
  async cacheStopsForAnchor(anchorId: string, stops: RouteStop[]): Promise<void> {
    const now = Date.now();
    const limitedStops = stops.slice(0, CacheLimits.MAX_STOPS_PER_ANCHOR);
    const cached: CachedItem<RouteStop[]> = {
      data: limitedStops,
      cachedAt: now,
      expiresAt: now + CacheDuration.STOPS,
    };
    await AsyncStorage.setItem(
      `${CacheKeys.STOPS_PREFIX}${anchorId}`,
      JSON.stringify(cached)
    );
  }

  /**
   * Get cached stops for an anchor
   */
  async getStopsForAnchor(anchorId: string): Promise<RouteStop[] | null> {
    try {
      const key = `${CacheKeys.STOPS_PREFIX}${anchorId}`;
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const parsed: CachedItem<RouteStop[]> = JSON.parse(cached);
      if (Date.now() > parsed.expiresAt) {
        await AsyncStorage.removeItem(key);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  // ==================== ROUTES ====================

  /**
   * Cache a route
   */
  async cacheRoute(route: Route): Promise<void> {
    const now = Date.now();
    const cached = await this.getCachedRoutesRaw();

    // Add new route at the beginning
    const newEntry = {
      route,
      cachedAt: now,
      expiresAt: now + CacheDuration.ROUTES,
    };

    // Filter expired and limit
    const validRoutes = cached
      .filter((r) => r.expiresAt > now && r.route.id !== route.id)
      .slice(0, CacheLimits.MAX_ROUTES - 1);

    validRoutes.unshift(newEntry);
    await AsyncStorage.setItem(CacheKeys.ROUTES, JSON.stringify(validRoutes));
  }

  /**
   * Get raw cached routes with metadata
   */
  private async getCachedRoutesRaw(): Promise<Array<{ route: Route; cachedAt: number; expiresAt: number }>> {
    try {
      const cached = await AsyncStorage.getItem(CacheKeys.ROUTES);
      if (!cached) return [];
      return JSON.parse(cached);
    } catch {
      return [];
    }
  }

  /**
   * Get cached routes
   */
  async getRoutes(): Promise<Route[]> {
    const now = Date.now();
    const cached = await this.getCachedRoutesRaw();
    return cached
      .filter((r) => r.expiresAt > now)
      .map((r) => r.route);
  }

  /**
   * Get a specific cached route
   */
  async getRoute(routeId: string): Promise<Route | null> {
    const routes = await this.getRoutes();
    return routes.find((r) => r.id === routeId) || null;
  }

  // ==================== MESSAGES ====================

  /**
   * Cache conversation messages
   */
  async cacheMessages(messages: Message[]): Promise<void> {
    const limitedMessages = messages.slice(-CacheLimits.MAX_MESSAGES);
    await AsyncStorage.setItem(CacheKeys.MESSAGES, JSON.stringify(limitedMessages));
  }

  /**
   * Get cached messages
   */
  async getMessages(): Promise<Message[]> {
    try {
      const cached = await AsyncStorage.getItem(CacheKeys.MESSAGES);
      return cached ? JSON.parse(cached) : [];
    } catch {
      return [];
    }
  }

  /**
   * Append a message to cache
   */
  async appendMessage(message: Message): Promise<void> {
    const messages = await this.getMessages();
    messages.push(message);
    await this.cacheMessages(messages);
  }

  // ==================== PLACES ====================

  /**
   * Cache place details
   */
  async cachePlace(googlePlacesId: string, placeData: unknown): Promise<void> {
    const now = Date.now();
    const cached: CachedItem<unknown> = {
      data: placeData,
      cachedAt: now,
      expiresAt: now + CacheDuration.PLACES,
    };
    await AsyncStorage.setItem(
      `${CacheKeys.PLACE_PREFIX}${googlePlacesId}`,
      JSON.stringify(cached)
    );
  }

  /**
   * Get cached place
   */
  async getPlace(googlePlacesId: string): Promise<unknown | null> {
    try {
      const key = `${CacheKeys.PLACE_PREFIX}${googlePlacesId}`;
      const cached = await AsyncStorage.getItem(key);
      if (!cached) return null;

      const parsed: CachedItem<unknown> = JSON.parse(cached);
      if (Date.now() > parsed.expiresAt) {
        await AsyncStorage.removeItem(key);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  // ==================== UTILITIES ====================

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const anchors = await this.getAnchors();
      const routes = await this.getRoutes();
      const messages = await this.getMessages();

      // Count stops across all cached anchors
      let stopsCount = 0;
      if (anchors) {
        for (const anchor of anchors) {
          const stops = await this.getStopsForAnchor(anchor.id);
          if (stops) stopsCount += stops.length;
        }
      }

      return {
        anchorsCount: anchors?.length || 0,
        stopsCount,
        routesCount: routes.length,
        messagesCount: messages.length,
        totalSizeBytes: 0, // Would need to calculate from all keys
        lastCleanup: 0,
      };
    } catch {
      return {
        anchorsCount: 0,
        stopsCount: 0,
        routesCount: 0,
        messagesCount: 0,
        totalSizeBytes: 0,
        lastCleanup: 0,
      };
    }
  }

  /**
   * Clear expired entries
   */
  async cleanup(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith('@cache/'));
      const now = Date.now();

      for (const key of cacheKeys) {
        // Skip non-expirable keys
        if (key === CacheKeys.MESSAGES || key === CacheKeys.LAST_SYNC) {
          continue;
        }

        try {
          const value = await AsyncStorage.getItem(key);
          if (value) {
            const parsed = JSON.parse(value);
            // Check if it's a cached item with expiry
            if (parsed.expiresAt && parsed.expiresAt < now) {
              await AsyncStorage.removeItem(key);
            }
            // Check if it's an array of cached items (routes)
            if (Array.isArray(parsed)) {
              const valid = parsed.filter((item) => !item.expiresAt || item.expiresAt > now);
              if (valid.length < parsed.length) {
                await AsyncStorage.setItem(key, JSON.stringify(valid));
              }
            }
          }
        } catch {
          // Skip invalid entries
        }
      }
    } catch {
      // Cleanup failed - non-critical
    }
  }

  /**
   * Clear all cache data
   */
  async clearAll(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter((k) => k.startsWith('@cache/'));
      await AsyncStorage.multiRemove(cacheKeys);
    } catch {
      // Clear failed - non-critical
    }
  }

  /**
   * Get last sync time
   */
  async getLastSyncTime(): Promise<number> {
    try {
      const lastSync = await AsyncStorage.getItem(CacheKeys.LAST_SYNC);
      return lastSync ? parseInt(lastSync, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Set last sync time
   */
  async setLastSyncTime(timestamp: number): Promise<void> {
    await AsyncStorage.setItem(CacheKeys.LAST_SYNC, timestamp.toString());
  }
}

// Export singleton instance
export const CacheService = new CacheServiceImpl();
export default CacheService;
