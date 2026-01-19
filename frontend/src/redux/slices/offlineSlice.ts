/**
 * Offline Slice - Redux state management for offline support
 *
 * Per CLAUDE.md Caching Strategy:
 * - Network status tracking
 * - Pending sync actions
 * - Cache statistics
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  OfflineState,
  NetworkStatus,
  SyncStatus,
  PendingSyncAction,
} from '@/types';

/**
 * Initial state
 */
const initialState: OfflineState = {
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
 * Offline slice
 */
const offlineSlice = createSlice({
  name: 'offline',
  initialState,
  reducers: {
    /**
     * Set network status
     */
    setNetworkStatus: (state, action: PayloadAction<NetworkStatus>) => {
      state.networkStatus = action.payload;
      // Auto-trigger sync when coming back online
      if (action.payload === 'online' && state.pendingActions.length > 0) {
        state.syncStatus = 'syncing';
      }
    },

    /**
     * Set sync status
     */
    setSyncStatus: (state, action: PayloadAction<SyncStatus>) => {
      state.syncStatus = action.payload;
      if (action.payload === 'complete') {
        state.lastSyncAt = Date.now();
      }
    },

    /**
     * Add pending sync action
     */
    addPendingAction: (
      state,
      action: PayloadAction<Omit<PendingSyncAction, 'id' | 'attempts' | 'timestamp'>>
    ) => {
      const pendingAction: PendingSyncAction = {
        id: `sync_${Date.now()}`,
        timestamp: Date.now(),
        attempts: 0,
        ...action.payload,
      };
      state.pendingActions.push(pendingAction);
    },

    /**
     * Remove pending action (after successful sync)
     */
    removePendingAction: (state, action: PayloadAction<string>) => {
      state.pendingActions = state.pendingActions.filter(
        (a) => a.id !== action.payload
      );
    },

    /**
     * Increment sync attempt count
     */
    incrementSyncAttempt: (state, action: PayloadAction<string>) => {
      const actionItem = state.pendingActions.find((a) => a.id === action.payload);
      if (actionItem) {
        actionItem.attempts += 1;
      }
    },

    /**
     * Set sync error for an action
     */
    setSyncError: (
      state,
      action: PayloadAction<{ id: string; error: string }>
    ) => {
      const actionItem = state.pendingActions.find(
        (a) => a.id === action.payload.id
      );
      if (actionItem) {
        actionItem.lastError = action.payload.error;
      }
    },

    /**
     * Clear all pending actions
     */
    clearPendingActions: (state) => {
      state.pendingActions = [];
    },

    /**
     * Toggle forced offline mode
     */
    toggleForcedOffline: (state) => {
      state.forcedOffline = !state.forcedOffline;
    },

    /**
     * Set forced offline mode
     */
    setForcedOffline: (state, action: PayloadAction<boolean>) => {
      state.forcedOffline = action.payload;
    },

    /**
     * Update cache statistics
     */
    updateCacheStats: (
      state,
      action: PayloadAction<Partial<OfflineState['cacheStats']>>
    ) => {
      state.cacheStats = {
        ...state.cacheStats,
        ...action.payload,
      };
    },

    /**
     * Clear cache statistics
     */
    clearCacheStats: (state) => {
      state.cacheStats = {
        routeCount: 0,
        placeCount: 0,
        anchorCount: 0,
        totalSizeBytes: 0,
      };
    },

    /**
     * Update last sync time
     */
    updateLastSyncTime: (state, action: PayloadAction<number>) => {
      state.lastSyncAt = action.payload;
    },

    /**
     * Mark sync as complete
     */
    completeSync: (state) => {
      state.syncStatus = 'complete';
      state.lastSyncAt = Date.now();
      state.pendingActions = [];
    },

    /**
     * Reset offline state
     */
    resetOffline: () => initialState,
  },
});

export const {
  setNetworkStatus,
  setSyncStatus,
  addPendingAction,
  removePendingAction,
  incrementSyncAttempt,
  setSyncError,
  clearPendingActions,
  toggleForcedOffline,
  setForcedOffline,
  updateCacheStats,
  clearCacheStats,
  updateLastSyncTime,
  completeSync,
  resetOffline,
} = offlineSlice.actions;

export default offlineSlice.reducer;
