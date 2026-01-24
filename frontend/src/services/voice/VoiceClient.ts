/**
 * VoiceClient - WebSocket client for voice streaming
 *
 * Connects to backend voice gateway (/voice namespace) for:
 * - Streaming audio to server
 * - Receiving transcripts (interim/final)
 * - Receiving NLU results
 * - Receiving TTS audio
 * - State synchronization
 */

import { io, Socket } from 'socket.io-client';

/**
 * Voice session states (matches backend)
 */
export type VoiceSessionState = 'idle' | 'listening' | 'processing' | 'speaking' | 'error';

/**
 * Audio encoding formats
 */
export type AudioEncoding = 'LINEAR16' | 'WEBM_OPUS' | 'OGG_OPUS' | 'MP3';

/**
 * Session configuration
 */
export interface VoiceSessionConfig {
  audioEncoding: AudioEncoding;
  sampleRateHertz: number;
  languageCode: string;
}

/**
 * Transcript event data
 */
export interface TranscriptEvent {
  sessionId: string;
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: Array<{ transcript: string; confidence: number }>;
}

/**
 * NLU result event data
 */
export interface NluResultEvent {
  sessionId: string;
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
  requiresConfirmation: boolean;
  suggestedResponse?: string;
}

/**
 * TTS audio event data
 */
export interface TtsAudioEvent {
  sessionId: string;
  audioData: string; // Base64 encoded
  encoding: AudioEncoding;
  sampleRateHertz: number;
  text: string;
  isComplete: boolean;
}

/**
 * State change event data
 */
export interface StateChangeEvent {
  sessionId: string;
  previousState: VoiceSessionState;
  newState: VoiceSessionState;
  timestamp: number;
}

/**
 * Error event data
 */
export interface VoiceErrorEvent {
  sessionId: string;
  code: string;
  message: string;
  recoverable: boolean;
}

/**
 * Route planned event data (from voice navigation)
 */
export interface RoutePlannedEvent {
  sessionId: string;
  route: {
    id: string;
    origin: { name: string; location: { lat: number; lng: number } };
    destination: { name: string; location: { lat: number; lng: number } };
    stops: Array<{
      id: string;
      name: string;
      location: { lat: number; lng: number };
      detourCost: number;
      order: number;
    }>;
    totalDistance: number;
    totalTime: number;
    polyline: string;
  };
  summary: string;
  warnings?: Array<{ stopName: string; message: string; detourMinutes: number }>;
}

/**
 * Clarification needed event data (from agentic system)
 */
export interface ClarificationNeededEvent {
  sessionId: string;
  question: string;
  options?: string[];
  context?: {
    ambiguousEntity?: string;
    relatedIntent?: string;
  };
  timestamp: number;
}

/**
 * Tool executing event data (for agent transparency)
 */
export interface ToolExecutingEvent {
  sessionId: string;
  tool: string;
  description: string;
  timestamp: number;
}

/**
 * Voice client event callbacks
 */
export interface VoiceClientCallbacks {
  onConnected?: () => void;
  onDisconnected?: (reason: string) => void;
  onSessionStarted?: (sessionId: string, config: VoiceSessionConfig) => void;
  onSpeechStart?: (timestamp: number) => void;
  onSpeechEnd?: (timestamp: number) => void;
  onInterimTranscript?: (event: TranscriptEvent) => void;
  onFinalTranscript?: (event: TranscriptEvent) => void;
  onNluResult?: (event: NluResultEvent) => void;
  onRoutePlanned?: (event: RoutePlannedEvent) => void;
  onTtsAudio?: (event: TtsAudioEvent) => void;
  onStateChange?: (event: StateChangeEvent) => void;
  onError?: (event: VoiceErrorEvent) => void;
  onProcessingInterrupted?: (timestamp: number) => void; // Barge-in acknowledged by server
  onClarificationNeeded?: (event: ClarificationNeededEvent) => void; // Agent needs user input
  onToolExecuting?: (event: ToolExecutingEvent) => void; // Agent executing a tool
}

/**
 * Client events (client → server)
 */
const ClientEvents = {
  START_SESSION: 'voice:start',
  AUDIO_CHUNK: 'voice:audio',
  END_SPEECH: 'voice:end_speech',
  STOP_SESSION: 'voice:stop',
  CANCEL_TTS: 'voice:cancel_tts',
  INTERRUPT: 'voice:interrupt', // Barge-in: user started speaking during processing
} as const;

