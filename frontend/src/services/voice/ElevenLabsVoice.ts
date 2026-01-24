/**
 * ElevenLabs Voice Service
 *
 * Provides types and utilities for ElevenLabs voice integration.
 * The main hook (useElevenLabsVoice) wraps the @elevenlabs/react-native SDK.
 */

/**
 * Configuration for ElevenLabs voice session
 */
export interface ElevenLabsConfig {
  /** ElevenLabs agent ID from dashboard */
  agentId: string;
  /** Session ID for context tracking */
  sessionId: string;
  /** User's current location for navigation */
  userLocation?: { lat: number; lng: number };
  /** User's saved anchors (home, work, etc.) */
  userAnchors?: Array<{
    name: string;
    location: { lat: number; lng: number };
  }>;
}

/**
 * Voice mode states
 */
export type ElevenLabsVoiceStatus =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'listening'
  | 'speaking'
  | 'error';

/**
 * Message from ElevenLabs conversation
 */
export interface ElevenLabsMessage {
  role: 'user' | 'agent';
  content: string;
  timestamp: number;
}

/**
 * Route data received from agent
 */
export interface ElevenLabsRouteData {
  id: string;
  origin: { name: string; location: { lat: number; lng: number } };
  destination: { name: string; location: { lat: number; lng: number } };
  stops: Array<{
    id: string;
    name: string;
    location: { lat: number; lng: number };
    order: number;
  }>;
  totalTime: number;
  totalDistance: number;
  polyline: string;
}

/**
 * Client tool call from ElevenLabs agent
 */
export interface ElevenLabsToolCall {
  name: string;
  arguments: string;
}

/**
 * Callbacks for ElevenLabs voice events
 */
export interface ElevenLabsCallbacks {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: ElevenLabsMessage) => void;
  onModeChange?: (mode: 'speaking' | 'listening') => void;
  onError?: (error: Error) => void;
  onRouteReceived?: (route: ElevenLabsRouteData) => void;
  onStatusChange?: (status: ElevenLabsVoiceStatus) => void;
}

/**
 * Result from useElevenLabsVoice hook
 */
export interface UseElevenLabsVoiceResult {
  /** Current voice status */
  status: ElevenLabsVoiceStatus;
  /** Whether agent is currently speaking */
  isSpeaking: boolean;
  /** Whether connected to ElevenLabs */
  isConnected: boolean;
  /** Current session ID */
  sessionId: string | null;
  /** Last transcript from user */
  transcript: string;
  /** Error message if any */
  error: string | null;
  /** Start voice session */
  startSession: () => Promise<void>;
  /** End voice session */
  endSession: () => Promise<void>;
  /** Toggle session (start/stop) */
  toggleSession: () => Promise<void>;
  /** Set microphone muted state */
  setMicMuted: (muted: boolean) => void;
}

/**
 * Generate a unique session ID
 */
export function generateSessionId(): string {
  return `el_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Get ElevenLabs agent ID from environment
 */
export function getAgentId(): string {
  const agentId = process.env.EXPO_PUBLIC_ELEVENLABS_AGENT_ID;
  if (!agentId) {
    console.warn('[ElevenLabs] EXPO_PUBLIC_ELEVENLABS_AGENT_ID not set');
  }
  return agentId || '';
}
