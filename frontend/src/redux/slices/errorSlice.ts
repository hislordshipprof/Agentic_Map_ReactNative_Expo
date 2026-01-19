/**
 * Error Slice - Redux state management for application errors
 *
 * Per requirements-frontend.md Phase 5.1:
 * - Centralized error handling
 * - Error types: network, not_found, route_exceeds, ambiguous, location
 * - Recovery options for each error type
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Error types in the application
 */
export type ErrorType =
  | 'network'
  | 'not_found'
  | 'route_exceeds'
  | 'ambiguous'
  | 'location'
  | 'timeout'
  | 'server'
  | 'validation'
  | 'unknown';

/**
 * Recovery action that can be taken for an error
 */
export interface RecoveryOption {
  id: string;
  label: string;
  action: 'retry' | 'offline' | 'expand' | 'skip' | 'settings' | 'adjust' | 'cancel' | 'dismiss';
  isPrimary?: boolean;
}

/**
 * Application error structure
 */
export interface AppError {
  id: string;
  type: ErrorType;
  title: string;
  message: string;
  details?: string;
  recoveryOptions: RecoveryOption[];
  timestamp: number;
  context?: Record<string, unknown>;
  dismissable?: boolean;
  autoHideMs?: number;
}

/**
 * Error state
 */
export interface ErrorState {
  /** Current active error (shown in dialog/overlay) */
  currentError: AppError | null;
  /** Error history for debugging */
  errorHistory: AppError[];
  /** Max history size */
  maxHistorySize: number;
  /** Whether error dialog is visible */
  isErrorDialogVisible: boolean;
  /** Global error count for the session */
  errorCount: number;
}

/**
 * Default recovery options by error type
 */
export const defaultRecoveryOptions: Record<ErrorType, RecoveryOption[]> = {
  network: [
    { id: 'retry', label: 'Retry', action: 'retry', isPrimary: true },
    { id: 'offline', label: 'Use Offline Mode', action: 'offline' },
  ],
  not_found: [
    { id: 'expand', label: 'Expand Search', action: 'expand', isPrimary: true },
    { id: 'skip', label: 'Skip This Stop', action: 'skip' },
  ],
  route_exceeds: [
    { id: 'adjust', label: 'Adjust Stops', action: 'adjust', isPrimary: true },
    { id: 'expand', label: 'Expand Budget', action: 'expand' },
  ],
  ambiguous: [
    { id: 'retry', label: 'Try Again', action: 'retry', isPrimary: true },
    { id: 'cancel', label: 'Cancel', action: 'cancel' },
  ],
  location: [
    { id: 'settings', label: 'Open Settings', action: 'settings', isPrimary: true },
    { id: 'skip', label: 'Continue Without Location', action: 'skip' },
  ],
  timeout: [
    { id: 'retry', label: 'Retry', action: 'retry', isPrimary: true },
    { id: 'cancel', label: 'Cancel', action: 'cancel' },
  ],
  server: [
    { id: 'retry', label: 'Retry', action: 'retry', isPrimary: true },
    { id: 'dismiss', label: 'Dismiss', action: 'dismiss' },
  ],
  validation: [
    { id: 'dismiss', label: 'Got It', action: 'dismiss', isPrimary: true },
  ],
  unknown: [
    { id: 'retry', label: 'Try Again', action: 'retry', isPrimary: true },
    { id: 'dismiss', label: 'Dismiss', action: 'dismiss' },
  ],
};

/**
 * Default error messages by type
 */
export const defaultErrorMessages: Record<ErrorType, { title: string; message: string }> = {
  network: {
    title: 'Connection Failed',
    message: 'Unable to connect to the server. Please check your internet connection.',
  },
  not_found: {
    title: 'No Results Found',
    message: 'We couldn\'t find any matches for your search.',
  },
  route_exceeds: {
    title: 'Route Exceeds Budget',
    message: 'The requested stops would add too much distance to your route.',
  },
  ambiguous: {
    title: 'Need More Details',
    message: 'I\'m not sure what you mean. Could you be more specific?',
  },
  location: {
    title: 'Location Unavailable',
    message: 'Unable to access your location. Please enable location services.',
  },
  timeout: {
    title: 'Request Timed Out',
    message: 'The request took too long. Please try again.',
  },
  server: {
    title: 'Server Error',
    message: 'Something went wrong on our end. Please try again later.',
  },
  validation: {
    title: 'Invalid Input',
    message: 'Please check your input and try again.',
  },
  unknown: {
    title: 'Something Went Wrong',
    message: 'An unexpected error occurred. Please try again.',
  },
};

/**
 * Initial state
 */
const initialState: ErrorState = {
  currentError: null,
  errorHistory: [],
  maxHistorySize: 20,
  isErrorDialogVisible: false,
  errorCount: 0,
};

/**
 * Error slice
 */
const errorSlice = createSlice({
  name: 'error',
  initialState,
  reducers: {
    /**
     * Set an error (shows error dialog)
     */
    setError: (
      state,
      action: PayloadAction<{
        type: ErrorType;
        title?: string;
        message?: string;
        details?: string;
        recoveryOptions?: RecoveryOption[];
        context?: Record<string, unknown>;
        dismissable?: boolean;
        autoHideMs?: number;
      }>
    ) => {
      const { type, title, message, details, recoveryOptions, context, dismissable, autoHideMs } =
        action.payload;
      const defaults = defaultErrorMessages[type];

      const error: AppError = {
        id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        title: title || defaults.title,
        message: message || defaults.message,
        details,
        recoveryOptions: recoveryOptions || defaultRecoveryOptions[type],
        timestamp: Date.now(),
        context,
        dismissable: dismissable ?? true,
        autoHideMs,
      };

      state.currentError = error;
      state.isErrorDialogVisible = true;
      state.errorCount += 1;

      // Add to history
      state.errorHistory.unshift(error);
      if (state.errorHistory.length > state.maxHistorySize) {
        state.errorHistory = state.errorHistory.slice(0, state.maxHistorySize);
      }
    },

    /**
     * Clear the current error
     */
    clearError: (state) => {
      state.currentError = null;
      state.isErrorDialogVisible = false;
    },

    /**
     * Show/hide error dialog
     */
    setErrorDialogVisible: (state, action: PayloadAction<boolean>) => {
      state.isErrorDialogVisible = action.payload;
    },

    /**
     * Clear error history
     */
    clearErrorHistory: (state) => {
      state.errorHistory = [];
    },

    /**
     * Reset error count (e.g., on new session)
     */
    resetErrorCount: (state) => {
      state.errorCount = 0;
    },

    /**
     * Reset error state
     */
    resetErrors: () => initialState,
  },
});

export const {
  setError,
  clearError,
  setErrorDialogVisible,
  clearErrorHistory,
  resetErrorCount,
  resetErrors,
} = errorSlice.actions;

export default errorSlice.reducer;
