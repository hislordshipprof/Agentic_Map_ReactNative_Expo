/**
 * Speech-to-Text (STT) Service
 *
 * Per FINAL_REQUIREMENTS.md - Voice Streaming:
 * - Google Cloud Speech-to-Text integration
 * - Streaming recognition for real-time transcription
 * - Interim and final transcript support
 */

import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { SpeechClient, protos } from '@google-cloud/speech';
import { VoiceDefaults, AudioEncoding } from '../dtos';

type IRecognitionConfig = protos.google.cloud.speech.v1.IRecognitionConfig;
type IStreamingRecognitionConfig = protos.google.cloud.speech.v1.IStreamingRecognitionConfig;
type IStreamingRecognizeResponse = protos.google.cloud.speech.v1.IStreamingRecognizeResponse;

/**
 * STT configuration
 */
export interface SttConfig {
  languageCode: string;
  sampleRateHertz: number;
  audioEncoding: AudioEncoding;
  enableInterimResults: boolean;
  model?: string;
  useEnhanced?: boolean;
}

/**
 * Transcript result
 */
export interface TranscriptResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
  alternatives: Array<{
    transcript: string;
    confidence: number;
  }>;
}

/**
 * Streaming session
 */
interface StreamingSession {
  stream: ReturnType<SpeechClient['streamingRecognize']> | null;
  config: SttConfig;
  onResult: (result: TranscriptResult) => void;
  onError: (error: Error) => void;
}

const DEFAULT_STT_CONFIG: SttConfig = {
  languageCode: VoiceDefaults.LANGUAGE_CODE,
  sampleRateHertz: VoiceDefaults.SAMPLE_RATE_HERTZ,
  audioEncoding: VoiceDefaults.AUDIO_ENCODING,
  enableInterimResults: true,
  model: 'latest_short', // Optimized for short utterances
  useEnhanced: true,
};

@Injectable()
export class SttService implements OnModuleInit {
  private readonly logger = new Logger(SttService.name);
  private client: SpeechClient | null = null;
  private sessions: Map<string, StreamingSession> = new Map();

  async onModuleInit() {
    try {
      // Initialize Google Cloud Speech client
      // Credentials loaded from GOOGLE_APPLICATION_CREDENTIALS env var
      this.client = new SpeechClient();
      this.logger.log('Google Cloud Speech client initialized');
    } catch (error) {
      this.logger.error('Failed to initialize Speech client', error);
      // Service will work in fallback mode without actual transcription
    }
  }

  /**
   * Start a streaming recognition session
   */
  startStreaming(
    sessionId: string,
    config: Partial<SttConfig>,
    onResult: (result: TranscriptResult) => void,
    onError: (error: Error) => void,
  ): void {
    if (!this.client) {
      this.logger.warn('Speech client not initialized, using mock mode');
      onError(new Error('Speech client not initialized'));
      return;
    }

    // Cleanup existing session if any
    this.stopStreaming(sessionId);

    const sttConfig: SttConfig = {
      ...DEFAULT_STT_CONFIG,
      ...config,
    };

    const recognitionConfig: IRecognitionConfig = {
      encoding: this.mapEncoding(sttConfig.audioEncoding),
      sampleRateHertz: sttConfig.sampleRateHertz,
      languageCode: sttConfig.languageCode,
      model: sttConfig.model,
      useEnhanced: sttConfig.useEnhanced,
      enableAutomaticPunctuation: true,
      metadata: {
        interactionType: 'VOICE_COMMAND',
        microphoneDistance: 'NEARFIELD',
        recordingDeviceType: 'SMARTPHONE',
      },
    };

    const streamingConfig: IStreamingRecognitionConfig = {
      config: recognitionConfig,
      interimResults: sttConfig.enableInterimResults,
      singleUtterance: false,
    };

    const stream = this.client.streamingRecognize(streamingConfig);

    stream.on('data', (response: IStreamingRecognizeResponse) => {
      this.handleStreamingResponse(sessionId, response, onResult);
    });

    stream.on('error', (error: Error) => {
      this.logger.error(`STT stream error: session=${sessionId}`, error);
      onError(error);
    });

    stream.on('end', () => {
      this.logger.debug(`STT stream ended: session=${sessionId}`);
    });

    this.sessions.set(sessionId, {
      stream,
      config: sttConfig,
      onResult,
      onError,
    });

    this.logger.debug(`STT streaming started: session=${sessionId}`);
  }

