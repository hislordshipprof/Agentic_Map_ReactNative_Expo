/**
 * NLU Slice - Redux state management for natural language understanding
 *
 * Per requirements-frontend.md Phase 2.1:
 * - Confidence-based routing
 * - Intent and entity tracking
 * - Escalation handling
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  NLUState,
  NLUResponse,
  Intent,
  Entities,
} from '@/types';

/**
 * Initial state
 */
const initialState: NLUState = {
  lastIntent: null,
  lastConfidence: null,
  currentEntities: {},
  confirmationRequired: false,
  lowConfidenceRetries: 0,
  isEscalating: false,
  lastResponse: null,
};

/**
 * NLU slice
 */
const nluSlice = createSlice({
  name: 'nlu',
  initialState,
  reducers: {
    /**
     * Process NLU response from backend
     */
    processNLUResponse: (state, action: PayloadAction<NLUResponse>) => {
      const response = action.payload;
      state.lastIntent = response.intent;
      state.lastConfidence = response.confidence;
      state.currentEntities = response.entities;
      state.lastResponse = response;
      state.isEscalating = false;

      // Determine if confirmation is required
      if (response.confidence >= 0.80) {
        // HIGH confidence - no confirmation needed
        state.confirmationRequired = false;
        state.lowConfidenceRetries = 0;
      } else if (response.confidence >= 0.60) {
        // MEDIUM confidence - show confirmation
        state.confirmationRequired = true;
        state.lowConfidenceRetries = 0;
      } else {
        // LOW confidence - track retries
        state.confirmationRequired = false;
        state.lowConfidenceRetries += 1;
      }
    },

    /**
     * Set intent directly (e.g., from user selection)
     */
    setIntent: (state, action: PayloadAction<Intent>) => {
      state.lastIntent = action.payload;
    },

    /**
     * Set confidence directly
     */
    setConfidence: (state, action: PayloadAction<number>) => {
      state.lastConfidence = action.payload;
      state.confirmationRequired = action.payload >= 0.60 && action.payload < 0.80;
    },

    /**
     * Update entities
     */
    updateEntities: (state, action: PayloadAction<Partial<Entities>>) => {
      state.currentEntities = {
        ...state.currentEntities,
        ...action.payload,
      };
    },

    /**
     * Clear specific entity
     */
    clearEntity: (state, action: PayloadAction<keyof Entities>) => {
      delete state.currentEntities[action.payload];
    },

    /**
     * Set confirmation required flag
     */
    setConfirmationRequired: (state, action: PayloadAction<boolean>) => {
      state.confirmationRequired = action.payload;
    },

    /**
     * Confirm intent (user accepted)
     */
    confirmIntent: (state) => {
      state.confirmationRequired = false;
      state.lowConfidenceRetries = 0;
    },

    /**
     * Start escalation to advanced agent
     */
    startEscalation: (state) => {
      state.isEscalating = true;
    },

    /**
     * End escalation
     */
    endEscalation: (state) => {
      state.isEscalating = false;
    },

    /**
     * Reset low confidence retry count
     */
    resetRetries: (state) => {
      state.lowConfidenceRetries = 0;
    },

    /**
     * Clear all NLU state
     */
    clearNLU: (state) => {
      state.lastIntent = null;
      state.lastConfidence = null;
      state.currentEntities = {};
      state.confirmationRequired = false;
      state.lowConfidenceRetries = 0;
      state.isEscalating = false;
      state.lastResponse = null;
    },
  },
});

export const {
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
} = nluSlice.actions;

export default nluSlice.reducer;
