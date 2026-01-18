/**
 * Route Slice - Redux state management for route optimization
 *
 * Per requirements-frontend.md Phase 1.4:
 * - Confirmed/pending routes
 * - Waypoints and stops management
 * - Route optimization state
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { RouteState, Route, RouteStop } from '@/types';

/**
 * Initial state
 */
const initialState: RouteState = {
  confirmed: null,
  pending: null,
  waypoints: [],
  totalDistance: 0,
  totalTime: 0,
  polyline: null,
  stops: [],
  isLoading: false,
  error: null,
};

/**
 * Route slice
 */
const routeSlice = createSlice({
  name: 'route',
  initialState,
  reducers: {
    /**
     * Set pending route (awaiting confirmation)
     */
    setPendingRoute: (state, action: PayloadAction<Route>) => {
      state.pending = action.payload;
      state.waypoints = action.payload.waypoints;
      state.stops = action.payload.stops;
      state.totalDistance = action.payload.totalDistance;
      state.totalTime = action.payload.totalTime;
      state.polyline = action.payload.polyline;
      state.isLoading = false;
      state.error = null;
    },

    /**
     * Confirm pending route
     */
    confirmRoute: (state) => {
      if (state.pending) {
        state.confirmed = state.pending;
        state.pending = null;
      }
    },

    /**
     * Clear pending route (cancel)
     */
    clearPendingRoute: (state) => {
      state.pending = null;
      if (!state.confirmed) {
        state.waypoints = [];
        state.stops = [];
        state.totalDistance = 0;
        state.totalTime = 0;
        state.polyline = null;
      }
    },

    /**
     * Clear confirmed route
     */
    clearConfirmedRoute: (state) => {
      state.confirmed = null;
      state.pending = null;
      state.waypoints = [];
      state.stops = [];
      state.totalDistance = 0;
      state.totalTime = 0;
      state.polyline = null;
    },

    /**
     * Add a stop to the route
     */
    addStop: (state, action: PayloadAction<RouteStop>) => {
      state.stops.push(action.payload);
    },

    /**
     * Remove a stop from the route
     */
    removeStop: (state, action: PayloadAction<string>) => {
      state.stops = state.stops.filter((s) => s.id !== action.payload);
    },

    /**
     * Update a stop
     */
    updateStop: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<RouteStop> }>
    ) => {
      const { id, updates } = action.payload;
      const index = state.stops.findIndex((s) => s.id === id);
      if (index !== -1) {
        state.stops[index] = { ...state.stops[index], ...updates };
      }
    },

    /**
     * Reorder stops
     */
    reorderStops: (state, action: PayloadAction<RouteStop[]>) => {
      state.stops = action.payload.map((stop, index) => ({
        ...stop,
        order: index + 1,
      }));
    },

    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    /**
     * Update route totals (after adjustment)
     */
    updateRouteTotals: (
      state,
      action: PayloadAction<{ totalDistance: number; totalTime: number }>
    ) => {
      state.totalDistance = action.payload.totalDistance;
      state.totalTime = action.payload.totalTime;
    },

    /**
     * Update polyline (after re-optimization)
     */
    updatePolyline: (state, action: PayloadAction<string>) => {
      state.polyline = action.payload;
    },
  },
});

export const {
  setPendingRoute,
  confirmRoute,
  clearPendingRoute,
  clearConfirmedRoute,
  addStop,
  removeStop,
  updateStop,
  reorderStops,
  setLoading,
  setError,
  updateRouteTotals,
  updatePolyline,
} = routeSlice.actions;

export default routeSlice.reducer;
