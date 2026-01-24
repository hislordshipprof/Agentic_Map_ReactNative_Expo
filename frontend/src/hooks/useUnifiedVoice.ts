/**
 * useUnifiedVoice - Unified voice hook that switches between implementations
 *
 * This hook provides a unified interface for voice functionality, automatically
 * switching between the legacy WebSocket-based voice and ElevenLabs WebRTC voice
 * based on the EXPO_PUBLIC_USE_ELEVENLABS environment variable.
 *
 * Usage:
 * - Set EXPO_PUBLIC_USE_ELEVENLABS=true to use ElevenLabs (default: false)
 * - Set EXPO_PUBLIC_ELEVENLABS_AGENT_ID to your ElevenLabs agent ID
 */

import { useCallback, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/redux/store';
import {
  toggleVoiceMode,
  confirmAction,
  rejectAction,
  clearVoiceError,
  resetVoice,
  type VoiceStatus,
} from '@/redux/slices/voiceSlice';
import { useVoiceMode } from './useVoiceMode';
import { useElevenLabsVoice } from './useElevenLabsVoice';
import type { Route } from '@/types/route';

/**
 * Check if ElevenLabs is enabled via environment variable
 */
const USE_ELEVENLABS = process.env.EXPO_PUBLIC_USE_ELEVENLABS === 'true';

/**
 * Unified voice hook result - compatible with existing useVoiceMode interface
 */
export interface UseUnifiedVoiceResult {
  /** Current voice status */
  status: VoiceStatus;
  /** Whether connected to voice service */
  isConnected: boolean;
  /** Current session ID */
  sessionId: string | null;
  /** Final transcript */
  transcript: string;
  /** Interim/partial transcript */
  partialTranscript: string;
  /** Audio level for visualization (0-1) */
  audioLevel: number;
  /** Whether voice mode is enabled */
  isVoiceModeEnabled: boolean;
  /** Error message if any */
  error: string | null;
  /** Whether error is recoverable */
  isRecoverable: boolean;
  /** Suggested response text */
  suggestedResponse: string | null;
  /** Whether confirmation is required */
  requiresConfirmation: boolean;
  /** Route planned from voice navigation */
  voiceRoute: Route | null;
  /** Toggle voice mode on/off */
  toggleVoice: () => void;
  /** Handle mic button press */
  handleMicPress: () => Promise<void>;
  /** Confirm the pending action */
  handleConfirm: () => void;
  /** Reject the pending action */
  handleReject: () => void;
  /** Clear any error */
  clearError: () => void;
  /** Reset voice state */
  reset: () => void;
  /** Which voice backend is active */
  voiceBackend: 'legacy' | 'elevenlabs';
}

/**
 * useUnifiedVoice hook - automatically selects between legacy and ElevenLabs voice
 */
export function useUnifiedVoice(): UseUnifiedVoiceResult {
  const dispatch = useDispatch<AppDispatch>();

  // Get voice mode state from Redux
  const { isVoiceModeEnabled, voiceRoute } = useSelector(
    (state: RootState) => state.voice
  );

  // Legacy voice hook (always called, but may not be used)
  const legacyVoice = useVoiceMode();

  // ElevenLabs voice hook (always called, but may not be used)
  const elevenLabsVoice = useElevenLabsVoice();

  /**
   * Toggle voice mode - unified for both backends
   */
  const toggleVoice = useCallback(() => {
    if (USE_ELEVENLABS) {
      // For ElevenLabs, toggle session on/off
      if (elevenLabsVoice.isConnected) {
        elevenLabsVoice.endSession();
      }
    } else {
      // Legacy toggle
      legacyVoice.toggleVoice();
      return;
    }
    dispatch(toggleVoiceMode());
  }, [dispatch, elevenLabsVoice, legacyVoice]);

  /**
   * Handle mic press - start/stop voice session
   */
  const handleMicPress = useCallback(async () => {
    if (USE_ELEVENLABS) {
      await elevenLabsVoice.toggleSession();
    } else {
      await legacyVoice.handleMicPress();
    }
  }, [elevenLabsVoice, legacyVoice]);

  /**
   * Handle confirm action
   */
  const handleConfirm = useCallback(() => {
    dispatch(confirmAction());
  }, [dispatch]);

  /**
   * Handle reject action
   */
  const handleReject = useCallback(() => {
    dispatch(rejectAction());
  }, [dispatch]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    dispatch(clearVoiceError());
  }, [dispatch]);

  /**
   * Reset voice state
   */
  const reset = useCallback(async () => {
    if (USE_ELEVENLABS) {
      await elevenLabsVoice.endSession();
    } else {
      legacyVoice.reset();
    }
    dispatch(resetVoice());
  }, [dispatch, elevenLabsVoice, legacyVoice]);

  // Log which backend is active (development only)
  useEffect(() => {
    if (__DEV__) {
      console.log(`[useUnifiedVoice] Using ${USE_ELEVENLABS ? 'ElevenLabs' : 'Legacy'} voice backend`);
    }
  }, []);

  // Return unified interface
  if (USE_ELEVENLABS) {
    return {
      status: elevenLabsVoice.status,
      isConnected: elevenLabsVoice.isConnected,
      sessionId: elevenLabsVoice.sessionId,
      transcript: elevenLabsVoice.transcript,
      partialTranscript: '', // ElevenLabs handles this internally
      audioLevel: 0, // ElevenLabs handles visualization internally
      isVoiceModeEnabled,
      error: elevenLabsVoice.error,
      isRecoverable: true, // ElevenLabs errors are generally recoverable
      suggestedResponse: null, // Handled by ElevenLabs agent
      requiresConfirmation: false, // Handled by ElevenLabs agent tools
      voiceRoute,
      toggleVoice,
      handleMicPress,
      handleConfirm,
      handleReject,
      clearError,
      reset,
      voiceBackend: 'elevenlabs',
    };
  }

  // Return legacy interface
  return {
    status: legacyVoice.status,
    isConnected: legacyVoice.isConnected,
    sessionId: legacyVoice.sessionId,
    transcript: legacyVoice.transcript,
    partialTranscript: legacyVoice.partialTranscript,
    audioLevel: legacyVoice.audioLevel,
    isVoiceModeEnabled: legacyVoice.isVoiceModeEnabled,
    error: legacyVoice.error,
    isRecoverable: legacyVoice.isRecoverable,
    suggestedResponse: legacyVoice.suggestedResponse,
    requiresConfirmation: legacyVoice.requiresConfirmation,
    voiceRoute: legacyVoice.voiceRoute,
    toggleVoice: legacyVoice.toggleVoice,
    handleMicPress: legacyVoice.handleMicPress,
    handleConfirm: legacyVoice.handleConfirm,
    handleReject: legacyVoice.handleReject,
    clearError: legacyVoice.clearError,
    reset: legacyVoice.reset,
    voiceBackend: 'legacy',
  };
}

export default useUnifiedVoice;
