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
export type AudioEncoding = 'LINEAR16' | 'WEBM_OPUS' | 'OGG_OPUS';

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
 * Voice client event callbacks
 */
export interface VoiceClientCallbacks {
  onConnected?: () => void;
  onDisconnected?: (reason: string) => void;
  onSessionStarted?: (sessionId: string, config: VoiceSessionConfig) => void;
  onSpeechStart?: (timestamp: number) => void;
  onInterimTranscript?: (event: TranscriptEvent) => void;
  onFinalTranscript?: (event: TranscriptEvent) => void;
  onNluResult?: (event: NluResultEvent) => void;
  onTtsAudio?: (event: TtsAudioEvent) => void;
  onStateChange?: (event: StateChangeEvent) => void;
  onError?: (event: VoiceErrorEvent) => void;
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
} as const;

/**
 * Server events (server → client)
 */
const ServerEvents = {
  SESSION_STARTED: 'voice:session_started',
  SPEECH_START: 'voice:speech_start',
  INTERIM_TRANSCRIPT: 'voice:interim_transcript',
  FINAL_TRANSCRIPT: 'voice:final_transcript',
  NLU_RESULT: 'voice:nlu_result',
  TTS_AUDIO: 'voice:tts_audio',
  STATE_CHANGE: 'voice:state_change',
  ERROR: 'voice:error',
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
 * VoiceClient class
 */
export class VoiceClient {
  private socket: Socket | null = null;
  private sessionId: string | null = null;
  private callbacks: VoiceClientCallbacks;
  private sequenceNumber = 0;
  private config: VoiceSessionConfig = DEFAULT_CONFIG;

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
  startSession(config?: Partial<VoiceSessionConfig>): void {
    if (!this.socket?.connected) {
      throw new Error('Not connected to voice gateway');
    }

    this.config = { ...DEFAULT_CONFIG, ...config };
    this.sequenceNumber = 0;

    this.socket.emit(ClientEvents.START_SESSION, {
      audioEncoding: this.config.audioEncoding,
      sampleRateHertz: this.config.sampleRateHertz,
      languageCode: this.config.languageCode,
    });
  }

  /**
   * Send audio chunk to server
   */
  sendAudio(audioData: string): void {
    if (!this.socket?.connected || !this.sessionId) {
      return;
    }

    this.socket.emit(ClientEvents.AUDIO_CHUNK, {
      sessionId: this.sessionId,
      audioData,
      sequenceNumber: this.sequenceNumber++,
      timestamp: Date.now(),
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

    // Interim transcript
    this.socket.on(ServerEvents.INTERIM_TRANSCRIPT, (data: TranscriptEvent) => {
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