/**
 * Server events (server → client)
 */
const ServerEvents = {
  SESSION_STARTED: 'voice:session_started',
  SPEECH_START: 'voice:speech_start',
  SPEECH_END: 'voice:speech_end',
  INTERIM_TRANSCRIPT: 'voice:interim_transcript',
  FINAL_TRANSCRIPT: 'voice:final_transcript',
  NLU_RESULT: 'voice:nlu_result',
  ROUTE_PLANNED: 'voice:route_planned',
  TTS_AUDIO: 'voice:tts_audio',
  STATE_CHANGE: 'voice:state_change',
  ERROR: 'voice:error',
  PROCESSING_INTERRUPTED: 'voice:processing_interrupted', // Barge-in acknowledged
  CLARIFICATION_NEEDED: 'voice:clarification_needed', // Agent needs user input
  TOOL_EXECUTING: 'voice:tool_executing', // Agent executing a tool
} as const;

/**
 * Default configuration
 */
const DEFAULT_CONFIG = {
  audioEncoding: 'LINEAR16' as AudioEncoding,
  sampleRateHertz: 16000,
  languageCode: 'en-US',
};

/**
 * Buffered audio chunk (for sending before session is ready)
 */
interface BufferedAudioChunk {
  audioData: string;
  sequenceNumber: number;
  timestamp: number;
}

/**
 * VoiceClient class
 */
export class VoiceClient {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private callbacks: VoiceClientCallbacks;
  private sequenceNumber = 0;
  private config: VoiceSessionConfig = DEFAULT_CONFIG;
  private audioBuffer: BufferedAudioChunk[] = [];
  private isBufferingEnabled = false;
  private readonly MAX_BUFFER_SIZE = 50; // ~5 seconds at 100ms chunks

  constructor(callbacks: VoiceClientCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Connect to the voice gateway
   */
  async connect(serverUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Connect to /voice namespace
        this.socket = io(`${serverUrl}/voice`, {
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          timeout: 10000,
        });

        this.socket.on('connect', () => {
          this.callbacks.onConnected?.();
          resolve();
        });

        this.socket.on('disconnect', (reason) => {
          this.sessionId = null;
          this.callbacks.onDisconnected?.(reason);
        });

        this.socket.on('connect_error', (error) => {
          reject(new Error(`Connection failed: ${error.message}`));
        });

        // Set up event listeners
        this.setupEventListeners();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Disconnect from the voice gateway
   */
  disconnect(): void {
    if (this.sessionId) {
      this.stopSession();
    }
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    this.sessionId = null;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * Start a voice session
   */
  startSession(
    config?: Partial<VoiceSessionConfig>,
    userLocation?: { lat: number; lng: number },
  ): void {
    if (!this.socket?.connected) {
      throw new Error('Not connected to voice gateway');
    }

    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sequenceNumber = 0;

    this.socket.emit(ClientEvents.START_SESSION, {
      audioEncoding: this.config.audioEncoding,
      sampleRateHertz: this.config.sampleRateHertz,
      languageCode: this.config.languageCode,
      userLocation,
    });
  }

  /**
   * Start a voice session and wait for confirmation
   * Returns a Promise that resolves with sessionId when session is ready
   * This ensures the backend STT stream is initialized before audio is sent
   */
  startSessionAsync(
    config?: Partial<VoiceSessionConfig>,
    timeout = 10000,
    userLocation?: { lat: number; lng: number },
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!this.socket?.connected) {
        reject(new Error('Not connected to voice gateway'));
        return;
      }

      // Set up timeout
      const timeoutId = setTimeout(() => {
        this.socket?.off(ServerEvents.SESSION_STARTED, onSessionStarted);
        this.socket?.off(ServerEvents.ERROR, onError);
        reject(new Error('Session start timeout'));
      }, timeout);

      // One-time listener for session started
      const onSessionStarted = (data: {
        sessionId: string;
        state: VoiceSessionState;
        config: VoiceSessionConfig;
      }) => {
        clearTimeout(timeoutId);
        this.socket?.off(ServerEvents.ERROR, onError);
        this.sessionId = data.sessionId;
        this.callbacks.onSessionStarted?.(data.sessionId, data.config);
        resolve(data.sessionId);
      };

      // One-time listener for errors
      const onError = (data: VoiceErrorEvent) => {
        clearTimeout(timeoutId);
        this.socket?.off(ServerEvents.SESSION_STARTED, onSessionStarted);
        reject(new Error(data.message));
      };

      // Register one-time listeners
      this.socket.once(ServerEvents.SESSION_STARTED, onSessionStarted);
      this.socket.once(ServerEvents.ERROR, onError);

      // Send start session request
      this.config = { ...DEFAULT_CONFIG, ...config };
      this.sequenceNumber = 0;

      this.socket.emit(ClientEvents.START_SESSION, {
        audioEncoding: this.config.audioEncoding,
        sampleRateHertz: this.config.sampleRateHertz,
        languageCode: this.config.languageCode,
        userLocation,
      });
    });
  }

