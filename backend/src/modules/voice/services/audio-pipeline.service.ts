/**
 * Audio Pipeline Service - Voice processing orchestration
 *
 * Per FINAL_REQUIREMENTS.md - Voice Streaming:
 * - Orchestrates VAD → STT → NLU → TTS flow
 * - Handles streaming audio processing
 * - Manages session state transitions
 */

import { Injectable, Logger } from '@nestjs/common';
import { VadService, type VadFrameResult } from './vad.service';
import { SttService, type TranscriptResult, type SttConfig } from './stt.service';
import { TtsService, type TtsResult, VoicePresets } from './tts.service';
import { NluService, type NLUResponse } from '../../nlu/nlu.service';
import { ErrandService } from '../../errand/services/errand.service';
import {
  VoiceSessionState,
  AudioEncoding,
  VoiceDefaults,
  ServerEvents,
  type InterimTranscriptEvent,
  type FinalTranscriptEvent,
  type NluResultEvent,
  type TtsAudioEvent,
  type SpeechEndEvent,
  type RoutePlannedEvent,
} from '../dtos';

/**
 * Pipeline configuration
 */
export interface PipelineConfig {
  enableVad: boolean;
  enableInterimTranscripts: boolean;
  autoGenerateTts: boolean;
  languageCode: string;
  sampleRateHertz: number;
  audioEncoding: AudioEncoding;
}

/**
 * Pipeline session state
 */
interface PipelineSession {
  id: string;
  config: PipelineConfig;
  state: VoiceSessionState;
  audioBuffer: Buffer[];
  currentTranscript: string;
  lastInterimTranscript: string; // Fallback if no final transcript received
  processingPromise: Promise<void> | null;
  lastProcessingEndTime: number; // Prevents STT restart immediately after processing
  userLocation?: { lat: number; lng: number }; // User's current location for route planning
}

/**
 * Pipeline event emitter interface
 */
export interface PipelineEventEmitter {
  emit(sessionId: string, event: string, data: unknown): void;
}

const DEFAULT_PIPELINE_CONFIG: PipelineConfig = {
  enableVad: true,
  enableInterimTranscripts: true,
  autoGenerateTts: true,
  languageCode: VoiceDefaults.LANGUAGE_CODE,
  sampleRateHertz: VoiceDefaults.SAMPLE_RATE_HERTZ,
  audioEncoding: VoiceDefaults.AUDIO_ENCODING,
};

@Injectable()
export class AudioPipelineService {
  private readonly logger = new Logger(AudioPipelineService.name);
  private sessions: Map<string, PipelineSession> = new Map();
  private eventEmitter: PipelineEventEmitter | null = null;

  constructor(
    private readonly vad: VadService,
    private readonly stt: SttService,
    private readonly tts: TtsService,
    private readonly nlu: NluService,
    private readonly errand: ErrandService,
  ) {}

  /**
   * Set event emitter for sending events back to gateway
   */
  setEventEmitter(emitter: PipelineEventEmitter): void {
    this.eventEmitter = emitter;
  }

  /**
   * Initialize a pipeline session
   */
  initSession(sessionId: string, config?: Partial<PipelineConfig>): void {
    const pipelineConfig: PipelineConfig = {
      ...DEFAULT_PIPELINE_CONFIG,
      ...config,
    };

    const session: PipelineSession = {
      id: sessionId,
      config: pipelineConfig,
      state: VoiceSessionState.IDLE,
      audioBuffer: [],
      currentTranscript: '',
      lastInterimTranscript: '',
      processingPromise: null,
      lastProcessingEndTime: 0,
    };

    this.sessions.set(sessionId, session);

    // Initialize VAD for this session
    if (pipelineConfig.enableVad) {
      this.vad.initSession(sessionId);
    }

    // NOTE: STT streaming is now initialized lazily when first audio chunk arrives
    // This prevents timeout errors when there's a delay between session start and speaking
    // See processAudioChunk() for the lazy initialization logic

    this.logger.debug(`Pipeline initialized: session=${sessionId}`);
  }

