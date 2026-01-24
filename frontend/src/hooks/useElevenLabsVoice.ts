/**
 * useElevenLabsVoice - Hook for ElevenLabs voice conversations
 *
 * This hook provides a simple interface to ElevenLabs Conversational AI,
 * handling WebRTC connection, voice state, and integration with Redux.
 *
 * Features:
 * - Ultra-low latency voice via WebRTC
 * - Automatic state sync with Redux
 * - Client tool handling for route display (display_route, start_navigation, stop_navigation)
 * - Dynamic variables for ElevenLabs Server Tools (location, home/work anchors)
 * - Server Tools integration for route planning (plan_route, search_places, add_stop, get_eta)
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useConversation } from '@elevenlabs/react-native';
import { useDispatch } from 'react-redux';
import { useLocation } from './useLocation';
import { useUserAnchors } from './useUserAnchors';
import {
  setVoiceStatus,
  setTranscript,
  startListening,
  startSpeaking,
  stopSpeaking,
  setVoiceError,
  clearVoiceError,
  resetVoice,
  setVoiceRoute,
  type VoiceStatus,
} from '@/redux/slices/voiceSlice';
import {
  setPendingRoute,
  confirmRoute,
  clearConfirmedRoute,
  clearPendingRoute,
} from '@/redux/slices/routeSlice';
import type { Route } from '@/types/route';
import {
  ElevenLabsVoiceStatus,
  generateSessionId,
  getAgentId,
} from '@/services/voice/ElevenLabsVoice';

/**
 * Map ElevenLabs status to Redux voice status
 */
function mapToVoiceStatus(elStatus: ElevenLabsVoiceStatus): VoiceStatus {
  switch (elStatus) {
    case 'idle':
      return 'idle';
    case 'connecting':
      return 'connecting';
    case 'connected':
    case 'listening':
      return 'listening';
    case 'speaking':
      return 'speaking';
    case 'error':
      return 'error';
    default:
      return 'idle';
  }
}


/**
 * useElevenLabsVoice hook
 */
