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
  setVoiceRoute,
  startListening,
  stopListening,
  startSpeaking,
  stopSpeaking,
  confirmAction,
  rejectAction,
  resetVoice,
  type VoiceStatus,
} from '@/redux/slices/voiceSlice';
import { setPendingRoute } from '@/redux/slices/routeSlice';
import {
  VoiceClient,
  getVoiceClient,
  resetVoiceClient,
  type TranscriptEvent,
  type NluResultEvent,
  type RoutePlannedEvent,
  type TtsAudioEvent,
  type StateChangeEvent,
  type VoiceErrorEvent,
} from '@/services/voice/VoiceClient';
import { useLocation } from './useLocation';
import type { Route, RouteStop } from '@/types/route';
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
  /** Route planned from voice navigation (before confirmation) */
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
}

/**
 * useVoiceMode hook
 */
export function useVoiceMode(): UseVoiceModeResult {
  const dispatch = useDispatch<AppDispatch>();

  // Get current location for route planning
  const { currentLocation } = useLocation();

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
    voiceRoute,
  } = useSelector((state: RootState) => state.voice);

  // Refs for services (initialized lazily)
  const voiceClientRef = useRef<VoiceClient | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const isInitializedRef = useRef(false);
  const wasStreamingBeforeDisconnect = useRef(false); // Track if streaming was active before disconnect
  const statusRef = useRef(status); // Ref to track current status for callbacks
  const isStreamingRef = useRef(false); // Ref to track streaming state for callbacks
  const stopStreamingRef = useRef<(() => Promise<void>) | null>(null); // Ref to stopStreaming function

  // Keep refs in sync with state
  statusRef.current = status;

  /**
   * Audio stream callbacks - memoized to prevent re-renders
   */
  const audioStreamCallbacks = useMemo(() => ({
    onAudioChunk: (base64Data: string, sequenceNumber: number) => {
      // Debug: Log callback invocation
      if (sequenceNumber <= 3) {
        console.log(`[useVoiceMode] onAudioChunk called: seq=${sequenceNumber}, hasClient=${!!voiceClientRef.current}, dataLen=${base64Data.length}`);
      }
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

  // Keep refs in sync with hook values (for callbacks to avoid stale closures)
  isStreamingRef.current = isStreaming;
  stopStreamingRef.current = stopStreaming;

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
        console.log(`[useVoiceMode] Interim transcript received: "${event.transcript}"`);
        dispatch(setPartialTranscript(event.transcript));
      },
      onFinalTranscript: (event: TranscriptEvent) => {
        dispatch(setTranscript(event.transcript));
        dispatch(stopListening());
      },
      onSpeechEnd: async () => {
        // VAD detected end of speech - stop audio streaming automatically
        console.log('[useVoiceMode] Speech end detected, stopping audio streaming');
        // Use stopStreamingRef to avoid stale closure issues
        if (stopStreamingRef.current) {
          await stopStreamingRef.current();
        }
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
      onRoutePlanned: (event: RoutePlannedEvent) => {
        console.log('[useVoiceMode] Route planned, converting to Route type');
        // Convert backend route format to frontend Route type
        const route: Route = {
          id: event.route.id,
          origin: event.route.origin,
          destination: event.route.destination,
          stops: event.route.stops.map((s): RouteStop => ({
            id: s.id,
            name: s.name,
            location: s.location,
            mileMarker: 0, // Will be calculated by route display
            detourCost: s.detourCost,
            status: 'MINIMAL', // Default status
            order: s.order,
          })),
          waypoints: [], // Will be populated by route display
          legs: [], // Will be populated by route display
          totalDistance: event.route.totalDistance,
          totalTime: event.route.totalTime,
          polyline: event.route.polyline,
          detourBudget: { total: 0, used: 0, remaining: 0 },
          createdAt: Date.now(),
        };
        // Set route in voice slice for confirmation UI
        dispatch(setVoiceRoute(route));
        // Also set as pending route for map display
        dispatch(setPendingRoute(route));
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
   * Note: Use isStreamingRef instead of isStreaming to avoid callback recreation
   * when streaming state changes (which would cause unwanted side effects)
   */
  const disconnect = useCallback(async () => {
    // Stop streaming if active (use ref to avoid dependency on isStreaming)
    if (isStreamingRef.current) {
      await stopStreaming();
    }
    voiceClientRef.current?.disconnect();
    audioPlayerRef.current?.cleanup();
    dispatch(resetVoice());
  }, [dispatch, stopStreaming]);

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
   * Note: Use isStreamingRef instead of isStreaming to avoid callback recreation
   */
  const handleMicPress = useCallback(async () => {
    initializeServices();

    // If currently listening/streaming, stop (Bug #3 fix - proper sequence)
    // Use ref to avoid dependency on isStreaming which causes callback recreation
    if (status === 'listening' || isStreamingRef.current) {
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
    // CRITICAL: Must wait for session to be ready before starting audio streaming
    // Otherwise audio chunks arrive at backend before STT stream is initialized
    try {
      dispatch(setVoiceStatus('connecting'));

      // Step 1: Start session and WAIT for backend confirmation
      // Pass user location for route planning
      const sessionId = await voiceClientRef.current?.startSessionAsync(
        undefined,
        10000,
        currentLocation ?? undefined,
      );
      if (!sessionId) {
        dispatch(setVoiceError({
          message: 'Failed to start voice session',
          recoverable: true,
        }));
        return;
      }

      // Step 2: Session is confirmed ready, NOW start audio streaming
      const started = await startStreaming();
      if (!started) {
        // Clean up the session if streaming failed
        voiceClientRef.current?.stopSession();
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
  }, [status, connect, dispatch, initializeServices, startStreaming, stopStreaming, currentLocation]);

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
    voiceRoute,
    toggleVoice,
    handleMicPress,
    handleConfirm,
    handleReject,
    clearError,
    reset,
  };
}

export default useVoiceMode;
