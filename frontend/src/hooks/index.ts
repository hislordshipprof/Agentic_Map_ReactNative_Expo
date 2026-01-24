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

// Location hook (current position for conversation and navigate)
export {
  useLocation,
  type UseLocationResult,
  type LocationStatus,
} from './useLocation';

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

// Voice mode hook (full voice flow orchestration)
export {
  useVoiceMode,
  type UseVoiceModeResult,
} from './useVoiceMode';

// ElevenLabs voice hook (WebRTC-based, ultra-low latency)
export { useElevenLabsVoice } from './useElevenLabsVoice';

// Unified voice hook (switches between legacy and ElevenLabs)
export {
  useUnifiedVoice,
  type UseUnifiedVoiceResult,
} from './useUnifiedVoice';

// User anchors hook (home, work, etc.)
export {
  useUserAnchors,
  type UseUserAnchorsResult,
  type AnchorCoordinates,
} from './useUserAnchors';
