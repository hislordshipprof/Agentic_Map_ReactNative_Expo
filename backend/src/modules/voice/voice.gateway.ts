/**
 * Voice WebSocket Gateway - Real-time voice streaming
 *
 * Per FINAL_REQUIREMENTS.md - Voice Streaming Protocol:
 * - WebSocket connection for bidirectional audio streaming
 * - Client sends audio chunks, server responds with transcripts/TTS
 * - Session-based state management
 */

import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import {
  StartSessionDto,
  AudioChunkDto,
  EndSpeechDto,
  StopSessionDto,
  VoiceSessionState,
  ClientEvents,
  ServerEvents,
  VoiceDefaults,
  AudioEncoding,
  type SessionStartedEvent,
  type StateChangeEvent,
  type VoiceErrorEvent,
} from './dtos';

/**
 * Active voice session data
 */
interface VoiceSession {
  id: string;
  socketId: string;
  state: VoiceSessionState;
  config: {
    audioEncoding: AudioEncoding;
    sampleRateHertz: number;
    languageCode: string;
  };
  createdAt: number;
  lastActivityAt: number;
  audioBuffer: string[]; // Accumulated audio chunks
}

@WebSocketGateway({
  namespace: '/voice',
  cors: {
    origin: '*', // Configure appropriately for production
    credentials: true,
  },
})
export class VoiceGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(VoiceGateway.name);
  private sessions: Map<string, VoiceSession> = new Map();
  private socketToSession: Map<string, string> = new Map();
  private audioPipeline: import('./services/audio-pipeline.service').AudioPipelineService | null = null;

  /**
   * Set the audio pipeline service (called after module init)
   */
  setAudioPipeline(pipeline: import('./services/audio-pipeline.service').AudioPipelineService): void {
    this.audioPipeline = pipeline;
    // Register this gateway as the event emitter
    this.audioPipeline.setEventEmitter({
      emit: (sessionId: string, event: string, data: unknown) => {
        this.sendToSession(sessionId, event, data);
      },
    });
  }

  afterInit() {
    this.logger.log('Voice WebSocket Gateway initialized');

    // Cleanup stale sessions every minute
    setInterval(() => this.cleanupStaleSessions(), 60000);
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const sessionId = this.socketToSession.get(client.id);
    if (sessionId) {
      this.cleanupSession(sessionId);
    }
  }

  /**
   * Start a new voice session
   */
  @SubscribeMessage(ClientEvents.START_SESSION)
  handleStartSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: StartSessionDto & { userLocation?: { lat: number; lng: number } },
  ): void {
    // Check if client already has a session
    const existingSessionId = this.socketToSession.get(client.id);
    if (existingSessionId) {
      this.cleanupSession(existingSessionId);
    }

    const sessionId = dto.sessionId || uuidv4();
    const config = {
      audioEncoding: dto.audioEncoding || VoiceDefaults.AUDIO_ENCODING,
      sampleRateHertz: dto.sampleRateHertz || VoiceDefaults.SAMPLE_RATE_HERTZ,
      languageCode: dto.languageCode || VoiceDefaults.LANGUAGE_CODE,
    };

    const session: VoiceSession = {
      id: sessionId,
      socketId: client.id,
      state: VoiceSessionState.IDLE,
      config,
      createdAt: Date.now(),
      lastActivityAt: Date.now(),
      audioBuffer: [],
    };

    this.sessions.set(sessionId, session);
    this.socketToSession.set(client.id, sessionId);

    // Initialize audio pipeline for this session
    if (this.audioPipeline) {
      this.audioPipeline.initSession(sessionId, {
        languageCode: config.languageCode,
        sampleRateHertz: config.sampleRateHertz,
        audioEncoding: config.audioEncoding,
      });

      // Pass user location to pipeline for route planning
      if (dto.userLocation) {
        this.audioPipeline.setUserLocation(sessionId, dto.userLocation);
        this.logger.log(`User location set for session: ${sessionId}`);
      }
    }

    const response: SessionStartedEvent = {
      sessionId,
      state: VoiceSessionState.IDLE,
      config,
    };

    client.emit(ServerEvents.SESSION_STARTED, response);
    this.logger.log(`Session started: ${sessionId}`);
  }

  /**
   * Receive audio chunk from client
   */
  @SubscribeMessage(ClientEvents.AUDIO_CHUNK)
  async handleAudioChunk(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: AudioChunkDto,
  ): Promise<void> {
    // Log at INFO level for first few chunks to verify receipt
    if (!dto.sequenceNumber || dto.sequenceNumber < 3) {
      this.logger.log(`Audio chunk received: sessionId=${dto.sessionId}, seq=${dto.sequenceNumber}, size=${dto.audioData?.length || 0}`);
    }

    const session = this.sessions.get(dto.sessionId);
    if (!session) {
      this.logger.warn(`Audio chunk for unknown session: ${dto.sessionId}`);
      this.emitError(client, dto.sessionId || 'unknown', 'SESSION_NOT_FOUND', 'Voice session not found', false);
      return;
    }

    session.lastActivityAt = Date.now();
    session.audioBuffer.push(dto.audioData);

    // Transition to LISTENING if not already
    if (session.state === VoiceSessionState.IDLE) {
      this.transitionState(session, VoiceSessionState.LISTENING, client);

      // Emit speech start event
      client.emit(ServerEvents.SPEECH_START, {
        sessionId: session.id,
        timestamp: Date.now(),
      });
    }

    // Process audio through pipeline (handles VAD, STT streaming)
    if (this.audioPipeline) {
      await this.audioPipeline.processAudioChunk(dto.sessionId, dto.audioData);
    }

    this.logger.debug(`Audio chunk processed: session=${session.id}, seq=${dto.sequenceNumber}, bufferSize=${session.audioBuffer.length}`);
  }

  /**
   * Client signals end of speech
   */
  @SubscribeMessage(ClientEvents.END_SPEECH)
  async handleEndSpeech(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: EndSpeechDto,
  ): Promise<void> {
    const session = this.sessions.get(dto.sessionId);
    if (!session) {
      this.emitError(client, dto.sessionId, 'SESSION_NOT_FOUND', 'Voice session not found', false);
      return;
    }

    session.lastActivityAt = Date.now();
    this.transitionState(session, VoiceSessionState.PROCESSING, client);

    this.logger.log(`Processing speech: session=${session.id}, chunks=${session.audioBuffer.length}`);

    // Clear local audio buffer (pipeline has its own)
    session.audioBuffer = [];

    // Process through pipeline (STT → NLU → TTS)
    if (this.audioPipeline) {
      await this.audioPipeline.processEndOfSpeech(dto.sessionId);
      // State transitions are handled by the pipeline via events
    } else {
      // Fallback when pipeline not available
      client.emit(ServerEvents.FINAL_TRANSCRIPT, {
        sessionId: session.id,
        transcript: '[Audio pipeline not initialized]',
        confidence: 0,
        alternatives: [],
      });
      this.transitionState(session, VoiceSessionState.IDLE, client);
    }
  }

  /**
   * Stop voice session
   */
  @SubscribeMessage(ClientEvents.STOP_SESSION)
  handleStopSession(
    @ConnectedSocket() client: Socket,
    @MessageBody() dto: StopSessionDto,
  ): void {
    const session = this.sessions.get(dto.sessionId);
    if (session) {
      this.cleanupSession(dto.sessionId);
      this.logger.log(`Session stopped: ${dto.sessionId}`);
    }
  }

  /**
   * Cancel ongoing TTS playback
   */
  @SubscribeMessage(ClientEvents.CANCEL_TTS)
  handleCancelTts(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { sessionId: string },
  ): void {
    const session = this.sessions.get(data.sessionId);
    if (session && session.state === VoiceSessionState.SPEAKING) {
      this.transitionState(session, VoiceSessionState.IDLE, client);
      this.logger.log(`TTS cancelled: session=${data.sessionId}`);
    }
  }

  /**
   * Transition session state and notify client
   */
  private transitionState(
    session: VoiceSession,
    newState: VoiceSessionState,
    client: Socket,
  ): void {
    const previousState = session.state;
    session.state = newState;

    const event: StateChangeEvent = {
      sessionId: session.id,
      previousState,
      newState,
      timestamp: Date.now(),
    };

    client.emit(ServerEvents.STATE_CHANGE, event);
  }

  /**
   * Emit error to client
   */
  private emitError(
    client: Socket,
    sessionId: string,
    code: string,
    message: string,
    recoverable: boolean,
  ): void {
    const event: VoiceErrorEvent = {
      sessionId,
      code,
      message,
      recoverable,
    };
    client.emit(ServerEvents.ERROR, event);
  }

  /**
   * Cleanup a session
   */
  private cleanupSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Cleanup pipeline resources
      if (this.audioPipeline) {
        this.audioPipeline.cleanupSession(sessionId);
      }
      this.socketToSession.delete(session.socketId);
      this.sessions.delete(sessionId);
    }
  }

  /**
   * Cleanup sessions that have been inactive for too long
   */
  private cleanupStaleSessions(): void {
    const now = Date.now();
    const maxAge = VoiceDefaults.MAX_SESSION_DURATION_MS;

    for (const [sessionId, session] of this.sessions) {
      if (now - session.lastActivityAt > maxAge) {
        this.logger.log(`Cleaning up stale session: ${sessionId}`);
        this.cleanupSession(sessionId);
      }
    }
  }

  /**
   * Get session by ID (for use by other services)
   */
  getSession(sessionId: string): VoiceSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Send event to a specific session's client
   */
  sendToSession(sessionId: string, event: string, data: unknown): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(`sendToSession failed: session not found: ${sessionId}`);
      return false;
    }

    // In NestJS WebSocket Gateway with namespace, this.server IS the namespace
    // Access sockets map directly (cast needed due to type mismatch in Socket.IO types)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const socketsMap = (this.server as any)?.sockets as Map<string, Socket> | undefined;
    const socket = socketsMap?.get(session.socketId);
    if (!socket) {
      this.logger.warn(`sendToSession failed: socket not found for session: ${sessionId}, socketId: ${session.socketId}`);
      return false;
    }

    // Log interim transcript events for debugging
    if (event === ServerEvents.INTERIM_TRANSCRIPT || event === ServerEvents.SPEECH_END) {
      this.logger.debug(`sendToSession: event=${event}, sessionId=${sessionId}`);
    }

    socket.emit(event, data);
    return true;
  }
}
