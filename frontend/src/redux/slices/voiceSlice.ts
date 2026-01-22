/**
 * Voice Slice - Redux state management for voice mode
 *
 * Per FINAL_REQUIREMENTS.md - Voice Mode Specification:
 * - Tracks voice session state (idle → listening → processing → speaking → confirming)
 * - Manages transcripts (interim and final)
 * - Tracks connection status
 * - Handles audio level for waveform visualization
 * - Manages pending route confirmation
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

/**
 * Voice session states
 * Matches the state machine from FINAL_REQUIREMENTS.md
 */
export type VoiceStatus =
  | 'idle'        // Not active, mic button in default state
  | 'connecting'  // Connecting to WebSocket
  | 'listening'   // Recording audio, showing waveform
  | 'processing'  // Processing transcript through NLU
  | 'speaking'    // Playing TTS audio response
  | 'confirming'  // Waiting for user confirmation
  | 'error';      // Error state

/**
 * Voice state interface
 */
export interface VoiceState {
  /** Current voice status */
  status: VoiceStatus;

  /** Whether connected to voice gateway */
  isConnected: boolean;

  /** Current session ID (null if not in session) */
  sessionId: string | null;

  /** Final transcript (committed after silence detection) */
  transcript: string;

  /** Interim transcript (updating while user speaks) */
  partialTranscript: string;

  /** Audio level for waveform visualization (0-1) */
  audioLevel: number;

  /** Whether voice mode is enabled (vs text mode) */
  isVoiceModeEnabled: boolean;

  /** Error message if in error state */
  error: string | null;

  /** Error code for recovery handling */
  errorCode: string | null;

  /** Whether error is recoverable */
  isRecoverable: boolean;

  /** Pending route ID for confirmation */
  pendingRouteId: string | null;

  /** Suggested response text (for display during TTS) */
  suggestedResponse: string | null;

  /** NLU confidence from last processing */
  nluConfidence: number | null;

  /** Whether confirmation is required before proceeding */
  requiresConfirmation: boolean;

  /** Timestamp of last activity */
  lastActivityAt: number | null;
}

/**
 * Initial state
 */
const initialState: VoiceState = {
  status: 'idle',
  isConnected: false,
  sessionId: null,
  transcript: '',
  partialTranscript: '',
  audioLevel: 0,
  isVoiceModeEnabled: true, // Default to voice mode enabled
  error: null,
  errorCode: null,
  isRecoverable: true,
  pendingRouteId: null,
  suggestedResponse: null,
  nluConfidence: null,
  requiresConfirmation: false,
  lastActivityAt: null,
};

/**
 * Voice slice
 */
