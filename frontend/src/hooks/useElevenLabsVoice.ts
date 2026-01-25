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
import { router } from 'expo-router';
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
import type { Route, RouteStop } from '@/types/route';
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
  const { coordinates: anchorCoordinates, isHydrated: anchorsHydrated } = useUserAnchors();

  // Local state
  const [status, setStatus] = useState<ElevenLabsVoiceStatus>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [transcript, setLocalTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isMicMuted, setIsMicMuted] = useState(false);

  // Refs
  const sessionIdRef = useRef<string | null>(null);
  const isStartingRef = useRef(false);

  // Use refs to always access the latest values (avoids stale closure issues)
  const currentLocationRef = useRef(currentLocation);
  const anchorCoordinatesRef = useRef(anchorCoordinates);
  const anchorsHydratedRef = useRef(anchorsHydrated);

  // Keep refs updated with latest values
  currentLocationRef.current = currentLocation;
  anchorCoordinatesRef.current = anchorCoordinates;
  anchorsHydratedRef.current = anchorsHydrated;

  // Debug: Log when anchors change
  useEffect(() => {
    console.log('[ElevenLabs] Anchors state updated:', {
      hydrated: anchorsHydrated,
      home: anchorCoordinates.home ? `(${anchorCoordinates.home.lat}, ${anchorCoordinates.home.lng})` : 'not set',
      work: anchorCoordinates.work ? `(${anchorCoordinates.work.lat}, ${anchorCoordinates.work.lng})` : 'not set',
    });
  }, [anchorsHydrated, anchorCoordinates]);

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
        // Define stop object type from ElevenLabs
        // Backend sends: id, name, lat, lng, order, detour_minutes
        interface ElevenLabsStop {
          id?: string;
          name?: string;
          lat?: number | string;
          lng?: number | string;
          order?: number | string;
          detour_minutes?: number | string;
          status?: 'on_route' | 'small_detour' | 'large_detour';
        }

        // Map backend status to frontend DetourStatus
        const mapStatus = (status?: string, detourMinutes?: number): 'NO_DETOUR' | 'MINIMAL' | 'ACCEPTABLE' | 'NOT_RECOMMENDED' => {
          if (status === 'on_route' || detourMinutes === 0) return 'NO_DETOUR';
          if (status === 'small_detour' || (detourMinutes && detourMinutes <= 3)) return 'MINIMAL';
          if (status === 'large_detour' || (detourMinutes && detourMinutes > 5)) return 'NOT_RECOMMENDED';
          return 'ACCEPTABLE';
        };

        const params = parameters as {
          route_id?: string;
          destination_name?: string;
          destination_lat?: number | string;
          destination_lng?: number | string;
          total_time?: number | string;
          total_distance?: number | string;
          polyline?: string;
          stops?: ElevenLabsStop[];
          // Additional fields from backend response
          stop_details?: Array<{
            name: string;
            status: 'on_route' | 'small_detour' | 'large_detour';
            detour_minutes: number;
          }>;
          total_detour_minutes?: number;
          detour_category?: 'MINIMAL' | 'SIGNIFICANT' | 'FAR';
        };
        console.log('[ElevenLabs] display_route called:', JSON.stringify(params, null, 2));

        try {
          // Ensure numeric values (ElevenLabs may pass strings)
          const totalDistance = typeof params.total_distance === 'string'
            ? parseFloat(params.total_distance)
            : (params.total_distance || 0);
          const totalTime = typeof params.total_time === 'string'
            ? parseFloat(params.total_time)
            : (params.total_time || 0);

          // Build a map of stop details by name for quick lookup
          const stopDetailsMap = new Map<string, { status: string; detour_minutes: number }>();
          if (params.stop_details) {
            params.stop_details.forEach(detail => {
              stopDetailsMap.set(detail.name.toLowerCase(), {
                status: detail.status,
                detour_minutes: detail.detour_minutes,
              });
            });
          }

          // Parse stops from agent
          const stops: RouteStop[] = (params.stops || []).map((stop, index) => {
            const lat = typeof stop.lat === 'string' ? parseFloat(stop.lat) : (stop.lat || 0);
            const lng = typeof stop.lng === 'string' ? parseFloat(stop.lng) : (stop.lng || 0);
            const order = typeof stop.order === 'string' ? parseInt(stop.order, 10) : (stop.order || index + 1);

            // Get detour minutes from stop or stop_details
            const detourMinutes = typeof stop.detour_minutes === 'string'
              ? parseFloat(stop.detour_minutes)
              : (stop.detour_minutes || 0);

            // Try to get detailed info from stop_details map
            const stopName = stop.name || `Stop ${index + 1}`;
            const details = stopDetailsMap.get(stopName.toLowerCase());
            const finalDetourMinutes = details?.detour_minutes ?? detourMinutes;

            // Convert minutes to meters for detourCost (roughly 1 min = 800m at avg speed)
            // Or use the detour_minutes directly if available
            const detourCostMeters = finalDetourMinutes * 800;

            // Determine status from stop_details or stop.status or infer from detour
            const status = mapStatus(details?.status || stop.status, finalDetourMinutes);

            return {
              id: stop.id || `stop-${index + 1}`,
              name: stopName,
              location: { lat, lng },
              mileMarker: 0,
              detourCost: detourCostMeters,
              status,
              order,
            };
          });

          // Sort stops by order
          stops.sort((a, b) => (a.order || 0) - (b.order || 0));

          // Get destination coordinates (from params or default)
          const destLat = typeof params.destination_lat === 'string'
            ? parseFloat(params.destination_lat)
            : (params.destination_lat || 0);
          const destLng = typeof params.destination_lng === 'string'
            ? parseFloat(params.destination_lng)
            : (params.destination_lng || 0);

          // Create route object from params
          const route: Route = {
            id: params.route_id || `route-${Date.now()}`,
            origin: {
              name: 'Current Location',
              location: currentLocation || { lat: 0, lng: 0 },
            },
            destination: {
              name: params.destination_name || 'Destination',
              location: { lat: destLat, lng: destLng },
            },
            stops,
            waypoints: [],
            legs: [],
            totalDistance: isNaN(totalDistance) ? 0 : totalDistance,
            totalTime: isNaN(totalTime) ? 0 : totalTime,
            polyline: params.polyline || '',
            detourBudget: { total: 10, used: 0, remaining: 10 },
            createdAt: Date.now(),
          };

          dispatch(setVoiceRoute(route));
          dispatch(setPendingRoute(route));

          // Navigate to route tab to show the route confirmation screen
          router.push('/(tabs)/route');

          console.log('[ElevenLabs] Route displayed on map:', route.id, 'with', stops.length, 'stops');
          return 'Route displayed on map successfully';
        } catch (err) {
          console.error('[ElevenLabs] Failed to display route:', err);
          return 'Failed to display route on map';
        }
      },

      /**
       * Start turn-by-turn navigation
       * First shows the route summary, then user can tap to start driving
       */
      start_navigation: (parameters: unknown): string => {
        const params = parameters as {
          route_id?: string;
          destination_name?: string;
        };
        console.log('[ElevenLabs] start_navigation called:', params);

        try {
          // Confirm the pending route (this marks it as ready)
          dispatch(confirmRoute());

          // Navigate to the route tab to show the summary screen first
          // The route tab will show the confirmed route with a "Start Driving" button
          router.push('/(tabs)/route');

          console.log('[ElevenLabs] Route confirmed, showing summary for:', params.route_id);
          return 'Route confirmed. Showing route summary - tap Start Driving when ready.';
        } catch (err) {
          console.error('[ElevenLabs] Failed to confirm route:', err);
          return 'Failed to confirm route';
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

          // Navigate back to main conversation screen
          router.replace('/(tabs)');

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

    // With Redux persist + PersistGate, anchors should already be hydrated
    // This check is a safeguard in case hydration hasn't completed yet
    if (!anchorsHydratedRef.current) {
      console.log('[ElevenLabs] Redux not yet hydrated, waiting briefly...');
      await new Promise(resolve => setTimeout(resolve, 100));
      console.log('[ElevenLabs] After wait - hydrated:', anchorsHydratedRef.current);
    }

    // Generate new session ID
    const newSessionId = generateSessionId();
    sessionIdRef.current = newSessionId;
    setSessionId(newSessionId);

    try {
      console.log('[ElevenLabs] Starting session:', newSessionId);

      // Build dynamic variables for ElevenLabs LLM Server Tools mode
      // These are injected into the agent's system prompt and tool calls
      // IMPORTANT: Use refs to get latest values, avoiding stale closure issues
      const location = currentLocationRef.current;
      const anchors = anchorCoordinatesRef.current;

      const dynamicVariables: Record<string, string> = {
        session_id: newSessionId,
      };

      // Add current location if available
      if (location) {
        dynamicVariables.user_location_lat = location.lat.toString();
        dynamicVariables.user_location_lng = location.lng.toString();
      }

      // Add home anchor if saved
      if (anchors.home) {
        dynamicVariables.home_lat = anchors.home.lat.toString();
        dynamicVariables.home_lng = anchors.home.lng.toString();
      }

      // Add work anchor if saved
      if (anchors.work) {
        dynamicVariables.work_lat = anchors.work.lat.toString();
        dynamicVariables.work_lng = anchors.work.lng.toString();
      }

      console.log('[ElevenLabs] ========== SESSION START CONTEXT ==========');
      console.log('[ElevenLabs] Location:', location ? `(${location.lat}, ${location.lng})` : 'NOT AVAILABLE');
      console.log('[ElevenLabs] Home anchor:', anchors.home ? `(${anchors.home.lat}, ${anchors.home.lng})` : 'NOT SET');
      console.log('[ElevenLabs] Work anchor:', anchors.work ? `(${anchors.work.lat}, ${anchors.work.lng})` : 'NOT SET');
      console.log('[ElevenLabs] Dynamic variables being sent:', JSON.stringify(dynamicVariables, null, 2));
      console.log('[ElevenLabs] ==========================================');

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
  }, [conversation, dispatch]);

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
