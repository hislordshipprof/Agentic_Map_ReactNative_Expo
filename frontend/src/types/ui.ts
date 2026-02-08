/**
 * UI Types - Agentic Mobile Map
 *
 * Type definitions for UI state, dialogs, and display modes.
 * Per requirements-frontend.md Phase 1.4 UI Slice
 */

/**
 * Dialog types that can be shown
 */
export type DialogType =
  | 'confirmation'      // Confirm understood intent (medium confidence)
  | 'disambiguation'    // Choose between multiple places
  | 'alternatives'      // Choose alternative intent (low confidence)
  | 'error'             // Error with options
  | 'adjustment'        // Modify stops
  | 'none';             // No dialog open

/**
 * Adjustment mode actions
 */
export type AdjustmentAction =
  | 'reorder'           // Drag to reorder stops
  | 'remove'            // Swipe to remove stop
  | 'add'               // Add new stop
  | 'replace';          // Replace a stop with alternative

/**
 * Toast notification type
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast notification
 */
export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  /** Duration in ms (0 = persistent) */
  duration: number;
  /** Action button */
  action?: {
    label: string;
    onPress: () => void;
  };
}

/**
 * Loading state with context
 */
export interface LoadingState {
  isLoading: boolean;
  /** What is being loaded */
  context?: 'nlu' | 'route' | 'places' | 'navigation' | 'sync';
  /** Loading message to display */
  message?: string;
}

/**
 * UI state for Redux slice
 */
export interface UIState {
  /** Whether conversation panel is visible */
  conversationVisible: boolean;
  /** Whether map is visible */
  mapVisible: boolean;
  /** Current open dialog */
  currentDialog: DialogType;
  /** Data for current dialog */
  dialogData: Record<string, unknown> | null;
  /** Whether in adjustment mode */
  adjustmentMode: boolean;
  /** Current adjustment action */
  adjustmentAction: AdjustmentAction | null;
  /** Whether in offline mode */
  offlineMode: boolean;
  /** Current toasts */
  toasts: Toast[];
  /** Global loading state */
  loading: LoadingState;
  /** Whether keyboard is visible */
  keyboardVisible: boolean;
  /** Map camera target */
  mapCenter: { lat: number; lng: number } | null;
  /** Map zoom level */
  mapZoom: number;
}

