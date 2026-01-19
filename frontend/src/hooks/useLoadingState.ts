/**
 * useLoadingState Hook - Agentic Mobile Map
 *
 * Enhanced loading state management with progress tracking.
 * Per requirements-frontend.md Phase 5.2:
 * - Track loading operations
 * - Progress updates
 * - Cancelable operations
 * - Loading messages
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  startOperation,
  updateProgress,
  completeOperation,
  cancelOperation,
  clearAllOperations,
} from '@/redux/slices';
import type { LoadingOperation } from '@/redux/slices/loadingSlice';

/**
 * Loading state result
 */
export interface UseLoadingStateResult {
  // State
  isLoading: boolean;
  operations: Record<string, LoadingOperation>;
  primaryOperation: LoadingOperation | null;
  globalMessage: string | null;
  showMinimalLoader: boolean;

  // Actions
  start: (params: StartLoadingParams) => string;
  update: (id: string, progress: number, message?: string) => void;
  complete: (id: string) => void;
  cancel: (id: string) => void;
  clearAll: () => void;

  // Helpers
  withLoading: <T>(
    operation: string,
    fn: (updateProgress: (progress: number, message?: string) => void) => Promise<T>,
    options?: LoadingOptions
  ) => Promise<T>;
}

/**
 * Parameters for starting a loading operation
 */
export interface StartLoadingParams {
  id?: string;
  type: string;
  message?: string;
  canCancel?: boolean;
  estimatedDurationMs?: number;
  isPrimary?: boolean;
}

/**
 * Options for withLoading helper
 */
export interface LoadingOptions {
  canCancel?: boolean;
  estimatedDurationMs?: number;
  isPrimary?: boolean;
  minDurationMs?: number;
}

/**
 * Generate unique operation ID
 */
const generateOperationId = (): string => {
  return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * useLoadingState Hook
 */
export const useLoadingState = (): UseLoadingStateResult => {
  const dispatch = useAppDispatch();
  const cancelTokens = useRef<Map<string, boolean>>(new Map());

  const { isLoading, operations, primaryOperationId, globalMessage, showMinimalLoader } =
    useAppSelector((state) => state.loading);

  // Get primary operation
  const primaryOperation = primaryOperationId ? operations[primaryOperationId] : null;

  /**
   * Start a loading operation
   */
  const start = useCallback(
    (params: StartLoadingParams): string => {
      const id = params.id || generateOperationId();
      cancelTokens.current.set(id, false);

      dispatch(
        startOperation({
          id,
          type: params.type,
          message: params.message,
          canCancel: params.canCancel,
          estimatedDurationMs: params.estimatedDurationMs,
          isPrimary: params.isPrimary,
        })
      );

      return id;
    },
    [dispatch]
  );

  /**
   * Update operation progress
   */
  const update = useCallback(
    (id: string, progress: number, message?: string) => {
      dispatch(updateProgress({ id, progress, message }));
    },
    [dispatch]
  );

  /**
   * Complete a loading operation
   */
  const complete = useCallback(
    (id: string) => {
      cancelTokens.current.delete(id);
      dispatch(completeOperation(id));
    },
    [dispatch]
  );

  /**
   * Cancel a loading operation
   */
  const cancel = useCallback(
    (id: string) => {
      cancelTokens.current.set(id, true);
      dispatch(cancelOperation(id));
    },
    [dispatch]
  );

  /**
   * Clear all loading operations
   */
  const clearAll = useCallback(() => {
    cancelTokens.current.clear();
    dispatch(clearAllOperations());
  }, [dispatch]);

  /**
   * Helper to wrap async operations with loading state
   */
  const withLoading = useCallback(
    async <T>(
      operationType: string,
      fn: (updateProgress: (progress: number, message?: string) => void) => Promise<T>,
      options?: LoadingOptions
    ): Promise<T> => {
      const operationId = generateOperationId();
      const startTime = Date.now();

      // Start loading
      start({
        id: operationId,
        type: operationType,
        canCancel: options?.canCancel,
        estimatedDurationMs: options?.estimatedDurationMs,
        isPrimary: options?.isPrimary,
      });

      try {
        // Create progress updater
        const progressUpdater = (progress: number, message?: string) => {
          if (!cancelTokens.current.get(operationId)) {
            update(operationId, progress, message);
          }
        };

        // Execute the operation
        const result = await fn(progressUpdater);

        // Ensure minimum duration for better UX (prevents flash)
        const elapsed = Date.now() - startTime;
        const minDuration = options?.minDurationMs ?? 300;
        if (elapsed < minDuration) {
          await new Promise((resolve) => setTimeout(resolve, minDuration - elapsed));
        }

        // Complete the operation
        complete(operationId);

        return result;
      } catch (error) {
        // Complete even on error
        complete(operationId);
        throw error;
      }
    },
    [start, update, complete]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelTokens.current.clear();
    };
  }, []);

  return {
    // State
    isLoading,
    operations,
    primaryOperation,
    globalMessage,
    showMinimalLoader,

    // Actions
    start,
    update,
    complete,
    cancel,
    clearAll,

    // Helpers
    withLoading,
  };
};

export default useLoadingState;