export function useElevenLabsVoice() {
  const dispatch = useDispatch();
  const { currentLocation } = useLocation();
  const { coordinates: anchorCoordinates } = useUserAnchors();

  // Local state
  const [status, setStatus] = useState<ElevenLabsVoiceStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setLocalTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);

  // Refs
  const sessionIdRef = useRef<string | null>(null);
  const isStartingRef = useRef(false);

  // ElevenLabs conversation hook
  const conversation = useConversation({
    onConnect: () => {
      console.log('[ElevenLabs] Connected');
      setStatus('connected');
      dispatch(setVoiceStatus('listening'));
      dispatch(clearVoiceError());
    },

    onDisconnect: () => {
      console.log('[ElevenLabs] Disconnected');
      setStatus('idle');
      dispatch(resetVoice());
      isStartingRef.current = false;
    },

    onMessage: (message) => {
      console.log('[ElevenLabs] Message:', message);

      // Handle transcripts
      if (message.source === 'user' && message.message) {
        setLocalTranscript(message.message);
        dispatch(setTranscript(message.message));
      }

      // Handle agent responses
      if (message.source === 'ai' && message.message) {
        // Agent is responding - could log or display
        console.log('[ElevenLabs] Agent says:', message.message);
      }
    },

    onError: (err: unknown) => {
      console.error('[ElevenLabs] Error:', err);
      setStatus('error');
      const errorMessage = err instanceof Error ? err.message : String(err) || 'Connection error';
      setError(errorMessage);
      dispatch(setVoiceError({
        message: errorMessage || 'Voice connection failed',
        recoverable: true,
      }));
      isStartingRef.current = false;
    },

    onModeChange: (mode) => {
      console.log('[ElevenLabs] Mode:', mode);

      if (mode.mode === 'speaking') {
        setStatus('speaking');
        dispatch(startSpeaking());
      } else if (mode.mode === 'listening') {
        setStatus('listening');
        dispatch(stopSpeaking());
        dispatch(startListening());
      }
    },

    onStatusChange: (newStatus) => {
      console.log('[ElevenLabs] Status:', newStatus);
      // Status can be: 'connected', 'disconnected', 'connecting'
      if (newStatus.status === 'connecting') {
        setStatus('connecting');
        dispatch(setVoiceStatus('connecting'));
      }
    },

    // Handle client tool calls from agent
    clientTools: {
      /**
       * Display route on the map
       * Returns a string response for the agent
       */
      display_route: (parameters: unknown): string => {
        const params = parameters as {
          route_id?: string;
          destination_name?: string;
          total_time?: number;
          total_distance?: number;
          polyline?: string;
        };
        console.log('[ElevenLabs] display_route called:', params);

        try {
          // Create route object from params
          const route: Route = {
            id: params.route_id || `route-${Date.now()}`,
            origin: {
              name: 'Current Location',
              location: currentLocation || { lat: 0, lng: 0 },
            },
            destination: {
              name: params.destination_name || 'Destination',
              location: { lat: 0, lng: 0 },
            },
            stops: [],
            waypoints: [],
            legs: [],
            totalDistance: params.total_distance || 0,
            totalTime: params.total_time || 0,
            polyline: params.polyline || '',
            detourBudget: { total: 0, used: 0, remaining: 0 },
            createdAt: Date.now(),
          };

          dispatch(setVoiceRoute(route));
          dispatch(setPendingRoute(route));

          console.log('[ElevenLabs] Route displayed on map:', route.id);
          return 'Route displayed on map successfully';
        } catch (err) {
          console.error('[ElevenLabs] Failed to display route:', err);
          return 'Failed to display route on map';
        }
      },

      /**
       * Start turn-by-turn navigation
       */
      start_navigation: (parameters: unknown): string => {
        const params = parameters as {
          route_id?: string;
          destination_name?: string;
        };
        console.log('[ElevenLabs] start_navigation called:', params);

        try {
          // Confirm the pending route to start navigation
          dispatch(confirmRoute());

          console.log('[ElevenLabs] Navigation started for route:', params.route_id);
          return 'Navigation started successfully';
        } catch (err) {
          console.error('[ElevenLabs] Failed to start navigation:', err);
          return 'Failed to start navigation';
        }
      },

      /**
       * Stop current navigation
       */
      stop_navigation: (parameters: unknown): string => {
        const params = parameters as {
          reason?: string;
        };
        console.log('[ElevenLabs] stop_navigation called:', params);

        try {
          // Clear the confirmed route
          dispatch(clearConfirmedRoute());
          dispatch(clearPendingRoute());

          console.log('[ElevenLabs] Navigation stopped:', params.reason || 'user requested');
          return 'Navigation stopped successfully';
        } catch (err) {
          console.error('[ElevenLabs] Failed to stop navigation:', err);
          return 'Failed to stop navigation';
        }
      },
    },
  });

  // Sync speaking state
  useEffect(() => {
    if (conversation.isSpeaking) {
      setStatus('speaking');
      dispatch(startSpeaking());
    }
  }, [conversation.isSpeaking, dispatch]);

  /**
   * Start voice session
   */
  const startSession = useCallback(async () => {
    if (isStartingRef.current) {
      console.log('[ElevenLabs] Already starting, ignoring');
      return;
    }

    const agentId = getAgentId();
    if (!agentId) {
      setError('ElevenLabs agent ID not configured');
      dispatch(setVoiceError({
        message: 'Voice agent not configured. Please check settings.',
        recoverable: false,
      }));
      return;
    }

    isStartingRef.current = true;
    setStatus('connecting');
    dispatch(setVoiceStatus('connecting'));
    setError(null);

    // Generate new session ID
    const newSessionId = generateSessionId();
    sessionIdRef.current = newSessionId;
    setSessionId(newSessionId);

    try {
      console.log('[ElevenLabs] Starting session:', newSessionId);

      // Build dynamic variables for ElevenLabs LLM Server Tools mode
      // These are injected into the agent's system prompt and tool calls
      const dynamicVariables: Record<string, string> = {
        session_id: newSessionId,
      };

      // Add current location if available
      if (currentLocation) {
        dynamicVariables.user_location_lat = currentLocation.lat.toString();
        dynamicVariables.user_location_lng = currentLocation.lng.toString();
      }

      // Add home anchor if saved
      if (anchorCoordinates.home) {
        dynamicVariables.home_lat = anchorCoordinates.home.lat.toString();
        dynamicVariables.home_lng = anchorCoordinates.home.lng.toString();
      }

      // Add work anchor if saved
      if (anchorCoordinates.work) {
        dynamicVariables.work_lat = anchorCoordinates.work.lat.toString();
        dynamicVariables.work_lng = anchorCoordinates.work.lng.toString();
      }

      console.log('[ElevenLabs] Dynamic variables:', Object.keys(dynamicVariables));

      await conversation.startSession({
        agentId,
        // Dynamic variables injected into ElevenLabs LLM system prompt
        dynamicVariables,
      });

      console.log('[ElevenLabs] Session started successfully');
    } catch (err) {
      console.error('[ElevenLabs] Failed to start session:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to start');
      dispatch(setVoiceError({
        message: 'Could not connect to voice service. Please try again.',
        recoverable: true,
      }));
      isStartingRef.current = false;
    }
  }, [conversation, currentLocation, anchorCoordinates, dispatch]);

  /**
   * End voice session
   */
  const endSession = useCallback(async () => {
    console.log('[ElevenLabs] Ending session');

    try {
      await conversation.endSession();
    } catch (err) {
      console.warn('[ElevenLabs] Error ending session:', err);
    }

    setStatus('idle');
    setSessionId(null);
    sessionIdRef.current = null;
    isStartingRef.current = false;
    dispatch(resetVoice());
  }, [conversation, dispatch]);

  /**
   * Toggle session (start/stop)
   */
  const toggleSession = useCallback(async () => {
    if (status === 'idle' || status === 'error') {
      await startSession();
    } else {
      await endSession();
    }
  }, [status, startSession, endSession]);

  /**
   * Set microphone muted state
   */
  const setMicMuted = useCallback((muted: boolean) => {
    setIsMicMuted(muted);
    if (conversation.setMicMuted) {
      conversation.setMicMuted(muted);
    }
  }, [conversation]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (sessionIdRef.current) {
        conversation.endSession().catch(() => {});
      }
    };
  }, [conversation]);

  return {
    // State
    status: mapToVoiceStatus(status),
    elStatus: status,
    isSpeaking: conversation.isSpeaking,
    isConnected: status === 'connected' || status === 'listening' || status === 'speaking',
    sessionId,
    transcript,
    error,
    isMicMuted,

    // Actions
    startSession,
    endSession,
    toggleSession,
    setMicMuted,

    // Raw conversation object for advanced usage
    conversation,
  };
}

export default useElevenLabsVoice;
