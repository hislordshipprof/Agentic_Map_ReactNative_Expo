/**
 * Anchors Slice - Agentic Mobile Map
 *
 * Redux slice for managing user's saved locations (home, work).
 * Persisted via redux-persist for instant access on app load.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Anchor, AnchorType } from '@/types/user';
import type { LatLng } from '@/types/route';

/**
 * Anchors state interface
 */
export interface AnchorsState {
  /** List of saved anchor locations */
  anchors: Anchor[];
  /** Whether data has been hydrated from persistence */
  _hydrated: boolean;
}

const initialState: AnchorsState = {
  anchors: [],
  _hydrated: false,
};

/**
 * Payload for setting an anchor
 */
interface SetAnchorPayload {
  type: AnchorType;
  location: LatLng;
  name?: string;
  address?: string;
}

const anchorsSlice = createSlice({
  name: 'anchors',
  initialState,
  reducers: {
    /**
     * Set or update an anchor
     */
    setAnchor: (state, action: PayloadAction<SetAnchorPayload>) => {
      const { type, location, name, address } = action.payload;
      const displayName = name || (type === 'home' ? 'Home' : type === 'work' ? 'Work' : 'Custom');

      const newAnchor: Anchor = {
        id: `anchor_${type}_${Date.now()}`,
        name: displayName,
        location,
        address,
        type,
        lastUsed: Date.now(),
        createdAt: Date.now(),
      };

      // Remove existing anchor of same type
      const filtered = state.anchors.filter(a => a.type !== type);
      state.anchors = [...filtered, newAnchor];
    },

    /**
     * Remove an anchor by type
     */
    removeAnchor: (state, action: PayloadAction<AnchorType>) => {
      state.anchors = state.anchors.filter(a => a.type !== action.payload);
    },

    /**
     * Update last used timestamp for an anchor
     */
    touchAnchor: (state, action: PayloadAction<AnchorType>) => {
      const anchor = state.anchors.find(a => a.type === action.payload);
      if (anchor) {
        anchor.lastUsed = Date.now();
      }
    },

    /**
     * Import anchors from AsyncStorage migration
     */
    importAnchors: (state, action: PayloadAction<Anchor[]>) => {
      // Only import if we have no anchors yet
      if (state.anchors.length === 0 && action.payload.length > 0) {
        state.anchors = action.payload;
      }
    },

    /**
     * Mark as hydrated (set by persist rehydrate)
     */
    setHydrated: (state) => {
      state._hydrated = true;
    },

    /**
     * Clear all anchors
     */
    clearAnchors: (state) => {
      state.anchors = [];
    },
  },
});

export const {
  setAnchor,
  removeAnchor,
  touchAnchor,
  importAnchors,
  setHydrated,
  clearAnchors,
} = anchorsSlice.actions;

export default anchorsSlice.reducer;
