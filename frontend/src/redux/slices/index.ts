/**
 * Redux Slices Index - Agentic Mobile Map
 *
 * Central export for all Redux slices.
 * Note: Some actions have the same name across slices (setLoading, setError).
 * Import them directly from the specific slice when needed.
 */

// Reducers
export { default as authReducer } from './authSlice';
export { default as conversationReducer } from './conversationSlice';
export { default as routeReducer } from './routeSlice';
export { default as nluReducer } from './nluSlice';
export { default as uiReducer } from './uiSlice';
export { default as offlineReducer } from './offlineSlice';
export { default as errorReducer } from './errorSlice';
export { default as loadingReducer } from './loadingSlice';

// Auth actions
export {
  initializeAuth,
  signUp,
  signIn,
  signOut,
  clearError as clearAuthError,
  updateUser,
} from './authSlice';

// Conversation actions
export {
  addUserMessage,
  addSystemMessage,
  addLoadingMessage,
  removeLoadingMessage,
  updateMessage,
  removeMessage,
  setLoading as setConversationLoading,
  setError as setConversationError,
  setPendingMessage,
  clearConversation,
  handleMessageAction,
} from './conversationSlice';

// Route actions
export {
  setPendingRoute,
  confirmRoute,
  clearPendingRoute,
  clearConfirmedRoute,
  addStop,
  removeStop,
  updateStop,
  reorderStops,
  setLoading as setRouteLoading,
  setError as setRouteError,
  updateRouteTotals,
  updatePolyline,
} from './routeSlice';

// NLU actions
export {
  processNLUResponse,
  setIntent,
  setConfidence,
  updateEntities,
  clearEntity,
  setConfirmationRequired,
  confirmIntent,
  startEscalation,
  endEscalation,
  resetRetries,
  clearNLU,
} from './nluSlice';

// UI actions
export {
  toggleConversation,
  setConversationVisible,
  toggleMap,
  setMapVisible,
  openDialog,
  closeDialog,
  enterAdjustmentMode,
  exitAdjustmentMode,
  setAdjustmentAction,
  setOfflineMode,
  addToast,
  removeToast,
  clearToasts,
  setLoading as setUILoading,
  startLoading,
  stopLoading,
  setKeyboardVisible,
  setMapCenter,
  setMapZoom,
  resetUI,
} from './uiSlice';

// Offline actions
export {
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
} from './offlineSlice';

// Error actions
export {
  setError,
  clearError,
  setErrorDialogVisible,
  clearErrorHistory,
  resetErrorCount,
  resetErrors,
} from './errorSlice';
export type { ErrorType, RecoveryOption, AppError, ErrorState } from './errorSlice';

// Loading actions
export {
  startOperation,
  updateProgress,
  updateMessage as updateLoadingMessage,
  completeOperation,
  cancelOperation,
  setMinimalLoader,
  clearAllOperations,
  resetLoading,
} from './loadingSlice';
export type { LoadingSliceState } from './loadingSlice';
