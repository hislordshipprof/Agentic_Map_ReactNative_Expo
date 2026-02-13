/**
 * Navigation Slice - In-app turn-by-turn navigation state
 *
 * Tracks the lifecycle of Google Navigation SDK sessions:
 * idle → initializing → ready → routing → navigating → arrived | error
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type NavigationStatus =
  | 'idle'
  | 'initializing'
  | 'ready'
  | 'routing'
  | 'navigating'
  | 'arrived'
  | 'error';

export interface NavigationState {
  status: NavigationStatus;
  currentStopIndex: number;
  totalStops: number;
  remainingTimeSeconds: number;
  remainingDistanceMeters: number;
  error: string | null;
}

const initialState: NavigationState = {
  status: 'idle',
  currentStopIndex: 0,
  totalStops: 0,
  remainingTimeSeconds: 0,
  remainingDistanceMeters: 0,
  error: null,
};

const navigationSlice = createSlice({
  name: 'navigation',
  initialState,
  reducers: {
    setNavigationStatus(state, action: PayloadAction<NavigationStatus>) {
      state.status = action.payload;
      if (action.payload !== 'error') {
        state.error = null;
      }
    },

    setCurrentStopIndex(state, action: PayloadAction<number>) {
      state.currentStopIndex = action.payload;
    },

    setTotalStops(state, action: PayloadAction<number>) {
      state.totalStops = action.payload;
    },

    updateRemainingTimeAndDistance(
      state,
      action: PayloadAction<{ seconds: number; meters: number }>
    ) {
      state.remainingTimeSeconds = action.payload.seconds;
      state.remainingDistanceMeters = action.payload.meters;
    },

    setNavigationError(state, action: PayloadAction<string>) {
      state.status = 'error';
      state.error = action.payload;
    },

    resetNavigation() {
      return initialState;
    },
  },
});

export const {
  setNavigationStatus,
  setCurrentStopIndex,
  setTotalStops,
  updateRemainingTimeAndDistance,
  setNavigationError,
  resetNavigation,
} = navigationSlice.actions;

export default navigationSlice.reducer;
