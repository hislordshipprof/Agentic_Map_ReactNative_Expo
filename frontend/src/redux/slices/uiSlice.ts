/**
 * UI Slice - Redux state management for UI state
 *
 * Per requirements-frontend.md Phase 1.4:
 * - Dialog visibility management
 * - Adjustment mode state
 * - Toast notifications
 * - Loading states
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  UIState,
  DialogType,
  AdjustmentAction,
  Toast,
  LoadingState,
} from '@/types';

/**
 * Initial state
 */
const initialState: UIState = {
  conversationVisible: true,
  mapVisible: true,
  currentDialog: 'none',
  dialogData: null,
  adjustmentMode: false,
  adjustmentAction: null,
  offlineMode: false,
  toasts: [],
  loading: { isLoading: false },
  keyboardVisible: false,
  mapCenter: null,
  mapZoom: 14,
};

/**
 * UI slice
 */
const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    /**
     * Toggle conversation panel visibility
     */
    toggleConversation: (state) => {
      state.conversationVisible = !state.conversationVisible;
    },

    /**
     * Set conversation visibility
     */
    setConversationVisible: (state, action: PayloadAction<boolean>) => {
      state.conversationVisible = action.payload;
    },

    /**
     * Toggle map visibility
     */
    toggleMap: (state) => {
      state.mapVisible = !state.mapVisible;
    },

    /**
     * Set map visibility
     */
    setMapVisible: (state, action: PayloadAction<boolean>) => {
      state.mapVisible = action.payload;
    },

    /**
     * Open a dialog
     */
    openDialog: (
      state,
      action: PayloadAction<{
        type: DialogType;
        data?: Record<string, unknown>;
      }>
    ) => {
      state.currentDialog = action.payload.type;
      state.dialogData = action.payload.data || null;
    },

    /**
     * Close current dialog
     */
    closeDialog: (state) => {
      state.currentDialog = 'none';
      state.dialogData = null;
    },

    /**
     * Enter adjustment mode
     */
    enterAdjustmentMode: (
      state,
      action: PayloadAction<AdjustmentAction | undefined>
    ) => {
      state.adjustmentMode = true;
      state.adjustmentAction = action.payload || null;
    },

    /**
     * Exit adjustment mode
     */
    exitAdjustmentMode: (state) => {
      state.adjustmentMode = false;
      state.adjustmentAction = null;
    },

    /**
     * Set adjustment action
     */
    setAdjustmentAction: (state, action: PayloadAction<AdjustmentAction | null>) => {
      state.adjustmentAction = action.payload;
    },

    /**
     * Set offline mode
     */
    setOfflineMode: (state, action: PayloadAction<boolean>) => {
      state.offlineMode = action.payload;
    },

    /**
     * Add a toast notification
     */
    addToast: (state, action: PayloadAction<Toast>) => {
      state.toasts.push(action.payload);
    },

    /**
     * Remove a toast notification
     */
    removeToast: (state, action: PayloadAction<string>) => {
      state.toasts = state.toasts.filter((t) => t.id !== action.payload);
    },

    /**
     * Clear all toasts
     */
    clearToasts: (state) => {
      state.toasts = [];
    },

    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<LoadingState>) => {
      state.loading = action.payload;
    },

    /**
     * Start loading with context
     */
    startLoading: (
      state,
      action: PayloadAction<{ context: LoadingState['context']; message?: string }>
    ) => {
      state.loading = {
        isLoading: true,
        context: action.payload.context,
        message: action.payload.message,
      };
    },

    /**
     * Stop loading
     */
    stopLoading: (state) => {
      state.loading = { isLoading: false };
    },

    /**
     * Set keyboard visibility
     */
    setKeyboardVisible: (state, action: PayloadAction<boolean>) => {
      state.keyboardVisible = action.payload;
    },

    /**
     * Set map center
     */
    setMapCenter: (
      state,
      action: PayloadAction<{ lat: number; lng: number } | null>
    ) => {
      state.mapCenter = action.payload;
    },

    /**
     * Set map zoom
     */
    setMapZoom: (state, action: PayloadAction<number>) => {
      state.mapZoom = action.payload;
    },

    /**
     * Reset UI to initial state
     */
    resetUI: () => initialState,
  },
});

export const {
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
  setLoading,
  startLoading,
  stopLoading,
  setKeyboardVisible,
  setMapCenter,
  setMapZoom,
  resetUI,
} = uiSlice.actions;

export default uiSlice.reducer;