  /**
   * Set user location for route planning
   */
  setUserLocation(sessionId: string, location: { lat: number; lng: number }): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.userLocation = location;
      this.logger.debug(`User location set: session=${sessionId}, lat=${location.lat}, lng=${location.lng}`);
    }
  }

  /**
   * Process incoming audio chunk
   */
  async processAudioChunk(sessionId: string, audioData: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Session not found: ${sessionId}`);
      return;
    }

    // Buffer the audio
    const buffer = Buffer.from(audioData, 'base64');
    session.audioBuffer.push(buffer);

    // Process through VAD if enabled
    if (session.config.enableVad) {
      const vadResults = this.vad.processAudio(
        sessionId,
        audioData,
        session.config.sampleRateHertz,
      );

      // Check for speech start/end events
      for (const result of vadResults) {
        if (result.speechStarted && session.state === VoiceSessionState.IDLE) {
          session.state = VoiceSessionState.LISTENING;
          this.emit(sessionId, ServerEvents.SPEECH_START, {
            sessionId,
            timestamp: Date.now(),
          });
        }

        if (result.speechEnded && session.state === VoiceSessionState.LISTENING) {
          // Emit speech end event FIRST so frontend can stop recording
          const speechEndEvent: SpeechEndEvent = {
            sessionId,
            timestamp: Date.now(),
          };
          this.emit(sessionId, ServerEvents.SPEECH_END, speechEndEvent);

          // Then trigger end-of-speech processing
          await this.processEndOfSpeech(sessionId);
        }
      }
    }

    // Forward audio to STT for streaming recognition
    // Only restart STT stream if we're in a state that expects audio (IDLE or LISTENING)
    // Don't restart during PROCESSING/SPEAKING as the user has stopped talking
    if (!this.stt.isStreamingActive(sessionId)) {
      // Only start STT if we're waiting for audio, not if we're processing previous speech
      if (session.state === VoiceSessionState.PROCESSING ||
          session.state === VoiceSessionState.SPEAKING) {
        this.logger.debug(`Ignoring audio chunk during ${session.state}: session=${sessionId}`);
        return;
      }

      // Ignore stale audio for 1 second after processing completes
      const cooldownMs = 1000;
      if (Date.now() - session.lastProcessingEndTime < cooldownMs) {
        this.logger.debug(`Ignoring audio during post-processing cooldown: session=${sessionId}`);
        return;
      }

      this.logger.debug(`Starting STT stream for new utterance: session=${sessionId}`);
      const sttConfig: Partial<SttConfig> = {
        languageCode: session.config.languageCode,
        sampleRateHertz: session.config.sampleRateHertz,
        audioEncoding: session.config.audioEncoding,
        enableInterimResults: session.config.enableInterimTranscripts,
      };
      this.stt.startStreaming(
        sessionId,
        sttConfig,
        (result) => this.handleTranscriptResult(sessionId, result),
        (error) => this.handleSttError(sessionId, error),
      );
    }

    this.stt.sendAudio(sessionId, audioData);
  }

  /**
   * Process accumulated audio when speech ends
   */
  async processEndOfSpeech(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    // Prevent duplicate processing
    if (session.processingPromise) {
      await session.processingPromise;
      return;
    }

    session.state = VoiceSessionState.PROCESSING;

    // Stop STT streaming when speech ends
    this.stt.stopStreaming(sessionId);

    // Wait briefly for final transcript to arrive from Google STT
    // The final transcript often arrives 200-500ms after we stop the stream
    await this.waitForFinalTranscript(sessionId, 400);

    session.processingPromise = this.processTranscript(sessionId)
      .finally(() => {
        session.processingPromise = null;
      });

    await session.processingPromise;
  }

  /**
   * Wait for final transcript with timeout
   */
  private waitForFinalTranscript(sessionId: string, timeoutMs: number): Promise<void> {
    return new Promise((resolve) => {
      const session = this.sessions.get(sessionId);
      if (!session || session.currentTranscript) {
        resolve();
        return;
      }

      const startTime = Date.now();
      const checkInterval = setInterval(() => {
        const currentSession = this.sessions.get(sessionId);
        if (currentSession?.currentTranscript || Date.now() - startTime >= timeoutMs) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  }

  /**
   * Handle transcript result from STT
   */
  private handleTranscriptResult(sessionId: string, result: TranscriptResult): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (result.isFinal) {
      session.currentTranscript = result.transcript;
      session.lastInterimTranscript = ''; // Clear interim since we have final

      const event: FinalTranscriptEvent = {
        sessionId,
        transcript: result.transcript,
        confidence: result.confidence,
        alternatives: result.alternatives,
      };

      this.emit(sessionId, ServerEvents.FINAL_TRANSCRIPT, event);
    } else if (session.config.enableInterimTranscripts) {
      // Save interim transcript as fallback in case STT stream dies before final
      if (result.transcript && result.transcript.length > session.lastInterimTranscript.length) {
        session.lastInterimTranscript = result.transcript;
      }

      const event: InterimTranscriptEvent = {
        sessionId,
        transcript: result.transcript,
        confidence: result.confidence,
        isFinal: false,
      };

      // Log interim transcript emission for debugging
      this.logger.debug(`Emitting interim transcript: session=${sessionId}, text="${result.transcript}"`);
      this.emit(sessionId, ServerEvents.INTERIM_TRANSCRIPT, event);
    }
  }

  /**
   * Handle STT error
   * Attempts to restart the STT stream for recoverable errors
   */
  private handleSttError(sessionId: string, error: Error): void {
    const session = this.sessions.get(sessionId);
    const message = error.message.toLowerCase();

    // OUT_OF_RANGE / Audio Timeout errors are expected when user stops speaking
    // Don't log as error or restart - this is normal behavior
    if (message.includes('out_of_range') || message.includes('audio timeout')) {
      // Only log if we're in a state where we expected audio
      if (session?.state === VoiceSessionState.LISTENING) {
        this.logger.warn(`STT timeout while listening: session=${sessionId}`);
      } else {
        this.logger.debug(`STT timeout (expected during ${session?.state || 'unknown'}): session=${sessionId}`);
      }
      // Don't restart or emit error - this is normal when user stops speaking
      return;
    }

    this.logger.error(`STT error: session=${sessionId}`, error);

    const isRecoverable = this.isRecoverableError(error);

    // Emit error to client
    this.emit(sessionId, ServerEvents.ERROR, {
      sessionId,
      code: 'STT_ERROR',
      message: error.message,
      recoverable: isRecoverable,
    });

    // Attempt to restart stream for recoverable errors only if actively listening
    if (isRecoverable && session && session.state === VoiceSessionState.LISTENING) {
      this.logger.log(`Attempting to restart STT stream: session=${sessionId}`);
      const restarted = this.stt.restartStreaming(sessionId);
      if (restarted) {
        this.logger.log(`STT stream restarted successfully: session=${sessionId}`);
      } else {
        this.logger.warn(`Failed to restart STT stream: session=${sessionId}`);
      }
    }
  }

  /**
   * Check if an STT error is recoverable
   * Note: timeout/out_of_range errors are handled separately in handleSttError
   */
  private isRecoverableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    // These errors are typically recoverable by restarting the stream
    // Note: 'timeout' and 'out_of_range' are NOT here as they're handled specially
    const recoverablePatterns = [
      'stream was destroyed',
      'deadline exceeded',
      'rst_stream',
      'unavailable',
    ];
    return recoverablePatterns.some((pattern) => message.includes(pattern));
  }

  /**
   * Process final transcript through NLU and generate TTS response
   */
  private async processTranscript(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return;
    }

    // Use final transcript if available, otherwise fall back to last interim transcript
    let transcript = session.currentTranscript;
    if (!transcript && session.lastInterimTranscript) {
      this.logger.log(`Using interim transcript as fallback: session=${sessionId}`);
      transcript = session.lastInterimTranscript;
    }

    if (!transcript) {
      this.logger.debug(`No transcript to process: session=${sessionId}`);
      session.state = VoiceSessionState.IDLE;
      return;
    }

    // Clear transcripts
    session.currentTranscript = '';
    session.lastInterimTranscript = '';

    try {
      // Process through NLU
      this.logger.log(`Processing NLU: session=${sessionId}, transcript="${transcript}"`);
      const nluResult = await this.nlu.process(transcript);
      this.logger.log(`NLU completed: session=${sessionId}, intent=${nluResult.intent}, confidence=${nluResult.confidence}`);

      const nluEvent: NluResultEvent = {
        sessionId,
        intent: nluResult.intent,
        confidence: nluResult.confidence,
        entities: nluResult.entities,
        requiresConfirmation: nluResult.confidence < 0.8,
        suggestedResponse: this.generateSuggestedResponse(nluResult),
      };

      this.logger.log(`Emitting NLU_RESULT: session=${sessionId}, intent=${nluEvent.intent}`);
      this.emit(sessionId, ServerEvents.NLU_RESULT, nluEvent);

      // Try route planning for navigation intents with sufficient confidence
      let routeResult: Awaited<ReturnType<typeof this.calculateRoute>> = null;
      let ttsText: string | null = nluEvent.suggestedResponse ?? null;

      if (this.isNavigationIntent(nluResult.intent) && nluResult.confidence >= 0.6) {
        routeResult = await this.calculateRoute(sessionId, nluResult);
      }

      if (routeResult) {
        // Generate route summary for TTS
        const summary = this.generateRouteSummary(routeResult.route, routeResult.warnings);

        // Emit ROUTE_PLANNED event BEFORE TTS so frontend can display route
        const routePlannedEvent: RoutePlannedEvent = {
          sessionId,
          route: {
            id: routeResult.route.id,
            origin: routeResult.route.origin,
            destination: routeResult.route.destination,
            stops: routeResult.route.stops.map((s) => ({
              id: s.id,
              name: s.name,
              location: s.location,
              detourCost: s.detourCost,
              order: s.order ?? 0,
            })),
            totalDistance: routeResult.route.totalDistance,
            totalTime: routeResult.route.totalTime,
            polyline: routeResult.route.polyline,
          },
          summary,
          warnings: routeResult.warnings?.map((w) => ({
            stopName: w.stopName,
            message: w.message,
            detourMinutes: w.detourMinutes,
          })),
        };

        this.logger.log(`Emitting ROUTE_PLANNED: session=${sessionId}, stops=${routeResult.route.stops.length}`);
        this.emit(sessionId, ServerEvents.ROUTE_PLANNED, routePlannedEvent);

        ttsText = summary;
      }

      // Generate TTS response if enabled
      if (session.config.autoGenerateTts && ttsText) {
        this.logger.log(`Generating TTS: session=${sessionId}, text="${ttsText}"`);
        session.state = VoiceSessionState.SPEAKING;
        await this.generateAndSendTts(sessionId, ttsText, nluResult);
        this.logger.log(`TTS sent: session=${sessionId}`);
      }

      this.logger.log(`Voice processing complete: session=${sessionId}`);
      session.lastProcessingEndTime = Date.now();
      session.state = VoiceSessionState.IDLE;
    } catch (error) {
      this.logger.error(`Pipeline processing error: session=${sessionId}`, error);
      session.state = VoiceSessionState.ERROR;
      this.emit(sessionId, ServerEvents.ERROR, {
        sessionId,
        code: 'PIPELINE_ERROR',
        message: error instanceof Error ? error.message : 'Processing failed',
        recoverable: true,
      });
    }
  }

  /**
   * Generate suggested response based on NLU result
   */
  private generateSuggestedResponse(nluResult: NLUResponse): string {
    const entities = nluResult.entities as {
      destination?: string;
      stops?: string[];
    };

    switch (nluResult.intent) {
      case 'navigate':
      case 'navigate_with_stops':
      case 'navigate_direct':
        if (entities.destination && entities.stops?.length) {
          const stopsText = entities.stops.length === 1
            ? entities.stops[0]
            : `${entities.stops.slice(0, -1).join(', ')} and ${entities.stops[entities.stops.length - 1]}`;
          return `Got it! I'll navigate you to ${entities.destination} with stops at ${stopsText}.`;
        }
        if (entities.stops?.length && !entities.destination) {
          const stopsText = entities.stops.length === 1
            ? entities.stops[0]
            : `${entities.stops.slice(0, -1).join(', ')} and ${entities.stops[entities.stops.length - 1]}`;
          return `I'll add ${stopsText} to your route. Where would you like to go?`;
        }
        if (entities.destination) {
          return `Navigating to ${entities.destination}.`;
        }
        return 'Where would you like to go?';

      case 'add_stop':
        if (entities.stops?.length) {
          return `Adding ${entities.stops.join(' and ')} to your route.`;
        }
        return 'What stop would you like to add?';

      case 'remove_stop':
        if (entities.stops?.length) {
          return `Removing ${entities.stops.join(' and ')} from your route.`;
        }
        return 'Which stop would you like to remove?';

      case 'confirm':
        return 'Starting navigation now.';

      case 'cancel':
        return 'Route cancelled.';

      case 'help':
        return 'You can say things like "take me home with Starbucks on the way" or "add a gas station to my route".';

      default:
        if (nluResult.confidence < 0.6) {
          return "I didn't quite catch that. Could you try again?";
        }
        return 'How can I help you with your trip?';
    }
  }

  /**
   * Check if the intent is a navigation intent that should trigger route planning
   */
  private isNavigationIntent(intent: string): boolean {
    return ['navigate', 'navigate_with_stops', 'navigate_direct'].includes(intent);
  }

  /**
   * Calculate route based on NLU result
   */
  private async calculateRoute(
    sessionId: string,
    nluResult: NLUResponse,
  ): Promise<Awaited<ReturnType<ErrandService['navigateWithStops']>> | null> {
    const session = this.sessions.get(sessionId);
    if (!session?.userLocation) {
      this.logger.warn(`Cannot calculate route: no user location for session=${sessionId}`);
      return null;
    }

    const entities = nluResult.entities as { destination?: string; stops?: string[] };
    if (!entities.destination && !entities.stops?.length) {
      this.logger.debug(`Cannot calculate route: no destination or stops for session=${sessionId}`);
      return null;
    }

    try {
      this.logger.log(`Calculating route: session=${sessionId}, destination=${entities.destination}, stops=${entities.stops?.join(', ')}`);
      const result = await this.errand.navigateWithStops({
        origin: session.userLocation,
        destination: { name: entities.destination || 'destination' },
        stops: (entities.stops || []).map((s) => ({ name: s })),
        anchors: [],
      });
      this.logger.log(`Route calculated: session=${sessionId}, totalTime=${result.route.totalTime}min`);
      return result;
    } catch (error) {
      this.logger.error(`Route planning failed: session=${sessionId}`, error);
      return null;
    }
  }

  /**
   * Generate a summary of the route for TTS
   */
  private generateRouteSummary(
    route: Awaited<ReturnType<ErrandService['navigateWithStops']>>['route'],
    warnings?: Array<{ stopName: string; message: string; detourMinutes: number }>,
  ): string {
    const stopNames = route.stops.map((s) => s.name).join(' and ');
    let summary = route.stops.length > 0
      ? `I found ${stopNames} on your way. `
      : '';
    summary += `Your trip is ${route.totalDistance.toFixed(1)} miles, about ${Math.round(route.totalTime)} minutes. `;
    if (warnings?.length) {
      summary += warnings[0].message + ' ';
    }
    summary += 'Ready to go?';
    return summary;
  }

  /**
   * Generate TTS audio and send to client
   */
  private async generateAndSendTts(
    sessionId: string,
    text: string,
    nluResult: NLUResponse,
  ): Promise<void> {
    try {
      // Choose voice preset based on intent
      let ttsResult: TtsResult;
      const navigationIntents = ['navigate', 'navigate_with_stops', 'navigate_direct', 'confirm'];

      if (navigationIntents.includes(nluResult.intent)) {
        ttsResult = await this.tts.generateResponse(text, 'NAVIGATION');
      } else if (nluResult.confidence < 0.6) {
        ttsResult = await this.tts.generateAlert(text);
      } else {
        ttsResult = await this.tts.generateResponse(text, 'ASSISTANT');
      }

      const event: TtsAudioEvent = {
        sessionId,
        audioData: ttsResult.audioData,
        encoding: ttsResult.encoding,
        sampleRateHertz: ttsResult.sampleRateHertz,
        text: ttsResult.text,
        isComplete: true,
      };

      this.emit(sessionId, ServerEvents.TTS_AUDIO, event);
    } catch (error) {
      this.logger.error(`TTS generation failed: session=${sessionId}`, error);
      // Don't fail the whole pipeline for TTS errors
    }
  }

  /**
   * Manually trigger TTS for a message
   */
  async speak(
    sessionId: string,
    text: string,
    preset: keyof typeof VoicePresets = 'DEFAULT',
  ): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.state = VoiceSessionState.SPEAKING;

    try {
      const ttsResult = await this.tts.generateResponse(text, preset);

      const event: TtsAudioEvent = {
        sessionId,
        audioData: ttsResult.audioData,
        encoding: ttsResult.encoding,
        sampleRateHertz: ttsResult.sampleRateHertz,
        text: ttsResult.text,
        isComplete: true,
      };

      this.emit(sessionId, ServerEvents.TTS_AUDIO, event);
    } finally {
      session.state = VoiceSessionState.IDLE;
    }
  }

  /**
   * Cleanup session
   */
  cleanupSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    this.vad.cleanupSession(sessionId);
    this.stt.stopStreaming(sessionId);
    this.sessions.delete(sessionId);

    this.logger.debug(`Pipeline cleaned up: session=${sessionId}`);
  }

  /**
   * Get session state
   */
  getSessionState(sessionId: string): VoiceSessionState | undefined {
    return this.sessions.get(sessionId)?.state;
  }

  /**
   * Emit event through the gateway
   */
  private emit(sessionId: string, event: string, data: unknown): void {
    if (this.eventEmitter) {
      this.eventEmitter.emit(sessionId, event, data);
    }
  }
}