  /**
   * Check if session is ready for audio streaming
   */
  isSessionReady(): boolean {
    return this.socket?.connected === true && this.sessionId !== null;
  }

  /**
   * Enable audio buffering (call before starting recording, before session is ready)
   */
  enableBuffering(): void {
    this.isBufferingEnabled = true;
    this.audioBuffer = [];
    this.sequenceNumber = 0;
    console.log('[VoiceClient] Audio buffering enabled');
  }

  /**
   * Flush buffered audio to server (call after session is confirmed)
   */
  flushBuffer(): void {
    if (!this.socket?.connected || !this.sessionId) {
      console.warn('[VoiceClient] Cannot flush buffer: not ready');
      return;
    }

    const bufferSize = this.audioBuffer.length;
    if (bufferSize > 0) {
      console.log(`[VoiceClient] Flushing ${bufferSize} buffered audio chunks`);

      for (const chunk of this.audioBuffer) {
        this.socket.emit(ClientEvents.AUDIO_CHUNK, {
          sessionId: this.sessionId,
          audioData: chunk.audioData,
          sequenceNumber: chunk.sequenceNumber,
          timestamp: chunk.timestamp,
        });
      }

      this.audioBuffer = [];
    }

    this.isBufferingEnabled = false;
  }

  /**
   * Send audio chunk to server (or buffer if session not ready)
   */
  sendAudio(audioData: string): void {
    const seq = this.sequenceNumber++;
    const timestamp = Date.now();

    // If socket not connected, can't do anything
    if (!this.socket?.connected) {
      console.warn('[VoiceClient] Cannot send/buffer audio: socket not connected');
      return;
    }

    // If session not ready but buffering enabled, buffer the chunk
    if (!this.sessionId && this.isBufferingEnabled) {
      if (this.audioBuffer.length < this.MAX_BUFFER_SIZE) {
        this.audioBuffer.push({ audioData, sequenceNumber: seq, timestamp });
        if (seq < 5) {
          console.log(`[VoiceClient] Buffering audio chunk #${seq}, bufferSize=${this.audioBuffer.length}`);
        }
      } else {
        // Buffer full, drop oldest chunk (sliding window)
        this.audioBuffer.shift();
        this.audioBuffer.push({ audioData, sequenceNumber: seq, timestamp });
      }
      return;
    }

    // If session not ready and buffering not enabled, drop
    if (!this.sessionId) {
      console.warn('[VoiceClient] Cannot send audio: sessionId is null');
      return;
    }

    // Log first few chunks to verify data is flowing
    if (seq < 5) {
      console.log(`[VoiceClient] Sending audio chunk #${seq}: sessionId=${this.sessionId}, dataLength=${audioData.length}`);
    }

    this.socket.emit(ClientEvents.AUDIO_CHUNK, {
      sessionId: this.sessionId,
      audioData,
      sequenceNumber: seq,
      timestamp,
    });
  }

  /**
   * Signal end of speech (user stopped talking)
   */
  endSpeech(forceProcess = false): void {
    if (!this.socket?.connected || !this.sessionId) {
      return;
    }

    this.socket.emit(ClientEvents.END_SPEECH, {
      sessionId: this.sessionId,
      forceProcess,
    });
  }

  /**
   * Stop the current session
   */
  stopSession(): void {
    if (!this.socket?.connected || !this.sessionId) {
      return;
    }

    this.socket.emit(ClientEvents.STOP_SESSION, {
      sessionId: this.sessionId,
    });

    this.sessionId = null;
    this.sequenceNumber = 0;
  }

  /**
   * Cancel TTS playback
   */
  cancelTts(): void {
    if (!this.socket?.connected || !this.sessionId) {
      return;
    }

    this.socket.emit(ClientEvents.CANCEL_TTS, {
      sessionId: this.sessionId,
    });
  }