const voiceSlice = createSlice({
  name: 'voice',
  initialState,
  reducers: {
    /**
     * Set voice status
     */
    setVoiceStatus: (state, action: PayloadAction<VoiceStatus>) => {
      state.status = action.payload;
      state.lastActivityAt = Date.now();

      // Clear error when transitioning away from error state
      if (action.payload !== 'error') {
        state.error = null;
        state.errorCode = null;
      }
    },

    /**
     * Set WebSocket connection status
     */
    setConnected: (state, action: PayloadAction<boolean>) => {
      state.isConnected = action.payload;

      if (!action.payload) {
        // Reset session state on disconnect
        state.sessionId = null;
        if (state.status !== 'idle' && state.status !== 'error') {
          state.status = 'idle';
        }
      }
    },

    /**
     * Set session ID
     */
    setSessionId: (state, action: PayloadAction<string | null>) => {
      state.sessionId = action.payload;
    },

    /**
     * Set final transcript
     */
    setTranscript: (state, action: PayloadAction<string>) => {
      state.transcript = action.payload;
      state.partialTranscript = ''; // Clear partial when final arrives
      state.lastActivityAt = Date.now();
    },

    /**
     * Set interim/partial transcript
     */
    setPartialTranscript: (state, action: PayloadAction<string>) => {
      state.partialTranscript = action.payload;
      state.lastActivityAt = Date.now();
    },

    /**
     * Set audio level (0-1 normalized)
     */
    setAudioLevel: (state, action: PayloadAction<number>) => {
      state.audioLevel = Math.max(0, Math.min(1, action.payload));
    },

    /**
     * Toggle voice mode enabled
     */
    toggleVoiceMode: (state) => {
      state.isVoiceModeEnabled = !state.isVoiceModeEnabled;

      // Reset state when disabling voice mode
      if (!state.isVoiceModeEnabled) {
        state.status = 'idle';
        state.transcript = '';
        state.partialTranscript = '';
        state.audioLevel = 0;
      }
    },

    /**
     * Set voice mode enabled
     */
    setVoiceModeEnabled: (state, action: PayloadAction<boolean>) => {
      state.isVoiceModeEnabled = action.payload;

      if (!action.payload) {
        state.status = 'idle';
        state.transcript = '';
        state.partialTranscript = '';
        state.audioLevel = 0;
      }
    },

    /**
     * Set error state
     */
    setVoiceError: (
      state,
      action: PayloadAction<{
        message: string;
        code?: string;
        recoverable?: boolean;
      }>
    ) => {
      state.status = 'error';
      state.error = action.payload.message;
      state.errorCode = action.payload.code ?? null;
      state.isRecoverable = action.payload.recoverable ?? true;
      state.lastActivityAt = Date.now();
    },

    /**
     * Clear error
     */
    clearVoiceError: (state) => {
      state.error = null;
      state.errorCode = null;
      state.isRecoverable = true;
      if (state.status === 'error') {
        state.status = 'idle';
      }
    },

    /**
     * Set pending route for confirmation
     */
    setPendingRouteId: (state, action: PayloadAction<string | null>) => {
      state.pendingRouteId = action.payload;
      if (action.payload) {
        state.status = 'confirming';
      }
    },

    /**
     * Set suggested response (TTS text)
     */
    setSuggestedResponse: (state, action: PayloadAction<string | null>) => {
      state.suggestedResponse = action.payload;
    },

    /**
     * Set NLU confidence
     */
    setNluConfidence: (state, action: PayloadAction<number | null>) => {
      state.nluConfidence = action.payload;
    },

    /**
     * Set requires confirmation flag
     */
    setRequiresConfirmation: (state, action: PayloadAction<boolean>) => {
      state.requiresConfirmation = action.payload;
    },

    /**
     * Handle NLU result from backend
     */
    handleNluResult: (
      state,
      action: PayloadAction<{
        intent: string;
        confidence: number;
        requiresConfirmation: boolean;
        suggestedResponse?: string;
      }>
    ) => {
      state.nluConfidence = action.payload.confidence;
      state.requiresConfirmation = action.payload.requiresConfirmation;
      state.suggestedResponse = action.payload.suggestedResponse ?? null;
      state.lastActivityAt = Date.now();
    },

    /**
     * Start listening (user tapped mic)
     */
    startListening: (state) => {
      state.status = 'listening';
      state.transcript = '';
      state.partialTranscript = '';
      state.audioLevel = 0;
      state.error = null;
      state.pendingRouteId = null;
      state.suggestedResponse = null;
      state.lastActivityAt = Date.now();
    },

    /**
     * Stop listening (user tapped mic again or silence detected)
     */
    stopListening: (state) => {
      if (state.status === 'listening') {
        state.status = 'processing';
        state.audioLevel = 0;
        state.lastActivityAt = Date.now();
      }
    },

    /**
     * Start speaking (TTS playback started)
     */
    startSpeaking: (state) => {
      state.status = 'speaking';
      state.lastActivityAt = Date.now();
    },

    /**
     * Stop speaking (TTS playback ended or interrupted)
     */
    stopSpeaking: (state) => {
      if (state.status === 'speaking') {
        state.status = state.pendingRouteId ? 'confirming' : 'idle';
        state.lastActivityAt = Date.now();
      }
    },

    /**
     * User confirmed the route/action
     */
    confirmAction: (state) => {
      state.status = 'idle';
      state.pendingRouteId = null;
      state.suggestedResponse = null;
      state.requiresConfirmation = false;
      state.lastActivityAt = Date.now();
    },

    /**
     * User rejected/cancelled the action
     */
    rejectAction: (state) => {
      state.status = 'idle';
      state.pendingRouteId = null;
      state.suggestedResponse = null;
      state.requiresConfirmation = false;
      state.transcript = '';
      state.partialTranscript = '';
      state.lastActivityAt = Date.now();
    },

    /**
     * Reset voice state to initial
     */
    resetVoice: (state) => {
      Object.assign(state, initialState);
      state.lastActivityAt = Date.now();
    },
  },
});

export const {
  setVoiceStatus,
  setConnected,
  setSessionId,
  setTranscript,
  setPartialTranscript,
  setAudioLevel,
  toggleVoiceMode,
  setVoiceModeEnabled,
  setVoiceError,
  clearVoiceError,
  setPendingRouteId,
  setSuggestedResponse,
  setNluConfidence,
  setRequiresConfirmation,
  handleNluResult,
  startListening,
  stopListening,
  startSpeaking,
  stopSpeaking,
  confirmAction,
  rejectAction,
  resetVoice,
} = voiceSlice.actions;

export default voiceSlice.reducer;