  /**
   * Send audio data to streaming session
   */
  sendAudio(sessionId: string, audioData: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session?.stream) {
      return false;
    }

    try {
      const audioBuffer = Buffer.from(audioData, 'base64');
      session.stream.write({ audioContent: audioBuffer });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send audio: session=${sessionId}`, error);
      return false;
    }
  }

  /**
   * Stop streaming session
   */
  stopStreaming(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session?.stream) {
      try {
        session.stream.end();
      } catch (error) {
        this.logger.debug(`Error ending stream: ${error}`);
      }
    }
    this.sessions.delete(sessionId);
    this.logger.debug(`STT streaming stopped: session=${sessionId}`);
  }

  /**
   * Transcribe audio buffer (non-streaming)
   */
  async transcribe(
    audioData: string,
    config?: Partial<SttConfig>,
  ): Promise<TranscriptResult> {
    if (!this.client) {
      this.logger.warn('Speech client not initialized, returning mock result');
      return this.getMockResult();
    }

    const sttConfig: SttConfig = {
      ...DEFAULT_STT_CONFIG,
      ...config,
    };

    const recognitionConfig: IRecognitionConfig = {
      encoding: this.mapEncoding(sttConfig.audioEncoding),
      sampleRateHertz: sttConfig.sampleRateHertz,
      languageCode: sttConfig.languageCode,
      model: sttConfig.model,
      useEnhanced: sttConfig.useEnhanced,
      enableAutomaticPunctuation: true,
    };

    try {
      const [response] = await this.client.recognize({
        config: recognitionConfig,
        audio: {
          content: audioData,
        },
      });

      if (!response.results || response.results.length === 0) {
        return this.getEmptyResult();
      }

      const result = response.results[0];
      const alternatives = result.alternatives || [];

      return {
        transcript: alternatives[0]?.transcript || '',
        confidence: alternatives[0]?.confidence || 0,
        isFinal: true,
        alternatives: alternatives.map((alt) => ({
          transcript: alt.transcript || '',
          confidence: alt.confidence || 0,
        })),
      };
    } catch (error) {
      this.logger.error('Transcription failed', error);
      throw error;
    }
  }

  /**
   * Handle streaming recognition response
   */
  private handleStreamingResponse(
    sessionId: string,
    response: IStreamingRecognizeResponse,
    onResult: (result: TranscriptResult) => void,
  ): void {
    if (!response.results || response.results.length === 0) {
      return;
    }

    for (const result of response.results) {
      const alternatives = result.alternatives || [];
      if (alternatives.length === 0) continue;

      const transcriptResult: TranscriptResult = {
        transcript: alternatives[0].transcript || '',
        confidence: alternatives[0].confidence || 0,
        isFinal: result.isFinal || false,
        alternatives: alternatives.map((alt) => ({
          transcript: alt.transcript || '',
          confidence: alt.confidence || 0,
        })),
      };

      onResult(transcriptResult);
    }
  }

  /**
   * Map our encoding enum to Google's
   */
  private mapEncoding(
    encoding: AudioEncoding,
  ): 'LINEAR16' | 'WEBM_OPUS' | 'OGG_OPUS' {
    switch (encoding) {
      case AudioEncoding.LINEAR16:
        return 'LINEAR16';
      case AudioEncoding.WEBM_OPUS:
        return 'WEBM_OPUS';
      case AudioEncoding.OGG_OPUS:
        return 'OGG_OPUS';
      default:
        return 'LINEAR16';
    }
  }

  /**
   * Get empty result
   */
  private getEmptyResult(): TranscriptResult {
    return {
      transcript: '',
      confidence: 0,
      isFinal: true,
      alternatives: [],
    };
  }

  /**
   * Get mock result for development
   */
  private getMockResult(): TranscriptResult {
    return {
      transcript: '[Mock transcription - Speech client not configured]',
      confidence: 0,
      isFinal: true,
      alternatives: [],
    };
  }
}
