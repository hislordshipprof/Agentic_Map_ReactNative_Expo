/**
 * Loading Slice - Redux state management for loading states
 *
 * Per requirements-frontend.md Phase 5.2:
 * - Progress tracking (0-100)
 * - Cancelable operations
 * - Loading messages by context
 * - Estimated time remaining
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Loading operation type strings
 */
export type LoadingOperationType =
  | 'searching'
  | 'optimizing'
  | 'routing'
  | 'syncing'
  | 'fetching'
  | 'processing'
  | 'saving'
  | 'loading';

/**
 * Loading state for a single operation
 */
export interface LoadingOperation {
  id: string;
  type: string;
  message: string;
  progress: number;
  isIndeterminate: boolean;
  canCancel: boolean;
  startedAt: number;
  estimatedDurationMs?: number;
}

/**
 * Global loading state
 */
export interface LoadingSliceState {
  /** Active loading operations */
  operations: Record<string, LoadingOperation>;
  /** Whether any operation is loading */
  isLoading: boolean;
  /** Primary operation (shown in main UI) */
  primaryOperationId: string | null;
  /** Global loading message */
  globalMessage: string | null;
  /** Show minimal loader (for quick operations) */
  showMinimalLoader: boolean;
}

/**
 * Loading messages by operation type
 */
export const loadingMessages: Record<string, string[]> = {
  searching: [
    'Searching for places...',
    'Finding the best matches...',
    'Looking for options nearby...',
  ],
  optimizing: [
    'Optimizing route order...',
    'Finding the best sequence...',
    'Calculating optimal path...',
  ],
  routing: [
    'Calculating route...',
    'Finding directions...',
    'Planning your journey...',
  ],
  syncing: [
    'Syncing your data...',
    'Updating cached information...',
    'Synchronizing with server...',
  ],
  fetching: [
    'Loading data...',
    'Fetching information...',
    'Retrieving details...',
  ],
  processing: [
    'Processing your request...',
    'Working on it...',
    'Almost there...',
  ],
  saving: [
    'Saving changes...',
    'Storing your preferences...',
    'Updating your data...',
  ],
  loading: [
    'Loading...',
    'Please wait...',
    'One moment...',
  ],
};

/**
 * Get a random loading message for an operation type
 */
export const getLoadingMessage = (type: string): string => {
  const messages = loadingMessages[type] || loadingMessages.loading;
  return messages[Math.floor(Math.random() * messages.length)];
};

/**
 * Initial state
 */
const initialState: LoadingSliceState = {
  operations: {},
  isLoading: false,
  primaryOperationId: null,
  globalMessage: null,
  showMinimalLoader: false,
};

/**
 * Loading slice
 */
const loadingSlice = createSlice({
  name: 'loading',
  initialState,
  reducers: {
    /**
     * Start a loading operation
     */
    startOperation: (
      state,
      action: PayloadAction<{
        id: string;
        type: string;
        message?: string;
        canCancel?: boolean;
        estimatedDurationMs?: number;
        isPrimary?: boolean;
      }>
    ) => {
      const { id, type, message, canCancel, estimatedDurationMs, isPrimary } = action.payload;

      const operation: LoadingOperation = {
        id,
        type,
        message: message || getLoadingMessage(type),
        progress: 0,
        isIndeterminate: !estimatedDurationMs,
        canCancel: canCancel ?? false,
        startedAt: Date.now(),
        estimatedDurationMs,
      };

      state.operations[id] = operation;
      state.isLoading = true;

      if (isPrimary || !state.primaryOperationId) {
        state.primaryOperationId = id;
        state.globalMessage = operation.message;
      }
    },

    /**
     * Update operation progress
     */
    updateProgress: (
      state,
      action: PayloadAction<{
        id: string;
        progress: number;
        message?: string;
      }>
    ) => {
      const { id, progress, message } = action.payload;
      const operation = state.operations[id];

      if (operation) {
        operation.progress = Math.min(100, Math.max(0, progress));
        operation.isIndeterminate = false;
        if (message) {
          operation.message = message;
        }

        if (id === state.primaryOperationId && message) {
          state.globalMessage = message;
        }
      }
    },

    /**
     * Update operation message
     */
    updateMessage: (
      state,
      action: PayloadAction<{
        id: string;
        message: string;
      }>
    ) => {
      const { id, message } = action.payload;
      const operation = state.operations[id];

      if (operation) {
        operation.message = message;
        if (id === state.primaryOperationId) {
          state.globalMessage = message;
        }
      }
    },

    /**
     * Complete a loading operation
     */
    completeOperation: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      delete state.operations[id];

      // Update primary operation if needed
      if (state.primaryOperationId === id) {
        const remainingIds = Object.keys(state.operations);
        state.primaryOperationId = remainingIds.length > 0 ? remainingIds[0] : null;
        state.globalMessage = state.primaryOperationId
          ? state.operations[state.primaryOperationId].message
          : null;
      }

      state.isLoading = Object.keys(state.operations).length > 0;
    },

    /**
     * Cancel a loading operation
     */
    cancelOperation: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      const operation = state.operations[id];

      if (operation && operation.canCancel) {
        delete state.operations[id];

        if (state.primaryOperationId === id) {
          const remainingIds = Object.keys(state.operations);
          state.primaryOperationId = remainingIds.length > 0 ? remainingIds[0] : null;
          state.globalMessage = state.primaryOperationId
            ? state.operations[state.primaryOperationId].message
            : null;
        }

        state.isLoading = Object.keys(state.operations).length > 0;
      }
    },

    /**
     * Set minimal loader visibility
     */
    setMinimalLoader: (state, action: PayloadAction<boolean>) => {
      state.showMinimalLoader = action.payload;
    },

    /**
     * Clear all loading operations
     */
    clearAllOperations: (state) => {
      state.operations = {};
      state.isLoading = false;
      state.primaryOperationId = null;
      state.globalMessage = null;
    },

    /**
     * Reset loading state
     */
    resetLoading: () => initialState,
  },
});

export const {
  startOperation,
  updateProgress,
  updateMessage,
  completeOperation,
  cancelOperation,
  setMinimalLoader,
  clearAllOperations,
  resetLoading,
} = loadingSlice.actions;

export default loadingSlice.reducer;
