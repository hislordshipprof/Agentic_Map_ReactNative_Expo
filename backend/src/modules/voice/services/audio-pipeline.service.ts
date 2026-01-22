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
import {
  VoiceSessionState,
  AudioEncoding,
  VoiceDefaults,
  ServerEvents,
  type InterimTranscriptEvent,
  type FinalTranscriptEvent,
  type NluResultEvent,
  type TtsAudioEvent,
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
  processingPromise: Promise<void> | null;
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
      processingPromise: null,
    };

    this.sessions.set(sessionId, session);

    // Initialize VAD for this session
    if (pipelineConfig.enableVad) {
      this.vad.initSession(sessionId);
    }

    // Initialize STT streaming with callbacks
    const sttConfig: Partial<SttConfig> = {
      languageCode: pipelineConfig.languageCode,
      sampleRateHertz: pipelineConfig.sampleRateHertz,
      audioEncoding: pipelineConfig.audioEncoding,
      enableInterimResults: pipelineConfig.enableInterimTranscripts,
    };

    this.stt.startStreaming(
      sessionId,
      sttConfig,
      (result) => this.handleTranscriptResult(sessionId, result),
      (error) => this.handleSttError(sessionId, error),
    );

    this.logger.debug(`Pipeline initialized: session=${sessionId}`);
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
          // Trigger end-of-speech processing
          await this.processEndOfSpeech(sessionId);
        }
      }
    }

    // Forward audio to STT for streaming recognition
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

    session.processingPromise = this.processTranscript(sessionId)
      .finally(() => {
        session.processingPromise = null;
      });

    await session.processingPromise;
  }

  /**
   * Handle transcript result from STT
   */
  private handleTranscriptResult(sessionId: string, result: TranscriptResult): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    if (result.isFinal) {
      session.currentTranscript = result.transcript;

      const event: FinalTranscriptEvent = {
        sessionId,
        transcript: result.transcript,
        confidence: result.confidence,
        alternatives: result.alternatives,
      };

      this.emit(sessionId, ServerEvents.FINAL_TRANSCRIPT, event);
    } else if (session.config.enableInterimTranscripts) {
      const event: InterimTranscriptEvent = {
        sessionId,
        transcript: result.transcript,
        confidence: result.confidence,
        isFinal: false,
      };

      this.emit(sessionId, ServerEvents.INTERIM_TRANSCRIPT, event);
    }
  }

  /**
   * Handle STT error
   */
  private handleSttError(sessionId: string, error: Error): void {
    this.logger.error(`STT error: session=${sessionId}`, error);
    this.emit(sessionId, ServerEvents.ERROR, {
      sessionId,
      code: 'STT_ERROR',
      message: error.message,
      recoverable: true,
    });
  }

  /**
   * Process final transcript through NLU and generate TTS response
   */
  private async processTranscript(sessionId: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentTranscript) {
      session && (session.state = VoiceSessionState.IDLE);
      return;
    }

    const transcript = session.currentTranscript;
    session.currentTranscript = '';

    try {
      // Process through NLU
      this.logger.debug(`Processing NLU: session=${sessionId}, transcript="${transcript}"`);
      const nluResult = await this.nlu.process(transcript);

      const nluEvent: NluResultEvent = {
        sessionId,
        intent: nluResult.intent,
        confidence: nluResult.confidence,
        entities: nluResult.entities,
        requiresConfirmation: nluResult.confidence < 0.8,
        suggestedResponse: this.generateSuggestedResponse(nluResult),
      };

      this.emit(sessionId, ServerEvents.NLU_RESULT, nluEvent);

      // Generate TTS response if enabled
      if (session.config.autoGenerateTts && nluEvent.suggestedResponse) {
        session.state = VoiceSessionState.SPEAKING;
        await this.generateAndSendTts(sessionId, nluEvent.suggestedResponse, nluResult);
      }

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
        if (entities.destination && entities.stops?.length) {
          const stopsText = entities.stops.length === 1
            ? entities.stops[0]
            : `${entities.stops.slice(0, -1).join(', ')} and ${entities.stops[entities.stops.length - 1]}`;
          return `Got it! I'll navigate you to ${entities.destination} with stops at ${stopsText}.`;
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

      if (nluResult.intent === 'navigate' || nluResult.intent === 'confirm') {
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
