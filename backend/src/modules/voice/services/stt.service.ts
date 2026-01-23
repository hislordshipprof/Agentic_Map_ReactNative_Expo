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
import { PassThrough } from 'stream';
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
  recognizeStream: ReturnType<SpeechClient['streamingRecognize']> | null;
  audioInputStream: PassThrough | null; // Not used with low-level API
  config: SttConfig;
  onResult: (result: TranscriptResult) => void;
  onError: (error: Error) => void;
  isActive: boolean; // Track if stream is active and writable
  isFirstChunk: boolean; // Track if first chunk (may have WAV header)
  configSent: boolean; // Track if streaming config has been sent
}

/**
 * WAV header size in bytes
 */
const WAV_HEADER_SIZE = 44;

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

    this.logger.log(`Creating STT stream with config: session=${sessionId}, encoding=${recognitionConfig.encoding}, sampleRate=${recognitionConfig.sampleRateHertz}, language=${recognitionConfig.languageCode}`);

    // Use the low-level _streamingRecognize method to avoid the helpers.js wrapper issues
    // The helpers.js wrapper has timing issues that cause "Malordered Data" errors
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawClient = this.client as any;
    const recognizeStream = rawClient._streamingRecognize();

    // Create session first so we can update it in event handlers
    const session: StreamingSession = {
      recognizeStream,
      audioInputStream: null, // Not using PassThrough anymore
      config: sttConfig,
      onResult,
      onError,
      isActive: true,
      isFirstChunk: true, // First chunk may have WAV header
      configSent: false, // Track if config has been sent
    };
    this.sessions.set(sessionId, session);

    recognizeStream.on('data', (response: IStreamingRecognizeResponse) => {
      this.logger.debug(`STT data received: session=${sessionId}, hasResults=${!!response.results?.length}`);
      this.handleStreamingResponse(sessionId, response, onResult);
    });

    recognizeStream.on('error', (error: Error) => {
      this.logger.error(`STT stream error: session=${sessionId}, message=${error.message}`, error.stack);
      // Mark session as inactive to prevent further writes
      const currentSession = this.sessions.get(sessionId);
      if (currentSession) {
        currentSession.isActive = false;
        currentSession.recognizeStream = null;
      }
      onError(error);
    });

    recognizeStream.on('end', () => {
      this.logger.log(`STT stream ended normally: session=${sessionId}`);
      // Mark session as inactive on normal end
      const currentSession = this.sessions.get(sessionId);
      if (currentSession) {
        currentSession.isActive = false;
        currentSession.recognizeStream = null;
      }
    });

    recognizeStream.on('close', () => {
      this.logger.log(`STT stream closed: session=${sessionId}`);
    });

    // Send the streaming config as the FIRST message (no audio content)
    // This is required by the API - config must come before any audio data
    recognizeStream.write({ streamingConfig });
    session.configSent = true;
    this.logger.log(`STT config sent, streaming ready: session=${sessionId}`);
  }

  /**
   * Send audio data to streaming session
   * With low-level API, we write { audioContent: buffer } directly to recognizeStream
   */
  sendAudio(sessionId: string, audioData: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session?.recognizeStream || !session.isActive) {
      this.logger.warn(`Cannot send audio: session=${sessionId}, hasStream=${!!session?.recognizeStream}, isActive=${session?.isActive}`);
      return false;
    }

    // Ensure config was sent first (should always be true after startStreaming)
    if (!session.configSent) {
      this.logger.error(`Cannot send audio before config: session=${sessionId}`);
      return false;
    }

    try {
      // Decode base64 to Buffer
      let audioBuffer: Buffer;
      try {
        audioBuffer = Buffer.from(audioData, 'base64');
      } catch (decodeError) {
        this.logger.error(`Failed to decode base64: session=${sessionId}`, decodeError);
        return false;
      }

      // Debug: Log raw buffer info for first few chunks
      if (session.isFirstChunk) {
        this.logger.log(`[FIRST CHUNK] Raw base64 length: ${audioData.length}, decoded size: ${audioBuffer.length}`);
        this.logger.log(`[FIRST CHUNK] First 32 bytes hex: ${audioBuffer.slice(0, 32).toString('hex')}`);
      }

      // Check for and strip WAV header from EVERY chunk
      // expo-audio-studio with primary output enabled wraps each chunk in WAV format
      if (this.hasWavHeader(audioBuffer)) {
        const dataOffset = this.findWavDataOffset(audioBuffer);
        if (session.isFirstChunk) {
          this.logger.log(`[FIRST CHUNK] WAV header detected! headerSize=${dataOffset}, originalSize=${audioBuffer.length}`);
          // Log WAV format info
          const bitsPerSample = audioBuffer.readUInt16LE(34);
          const sampleRate = audioBuffer.readUInt32LE(24);
          const numChannels = audioBuffer.readUInt16LE(22);
          this.logger.log(`[FIRST CHUNK] WAV format: ${bitsPerSample}-bit, ${sampleRate}Hz, ${numChannels} channel(s)`);
        }
        audioBuffer = audioBuffer.slice(dataOffset);
        if (session.isFirstChunk) {
          this.logger.log(`[FIRST CHUNK] After stripping: size=${audioBuffer.length}, first8bytes=[${audioBuffer.slice(0, 8).toString('hex')}]`);
        }
      } else if (session.isFirstChunk) {
        this.logger.log(`[FIRST CHUNK] No WAV header detected, treating as raw PCM`);
      }

      // Mark first chunk as processed
      if (session.isFirstChunk) {
        session.isFirstChunk = false;
      }

      // Don't send empty buffers
      if (audioBuffer.length === 0) {
        this.logger.debug(`Empty audio buffer after processing: session=${sessionId}`);
        return true;
      }

      // Validate buffer before sending
      if (!Buffer.isBuffer(audioBuffer)) {
        this.logger.error(`Invalid buffer type: session=${sessionId}`);
        return false;
      }

      // Expected size for 100ms of 16kHz 16-bit mono: ~3200 bytes
      // Log if size is unexpected
      if (audioBuffer.length < 1000 || audioBuffer.length > 10000) {
        this.logger.warn(`Unusual audio chunk size: session=${sessionId}, size=${audioBuffer.length} (expected ~3200 for 100ms)`);
      }

      // Write audio data directly to recognizeStream using the low-level API format
      // With _streamingRecognize(), we must wrap audio in { audioContent: buffer }
      try {
        session.recognizeStream.write({ audioContent: audioBuffer });
        return true;
      } catch (writeError) {
        this.logger.error(`Stream write failed: session=${sessionId}`, writeError);
        session.isActive = false;
        return false;
      }
    } catch (error) {
      this.logger.error(`Failed to send audio: session=${sessionId}`, error);
      // Mark as inactive on write error
      session.isActive = false;
      session.recognizeStream = null;
      return false;
    }
  }

  /**
   * Find the actual data start offset in a WAV file
   * WAV files can have variable header sizes due to optional chunks
   */
  private findWavDataOffset(buffer: Buffer): number {
    // Search for "data" chunk marker
    for (let i = 12; i < Math.min(buffer.length - 4, 200); i++) {
      if (
        buffer[i] === 0x64 && // 'd'
        buffer[i + 1] === 0x61 && // 'a'
        buffer[i + 2] === 0x74 && // 't'
        buffer[i + 3] === 0x61 // 'a'
      ) {
        // Data chunk found, skip "data" (4 bytes) + chunk size (4 bytes)
        return i + 8;
      }
    }
    // Default to standard WAV header size if "data" not found
    return WAV_HEADER_SIZE;
  }

  /**
   * Check if buffer has a WAV header
   */
  private hasWavHeader(buffer: Buffer): boolean {
    if (buffer.length < WAV_HEADER_SIZE) {
      return false;
    }

    // Check for RIFF header and WAVE format
    return (
      buffer[0] === 0x52 && // 'R'
      buffer[1] === 0x49 && // 'I'
      buffer[2] === 0x46 && // 'F'
      buffer[3] === 0x46 && // 'F'
      buffer[8] === 0x57 && // 'W'
      buffer[9] === 0x41 && // 'A'
      buffer[10] === 0x56 && // 'V'
      buffer[11] === 0x45 // 'E'
    );
  }

  /**
   * Check if streaming session is active
   */
  isStreamingActive(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    return session?.isActive ?? false;
  }

  /**
   * Test audio data with non-streaming API (for debugging)
   * Accumulates audio chunks and tests them with the recognize() API
   */
  async testAudioData(sessionId: string, audioData: string): Promise<void> {
    if (!this.client) {
      this.logger.warn('Cannot test: Speech client not initialized');
      return;
    }

    try {
      let audioBuffer = Buffer.from(audioData, 'base64');

      // Strip WAV header if present
      if (this.hasWavHeader(audioBuffer)) {
        const dataOffset = this.findWavDataOffset(audioBuffer);
        audioBuffer = audioBuffer.slice(dataOffset);
      }

      if (audioBuffer.length < 100) {
        this.logger.debug('Test chunk too small, skipping');
        return;
      }

      // Test with non-streaming API
      this.logger.log(`Testing audio chunk: size=${audioBuffer.length} bytes`);

      const [response] = await this.client.recognize({
        config: {
          encoding: 'LINEAR16',
          sampleRateHertz: 16000,
          languageCode: 'en-US',
        },
        audio: {
          content: audioBuffer.toString('base64'),
        },
      });

      if (response.results && response.results.length > 0) {
        const transcript = response.results[0].alternatives?.[0]?.transcript || '';
        this.logger.log(`Test transcription result: "${transcript}"`);
      } else {
        this.logger.log('Test transcription: no results (might be too short or no speech)');
      }
    } catch (error) {
      this.logger.error('Test transcription failed:', error);
    }
  }

  /**
   * Restart streaming session (recreate the stream)
   * Useful after stream errors or timeouts
   */
  restartStreaming(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      this.logger.warn(`Cannot restart: session not found: ${sessionId}`);
      return false;
    }

    if (!this.client) {
      this.logger.warn('Cannot restart: Speech client not initialized');
      return false;
    }

    this.logger.log(`Restarting STT stream: session=${sessionId}`);

    // Mark as inactive to prevent writes during restart
    session.isActive = false;

    // Clean up old stream
    if (session.recognizeStream) {
      try {
        session.recognizeStream.end();
      } catch (error) {
        this.logger.debug(`Error ending recognize stream: ${error}`);
      }
    }

    // Recreate the stream with same config and callbacks
    this.startStreaming(
      sessionId,
      session.config,
      session.onResult,
      session.onError,
    );

    return true;
  }

  /**
   * Stop streaming session
   */
  stopStreaming(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      // Mark session as inactive first to prevent further writes
      session.isActive = false;

      // End recognize stream (low-level API - direct stream)
      if (session.recognizeStream) {
        try {
          session.recognizeStream.end();
        } catch (error) {
          this.logger.debug(`Error ending recognize stream: ${error}`);
        }
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

      // Log all transcript results (interim and final) for debugging
      this.logger.log(`STT result: session=${sessionId}, isFinal=${transcriptResult.isFinal}, text="${transcriptResult.transcript}"`);

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
