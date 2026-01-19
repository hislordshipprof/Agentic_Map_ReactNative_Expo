/**
 * Hooks Index - Agentic Mobile Map
 *
 * Central export for all custom hooks.
 */

// NLU Flow Hook (confidence-based routing)
export {
  useNLUFlow,
  getConfidenceLevel,
  CONFIDENCE_THRESHOLDS,
  type UseNLUFlowResult,
  type NLUFlowState,
} from './useNLUFlow';

// Route hook (route tab and adjustment)
export { useRoute } from './useRoute';

// Offline hook (cache and sync)
export {
  useOffline,
  type UseOfflineResult,
  type CachedData,
} from './useOffline';

// Error handling hook
export {
  useErrorHandler,
  type UseErrorHandlerResult,
  type ShowErrorParams,
} from './useErrorHandler';

// Loading state hook
export {
  useLoadingState,
  type UseLoadingStateResult,
  type StartLoadingParams,
  type LoadingOptions,
} from './useLoadingState';
