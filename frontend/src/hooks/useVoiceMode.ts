/**
 * useVoiceMode - Voice mode orchestration hook
 *
 * Connects VoiceClient, AudioStreamRecorder, and AudioPlayer with Redux state.
 * Handles the complete voice flow:
 * - WebSocket connection management
 * - Real-time audio streaming (100ms chunks)
 * - TTS playback
 * - State transitions
 * - Confirmation actions
 */

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '@/redux/store';
import {
  setVoiceStatus,
  setConnected,
  setSessionId,
  setTranscript,
  setPartialTranscript,
  setAudioLevel,
  toggleVoiceMode,
  setVoiceError,
  clearVoiceError,
  handleNluResult,
  startListening,
  stopListening,
  startSpeaking,
  stopSpeaking,
  confirmAction,
  rejectAction,
  resetVoice,
  type VoiceStatus,
} from '@/redux/slices/voiceSlice';
import {
  VoiceClient,
  getVoiceClient,
  resetVoiceClient,
  type TranscriptEvent,
  type NluResultEvent,
  type TtsAudioEvent,
  type StateChangeEvent,
  type VoiceErrorEvent,
} from '@/services/voice/VoiceClient';
import { useAudioStream } from '@/services/voice/AudioStreamRecorder';
import {
  AudioPlayer,
  getAudioPlayer,
  resetAudioPlayer,
} from '@/services/voice/AudioPlayer';

/**
 * API URL from environment
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

/**
 * Extract WebSocket URL from API URL
 */
function getWebSocketUrl(): string {
  // Remove /api/v1 suffix if present
  const baseUrl = API_URL.replace(/\/api\/v1\/?$/, '');
  return baseUrl;
}

/**
 * Voice mode hook result
 */
export interface UseVoiceModeResult {
  /** Current voice status */
  status: VoiceStatus;
  /** Whether connected to voice gateway */
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
}

/**
 * useVoiceMode hook
 */
