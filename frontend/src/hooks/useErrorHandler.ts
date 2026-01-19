/**
 * useErrorHandler Hook - Agentic Mobile Map
 *
 * Centralized error handling with recovery options.
 * Per requirements-frontend.md Phase 5.1:
 * - Handle different error types
 * - Provide recovery options
 * - Track error history
 */

import { useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  setError,
  clearError,
  setErrorDialogVisible,
  clearErrorHistory,
  resetErrorCount,
} from '@/redux/slices';
import type { ErrorType, RecoveryOption, AppError } from '@/redux/slices/errorSlice';
import { Linking, Platform } from 'react-native';

/**
 * Error handler result
 */
export interface UseErrorHandlerResult {
  // State
  currentError: AppError | null;
  isErrorDialogVisible: boolean;
  errorHistory: AppError[];
  errorCount: number;

  // Actions
  showError: (params: ShowErrorParams) => void;
  showNetworkError: (details?: string) => void;
  showNotFoundError: (searchTerm: string) => void;
  showRouteExceedsError: (current: number, budget: number) => void;
  showAmbiguousError: (message?: string) => void;
  showLocationError: () => void;
  showTimeoutError: () => void;
  showServerError: (details?: string) => void;
  showValidationError: (message: string) => void;
  dismissError: () => void;
  hideErrorDialog: () => void;
  clearHistory: () => void;

  // Recovery handlers
  handleRecoveryAction: (action: RecoveryOption['action'], context?: Record<string, unknown>) => Promise<void>;
}

/**
 * Parameters for showing an error
 */
export interface ShowErrorParams {
  type: ErrorType;
  title?: string;
  message?: string;
  details?: string;
  recoveryOptions?: RecoveryOption[];
  context?: Record<string, unknown>;
  dismissable?: boolean;
  autoHideMs?: number;
}

/**
 * useErrorHandler Hook
 */
export const useErrorHandler = (): UseErrorHandlerResult => {
  const dispatch = useAppDispatch();

  const { currentError, isErrorDialogVisible, errorHistory, errorCount } = useAppSelector(
    (state) => state.error
  );

  /**
   * Show a generic error
   */
  const showError = useCallback(
    (params: ShowErrorParams) => {
      dispatch(setError(params));
    },
    [dispatch]
  );

  /**
   * Show network error
   */
  const showNetworkError = useCallback(
    (details?: string) => {
      dispatch(
        setError({
          type: 'network',
          details,
        })
      );
    },
    [dispatch]
  );

  /**
   * Show not found error
   */
  const showNotFoundError = useCallback(
    (searchTerm: string) => {
      dispatch(
        setError({
          type: 'not_found',
          message: `I couldn't find any "${searchTerm}" within your route budget.`,
          context: { searchTerm },
        })
      );
    },
    [dispatch]
  );

  /**
   * Show route exceeds budget error
   */
  const showRouteExceedsError = useCallback(
    (current: number, budget: number) => {
      const overBy = ((current - budget) / 1000).toFixed(1);
      dispatch(
        setError({
          type: 'route_exceeds',
          message: `Your route is ${overBy}km over budget. Remove a stop or expand your budget.`,
          context: { current, budget },
        })
      );
    },
    [dispatch]
  );

  /**
   * Show ambiguous input error
   */
  const showAmbiguousError = useCallback(
    (message?: string) => {
      dispatch(
        setError({
          type: 'ambiguous',
          message: message || 'I\'m not sure what you mean. Could you be more specific?',
        })
      );
    },
    [dispatch]
  );

  /**
   * Show location error
   */
  const showLocationError = useCallback(() => {
    dispatch(
      setError({
        type: 'location',
      })
    );
  }, [dispatch]);

  /**
   * Show timeout error
   */
  const showTimeoutError = useCallback(() => {
    dispatch(
      setError({
        type: 'timeout',
      })
    );
  }, [dispatch]);

  /**
   * Show server error
   */
  const showServerError = useCallback(
    (details?: string) => {
      dispatch(
        setError({
          type: 'server',
          details,
        })
      );
    },
    [dispatch]
  );

  /**
   * Show validation error
   */
  const showValidationError = useCallback(
    (message: string) => {
      dispatch(
        setError({
          type: 'validation',
          message,
        })
      );
    },
    [dispatch]
  );

  /**
   * Dismiss current error
   */
  const dismissError = useCallback(() => {
    dispatch(clearError());
  }, [dispatch]);

  /**
   * Hide error dialog without clearing error
   */
  const hideErrorDialog = useCallback(() => {
    dispatch(setErrorDialogVisible(false));
  }, [dispatch]);

  /**
   * Clear error history
   */
  const clearHistory = useCallback(() => {
    dispatch(clearErrorHistory());
    dispatch(resetErrorCount());
  }, [dispatch]);

  /**
   * Handle recovery action
   */
  const handleRecoveryAction = useCallback(
    async (action: RecoveryOption['action'], _context?: Record<string, unknown>) => {
      switch (action) {
        case 'retry':
          // Caller should handle retry logic
          dismissError();
          break;

        case 'offline':
          // Switch to offline mode
          dismissError();
          break;

        case 'expand':
          // Expand search or budget
          dismissError();
          break;

        case 'skip':
          // Skip the current operation
          dismissError();
          break;

        case 'settings':
          // Open device settings
          if (Platform.OS === 'ios') {
            await Linking.openURL('app-settings:');
          } else {
            await Linking.openSettings();
          }
          dismissError();
          break;

        case 'adjust':
          // Enter adjustment mode
          dismissError();
          break;

        case 'cancel':
          // Cancel operation
          dismissError();
          break;

        case 'dismiss':
        default:
          dismissError();
          break;
      }
    },
    [dismissError]
  );

  return {
    // State
    currentError,
    isErrorDialogVisible,
    errorHistory,
    errorCount,

    // Actions
    showError,
    showNetworkError,
    showNotFoundError,
    showRouteExceedsError,
    showAmbiguousError,
    showLocationError,
    showTimeoutError,
    showServerError,
    showValidationError,
    dismissError,
    hideErrorDialog,
    clearHistory,

    // Recovery handlers
    handleRecoveryAction,
  };
};

export default useErrorHandler;