  /**
   * Interrupt processing (barge-in)
   * Called when user starts speaking during PROCESSING state
   */
  interruptProcessing(): void {
    if (!this.socket?.connected || !this.sessionId) {
      return;
    }

    console.log('[VoiceClient] Sending interrupt (barge-in)');
    this.socket.emit(ClientEvents.INTERRUPT, {
      sessionId: this.sessionId,
      timestamp: Date.now(),
    });
  }

  /**
   * Update callbacks
   */
  setCallbacks(callbacks: Partial<VoiceClientCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Set up event listeners for server events
   */
  private setupEventListeners(): void {
    if (!this.socket) return;

    // Session started
    this.socket.on(ServerEvents.SESSION_STARTED, (data: {
      sessionId: string;
      state: VoiceSessionState;
      config: VoiceSessionConfig;
    }) => {
      this.sessionId = data.sessionId;
      this.callbacks.onSessionStarted?.(data.sessionId, data.config);
    });

    // Speech start detected
    this.socket.on(ServerEvents.SPEECH_START, (data: {
      sessionId: string;
      timestamp: number;
    }) => {
      this.callbacks.onSpeechStart?.(data.timestamp);
    });

    // Speech end detected (VAD detected silence)
    this.socket.on(ServerEvents.SPEECH_END, (data: {
      sessionId: string;
      timestamp: number;
    }) => {
      console.log('[VoiceClient] Speech end detected by VAD');
      this.callbacks.onSpeechEnd?.(data.timestamp);
    });

    // Interim transcript
    this.socket.on(ServerEvents.INTERIM_TRANSCRIPT, (data: TranscriptEvent) => {
      console.log(`[VoiceClient] Interim transcript event: "${data.transcript}"`);
      this.callbacks.onInterimTranscript?.(data);
    });

    // Final transcript
    this.socket.on(ServerEvents.FINAL_TRANSCRIPT, (data: TranscriptEvent) => {
      this.callbacks.onFinalTranscript?.(data);
    });

    // NLU result
    this.socket.on(ServerEvents.NLU_RESULT, (data: NluResultEvent) => {
      this.callbacks.onNluResult?.(data);
    });

    // Route planned (voice navigation)
    this.socket.on(ServerEvents.ROUTE_PLANNED, (data: RoutePlannedEvent) => {
      console.log('[VoiceClient] Route planned event received');
      this.callbacks.onRoutePlanned?.(data);
    });

    // TTS audio
    this.socket.on(ServerEvents.TTS_AUDIO, (data: TtsAudioEvent) => {
      this.callbacks.onTtsAudio?.(data);
    });

    // State change
    this.socket.on(ServerEvents.STATE_CHANGE, (data: StateChangeEvent) => {
      this.callbacks.onStateChange?.(data);
    });

    // Error
    this.socket.on(ServerEvents.ERROR, (data: VoiceErrorEvent) => {
      this.callbacks.onError?.(data);
    });

    // Processing interrupted (barge-in acknowledged)
    this.socket.on(ServerEvents.PROCESSING_INTERRUPTED, (data: {
      sessionId: string;
      timestamp: number;
    }) => {
      console.log('[VoiceClient] Processing interrupted (barge-in acknowledged)');
      this.callbacks.onProcessingInterrupted?.(data.timestamp);
    });

    // Clarification needed (agent asking follow-up question)
    this.socket.on(ServerEvents.CLARIFICATION_NEEDED, (data: ClarificationNeededEvent) => {
      console.log(`[VoiceClient] Clarification needed: "${data.question}"`);
      this.callbacks.onClarificationNeeded?.(data);
    });

    // Tool executing (for agent transparency)
    this.socket.on(ServerEvents.TOOL_EXECUTING, (data: ToolExecutingEvent) => {
      console.log(`[VoiceClient] Tool executing: ${data.tool} - ${data.description}`);
      this.callbacks.onToolExecuting?.(data);
    });
  }
}

/**
 * Singleton instance for app-wide usage
 */
let voiceClientInstance: VoiceClient | null = null;

export function getVoiceClient(): VoiceClient {
  if (!voiceClientInstance) {
    voiceClientInstance = new VoiceClient();
  }
  return voiceClientInstance;
}

export function resetVoiceClient(): void {
  if (voiceClientInstance) {
    voiceClientInstance.disconnect();
    voiceClientInstance = null;
  }
}