export function useVoiceMode(): UseVoiceModeResult {
  const dispatch = useDispatch<AppDispatch>();

  // Select voice state from Redux
  const {
    status,
    isConnected,
    sessionId,
    transcript,
    partialTranscript,
    audioLevel,
    isVoiceModeEnabled,
    error,
    isRecoverable,
    suggestedResponse,
    requiresConfirmation,
  } = useSelector((state: RootState) => state.voice);

  // Refs for services (initialized lazily)
  const voiceClientRef = useRef<VoiceClient | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const isInitializedRef = useRef(false);
  const wasStreamingBeforeDisconnect = useRef(false); // Track if streaming was active before disconnect
  const statusRef = useRef(status); // Ref to track current status for callbacks
  const isStreamingRef = useRef(false); // Ref to track streaming state for callbacks

  // Keep refs in sync with state
  statusRef.current = status;

  /**
   * Audio stream callbacks - memoized to prevent re-renders
   */
  const audioStreamCallbacks = useMemo(() => ({
    onAudioChunk: (base64Data: string, _sequenceNumber: number) => {
      // Stream audio to backend via WebSocket
      voiceClientRef.current?.sendAudio(base64Data);
    },
    onAudioLevel: (level: number) => {
      dispatch(setAudioLevel(level));
    },
    onRecordingStart: () => {
      // Recording started - state is already set by VoiceClient events
    },
    onRecordingStop: () => {
      // Signal end of speech to backend
      voiceClientRef.current?.endSpeech();
    },
    onError: (err: Error) => {
      dispatch(setVoiceError({
        message: err.message,
        recoverable: true,
      }));
    },
    onPermissionDenied: () => {
      dispatch(setVoiceError({
        message: 'Microphone permission denied',
        code: 'PERMISSION_DENIED',
        recoverable: false,
      }));
    },
  }), [dispatch]);

  /**
   * Use the new audio streaming hook for real-time 100ms chunks
   */
  const {
    startStreaming,
    stopStreaming,
    isStreaming,
  } = useAudioStream(audioStreamCallbacks, {
    sampleRate: 16000,
    channels: 1,
    encoding: 'pcm_16bit',
    intervalMs: 100,
  });

  // Keep isStreamingRef in sync with isStreaming (for callbacks)
  isStreamingRef.current = isStreaming;

  /**
   * Initialize services with callbacks
   */
  const initializeServices = useCallback(() => {
    if (isInitializedRef.current) return;

    // Get or create VoiceClient
    voiceClientRef.current = getVoiceClient();
    voiceClientRef.current.setCallbacks({
      onConnected: () => {
        dispatch(setConnected(true));
        // If we were streaming before disconnect, show error to user
        // (auto-restart would be confusing - let user tap mic again)
        if (wasStreamingBeforeDisconnect.current) {
          wasStreamingBeforeDisconnect.current = false;
          dispatch(setVoiceError({
            message: 'Connection restored. Please tap mic to continue.',
            recoverable: true,
          }));
          dispatch(setVoiceStatus('idle'));
        } else {
          dispatch(setVoiceStatus('idle'));
        }
      },
      onDisconnected: (reason) => {
        // Track if we were actively streaming (Bug #2 fix - use refs for current values)
        if (statusRef.current === 'listening' || isStreamingRef.current) {
          wasStreamingBeforeDisconnect.current = true;
        }
        dispatch(setConnected(false));
        if (reason !== 'io client disconnect') {
          dispatch(setVoiceError({
            message: `Disconnected: ${reason}`,
            recoverable: true,
          }));
        }
      },
      onSessionStarted: (id) => {
        dispatch(setSessionId(id));
        dispatch(startListening());
      },
      onInterimTranscript: (event: TranscriptEvent) => {
        dispatch(setPartialTranscript(event.transcript));
      },
      onFinalTranscript: (event: TranscriptEvent) => {
        dispatch(setTranscript(event.transcript));
        dispatch(stopListening());
      },
      onNluResult: (event: NluResultEvent) => {
        dispatch(handleNluResult({
          intent: event.intent,
          confidence: event.confidence,
          requiresConfirmation: event.requiresConfirmation,
          suggestedResponse: event.suggestedResponse,
        }));
      },
      onTtsAudio: (event: TtsAudioEvent) => {
        dispatch(startSpeaking());
        audioPlayerRef.current?.play(event.audioData);
      },
      onStateChange: (event: StateChangeEvent) => {
        // Map backend state to frontend VoiceStatus
        const stateMap: Record<string, VoiceStatus> = {
          idle: 'idle',
          listening: 'listening',
          processing: 'processing',
          speaking: 'speaking',
          error: 'error',
        };
        const mappedStatus = stateMap[event.newState] || 'idle';
        dispatch(setVoiceStatus(mappedStatus));
      },
      onError: (event: VoiceErrorEvent) => {
        dispatch(setVoiceError({
          message: event.message,
          code: event.code,
          recoverable: event.recoverable,
        }));
      },
    });

    // Get or create AudioPlayer
    audioPlayerRef.current = getAudioPlayer();
    audioPlayerRef.current.setCallbacks({
      onPlaybackStart: () => {
        dispatch(startSpeaking());
      },
      onPlaybackEnd: () => {
        dispatch(stopSpeaking());
      },
      onPlaybackError: (err) => {
        dispatch(setVoiceError({
          message: `Audio playback failed: ${err.message}`,
          recoverable: true,
        }));
      },
    });

    // Initialize audio player
    audioPlayerRef.current.initialize();

    isInitializedRef.current = true;
  }, [dispatch]);

  /**
   * Connect to voice gateway
   */
  const connect = useCallback(async () => {
    initializeServices();

    if (voiceClientRef.current?.isConnected()) {
      return;
    }

    dispatch(setVoiceStatus('connecting'));

    try {
      const wsUrl = getWebSocketUrl();
      await voiceClientRef.current?.connect(wsUrl);
    } catch (err) {
      dispatch(setVoiceError({
        message: err instanceof Error ? err.message : 'Failed to connect',
        recoverable: true,
      }));
    }
  }, [dispatch, initializeServices]);

  /**
   * Disconnect from voice gateway
   */
  const disconnect = useCallback(async () => {
    // Stop streaming if active
    if (isStreaming) {
      await stopStreaming();
    }
    voiceClientRef.current?.disconnect();
    audioPlayerRef.current?.cleanup();
    dispatch(resetVoice());
  }, [dispatch, isStreaming, stopStreaming]);

  /**
   * Toggle voice mode
   */
  const toggleVoice = useCallback(() => {
    if (isVoiceModeEnabled) {
      disconnect();
    }
    dispatch(toggleVoiceMode());
  }, [isVoiceModeEnabled, disconnect, dispatch]);

  /**
   * Handle mic button press
   */
  const handleMicPress = useCallback(async () => {
    initializeServices();

    // If currently listening/streaming, stop (Bug #3 fix - proper sequence)
    if (status === 'listening' || isStreaming) {
      // First stop streaming completely
      await stopStreaming();
      // Then signal end of speech to backend (after streaming is stopped)
      voiceClientRef.current?.endSpeech();
      dispatch(stopListening());
      return;
    }

    // If speaking, interrupt TTS
    if (status === 'speaking') {
      await audioPlayerRef.current?.stop();
      voiceClientRef.current?.cancelTts();
      dispatch(stopSpeaking());
      return;
    }

    // If error, clear and retry
    if (status === 'error') {
      dispatch(clearVoiceError());
    }

    // Connect if not connected
    if (!voiceClientRef.current?.isConnected()) {
      await connect();
      // Wait a bit for connection to establish
      await new Promise((resolve) => setTimeout(resolve, 500));
    }

    // Bug #5 fix - Check if connection succeeded after the delay
    if (!voiceClientRef.current?.isConnected()) {
      dispatch(setVoiceError({
        message: 'Could not connect to voice server. Please try again.',
        recoverable: true,
      }));
      return;
    }

    // Start voice session and audio streaming
    try {
      voiceClientRef.current?.startSession();
      const started = await startStreaming();
      if (!started) {
        dispatch(setVoiceError({
          message: 'Failed to start audio streaming',
          recoverable: true,
        }));
      }
    } catch (err) {
      dispatch(setVoiceError({
        message: err instanceof Error ? err.message : 'Failed to start recording',
        recoverable: true,
      }));
    }
  }, [status, isStreaming, connect, dispatch, initializeServices, startStreaming, stopStreaming]);

  /**
   * Handle confirm action
   */
  const handleConfirm = useCallback(() => {
    dispatch(confirmAction());
    // The route confirmation is handled by the parent component
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
  const reset = useCallback(() => {
    disconnect();
  }, [disconnect]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isInitializedRef.current) {
        resetVoiceClient();
        resetAudioPlayer();
        isInitializedRef.current = false;
      }
    };
  }, []);

  return {
    status,
    isConnected,
    sessionId,
    transcript,
    partialTranscript,
    audioLevel,
    isVoiceModeEnabled,
    error,
    isRecoverable,
    suggestedResponse,
    requiresConfirmation,
    toggleVoice,
    handleMicPress,
    handleConfirm,
    handleReject,
    clearError,
    reset,
  };
}

export default useVoiceMode;
