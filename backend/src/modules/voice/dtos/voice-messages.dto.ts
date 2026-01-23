/**
 * Voice Module DTOs - WebSocket message types for voice streaming
 *
 * Per FINAL_REQUIREMENTS.md - Voice Streaming Protocol:
 * - Client sends audio chunks via WebSocket
 * - Server responds with transcripts and TTS audio
 * - VAD (Voice Activity Detection) handled server-side
 */

import { IsString, IsNumber, IsOptional, IsBoolean, IsEnum, IsArray } from 'class-validator';

/**
 * Voice session states
 */
export enum VoiceSessionState {
  IDLE = 'idle',
  LISTENING = 'listening',
  PROCESSING = 'processing',
  SPEAKING = 'speaking',
  ERROR = 'error',
}

/**
 * Audio encoding formats supported
 */
export enum AudioEncoding {
  LINEAR16 = 'LINEAR16',       // 16-bit PCM
  WEBM_OPUS = 'WEBM_OPUS',     // WebM with Opus codec
  OGG_OPUS = 'OGG_OPUS',       // Ogg with Opus codec
}

/**
 * Client → Server: Start voice session
 */
export class StartSessionDto {
  @IsOptional()
  @IsString()
  sessionId?: string;

  @IsOptional()
  @IsEnum(AudioEncoding)
  audioEncoding?: AudioEncoding;

  @IsOptional()
  @IsNumber()
  sampleRateHertz?: number;

  @IsOptional()
  @IsString()
  languageCode?: string;
}

/**
 * Client → Server: Audio data chunk
 */
export class AudioChunkDto {
  @IsString()
  sessionId: string;

  @IsString()
  audioData: string; // Base64 encoded audio

  @IsNumber()
  sequenceNumber: number;

  @IsOptional()
  @IsNumber()
  timestamp?: number;
}

/**
 * Client → Server: End of speech signal
 */
export class EndSpeechDto {
  @IsString()
  sessionId: string;

  @IsOptional()
  @IsBoolean()
  forceProcess?: boolean;
}

/**
 * Client → Server: Stop session
 */
export class StopSessionDto {
  @IsString()
  sessionId: string;
}

/**
 * Server → Client: Session started acknowledgment
 */
export interface SessionStartedEvent {
  sessionId: string;
  state: VoiceSessionState;
  config: {
    audioEncoding: AudioEncoding;
    sampleRateHertz: number;
    languageCode: string;
  };
}

/**
 * Server → Client: VAD detected speech start
 */
export interface SpeechStartEvent {
  sessionId: string;
  timestamp: number;
}

/**
 * Server → Client: VAD detected speech end (silence)
 * Frontend should stop recording when this is received
 */
export interface SpeechEndEvent {
  sessionId: string;
  timestamp: number;
}

/**
 * Server → Client: Interim transcript (while speaking)
 */
export interface InterimTranscriptEvent {
  sessionId: string;
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

/**
 * Server → Client: Final transcript after speech ends
 */
export interface FinalTranscriptEvent {
  sessionId: string;
  transcript: string;
  confidence: number;
  alternatives?: Array<{
    transcript: string;
    confidence: number;
  }>;
}

/**
 * Server → Client: NLU processing result
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
 * Server → Client: TTS audio response
 */
export interface TtsAudioEvent {
  sessionId: string;
  audioData: string; // Base64 encoded audio
  encoding: AudioEncoding;
  sampleRateHertz: number;
  text: string;
  isComplete: boolean;
}

/**
 * Server → Client: State change notification
 */
export interface StateChangeEvent {
  sessionId: string;
  previousState: VoiceSessionState;
  newState: VoiceSessionState;
  timestamp: number;
}

/**
 * Server → Client: Error event
 */
export interface VoiceErrorEvent {
  sessionId: string;
  code: string;
  message: string;
  recoverable: boolean;
}

/**
 * WebSocket event names (client → server)
 */
export const ClientEvents = {
  START_SESSION: 'voice:start',
  AUDIO_CHUNK: 'voice:audio',
  END_SPEECH: 'voice:end_speech',
  STOP_SESSION: 'voice:stop',
  CANCEL_TTS: 'voice:cancel_tts',
} as const;

/**
 * WebSocket event names (server → client)
 */
export const ServerEvents = {
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
} as const;

/**
 * Server → Client: Route planned from voice navigation intent
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
 * Voice configuration defaults
 */
export const VoiceDefaults = {
  AUDIO_ENCODING: AudioEncoding.LINEAR16,
  SAMPLE_RATE_HERTZ: 16000,
  LANGUAGE_CODE: 'en-US',
  VAD_SILENCE_THRESHOLD_MS: 700, // Per FINAL_REQUIREMENTS.md - 700ms silence threshold
  MAX_SESSION_DURATION_MS: 300000, // 5 minutes
} as const;
