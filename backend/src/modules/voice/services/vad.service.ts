/**
 * Voice Activity Detection (VAD) Service
 *
 * Per FINAL_REQUIREMENTS.md - Voice Streaming:
 * - Detect speech start/end in audio stream
 * - Energy-based detection with configurable thresholds
 * - Silence detection for end-of-utterance
 */

import { Injectable, Logger } from '@nestjs/common';
import { VoiceDefaults } from '../dtos';

/**
 * VAD configuration
 */
export interface VadConfig {
  /** RMS energy threshold for speech detection (0-1) */
  energyThreshold: number;
  /** Minimum consecutive speech frames to trigger speech start */
  speechFramesRequired: number;
  /** Silence duration (ms) to trigger speech end */
  silenceThresholdMs: number;
  /** Frame duration in ms */
  frameDurationMs: number;
}

/**
 * VAD state for a session
 */
export interface VadState {
  isSpeaking: boolean;
  speechStartTime: number | null;
  silenceStartTime: number | null;
  consecutiveSpeechFrames: number;
  consecutiveSilenceFrames: number;
  totalFramesProcessed: number;
}

/**
 * VAD result for a single frame
 */
export interface VadFrameResult {
  isSpeech: boolean;
  energy: number;
  speechStarted: boolean;
  speechEnded: boolean;
}

const DEFAULT_VAD_CONFIG: VadConfig = {
  energyThreshold: 0.02, // Tuned for typical microphone input
  speechFramesRequired: 3, // ~60ms of speech to start
  silenceThresholdMs: VoiceDefaults.VAD_SILENCE_THRESHOLD_MS,
  frameDurationMs: 20, // 20ms frames
};

@Injectable()
export class VadService {
  private readonly logger = new Logger(VadService.name);
  private sessionStates: Map<string, VadState> = new Map();
  private sessionConfigs: Map<string, VadConfig> = new Map();

  /**
   * Initialize VAD for a session
   */
  initSession(sessionId: string, config?: Partial<VadConfig>): void {
    const vadConfig: VadConfig = {
      ...DEFAULT_VAD_CONFIG,
      ...config,
    };

    const vadState: VadState = {
      isSpeaking: false,
      speechStartTime: null,
      silenceStartTime: null,
      consecutiveSpeechFrames: 0,
      consecutiveSilenceFrames: 0,
      totalFramesProcessed: 0,
    };

    this.sessionConfigs.set(sessionId, vadConfig);
    this.sessionStates.set(sessionId, vadState);
    this.logger.debug(`VAD initialized for session: ${sessionId}`);
  }

  /**
   * Process an audio frame and detect voice activity
   *
   * @param sessionId - Voice session ID
   * @param audioData - Base64 encoded audio frame (LINEAR16)
   * @returns VAD result with speech detection status
   */
  processFrame(sessionId: string, audioData: string): VadFrameResult {
    const state = this.sessionStates.get(sessionId);
    const config = this.sessionConfigs.get(sessionId);

    if (!state || !config) {
      this.logger.warn(`VAD not initialized for session: ${sessionId}`);
      return {
        isSpeech: false,
        energy: 0,
        speechStarted: false,
        speechEnded: false,
      };
    }

    // Decode base64 to buffer
    const buffer = Buffer.from(audioData, 'base64');

    // Calculate RMS energy
    const energy = this.calculateRmsEnergy(buffer);
    const isSpeech = energy > config.energyThreshold;

    let speechStarted = false;
    let speechEnded = false;
    const now = Date.now();

    if (isSpeech) {
      state.consecutiveSpeechFrames++;
      state.consecutiveSilenceFrames = 0;
      state.silenceStartTime = null;

      // Check for speech start
      if (!state.isSpeaking && state.consecutiveSpeechFrames >= config.speechFramesRequired) {
        state.isSpeaking = true;
        state.speechStartTime = now;
        speechStarted = true;
        this.logger.debug(`Speech started: session=${sessionId}, energy=${energy.toFixed(4)}`);
      }
    } else {
      state.consecutiveSilenceFrames++;
      state.consecutiveSpeechFrames = 0;

      // Track silence start
      if (state.isSpeaking && !state.silenceStartTime) {
        state.silenceStartTime = now;
      }

      // Check for speech end (silence threshold exceeded)
      if (state.isSpeaking && state.silenceStartTime) {
        const silenceDuration = now - state.silenceStartTime;
        if (silenceDuration >= config.silenceThresholdMs) {
          state.isSpeaking = false;
          state.speechStartTime = null;
          state.silenceStartTime = null;
          speechEnded = true;
          this.logger.debug(`Speech ended: session=${sessionId}, silence=${silenceDuration}ms`);
        }
      }
    }

    state.totalFramesProcessed++;

    return {
      isSpeech,
      energy,
      speechStarted,
      speechEnded,
    };
  }

  /**
   * Check if session is currently speaking
   */
  isSpeaking(sessionId: string): boolean {
    return this.sessionStates.get(sessionId)?.isSpeaking ?? false;
  }

  /**
   * Get session state
   */
  getState(sessionId: string): VadState | undefined {
    return this.sessionStates.get(sessionId);
  }

  /**
   * Reset VAD state for a session (e.g., after processing)
   */
  resetState(sessionId: string): void {
    const state = this.sessionStates.get(sessionId);
    if (state) {
      state.isSpeaking = false;
      state.speechStartTime = null;
      state.silenceStartTime = null;
      state.consecutiveSpeechFrames = 0;
      state.consecutiveSilenceFrames = 0;
    }
  }

  /**
   * Cleanup session
   */
  cleanupSession(sessionId: string): void {
    this.sessionStates.delete(sessionId);
    this.sessionConfigs.delete(sessionId);
    this.logger.debug(`VAD cleaned up for session: ${sessionId}`);
  }

  /**
   * Calculate RMS (Root Mean Square) energy of audio samples
   *
   * Assumes LINEAR16 (16-bit signed PCM, little-endian)
   */
  private calculateRmsEnergy(buffer: Buffer): number {
    if (buffer.length < 2) return 0;

    let sumSquares = 0;
    const sampleCount = Math.floor(buffer.length / 2);

    for (let i = 0; i < buffer.length - 1; i += 2) {
      // Read 16-bit signed sample (little-endian)
      const sample = buffer.readInt16LE(i);
      // Normalize to -1 to 1 range
      const normalized = sample / 32768;
      sumSquares += normalized * normalized;
    }

    // Return RMS normalized to 0-1 range
    return Math.sqrt(sumSquares / sampleCount);
  }

  /**
   * Process multiple frames at once
   *
   * @param sessionId - Voice session ID
   * @param audioData - Base64 encoded audio (multiple frames)
   * @param sampleRate - Sample rate in Hz
   * @returns Array of VAD results per frame
   */
  processAudio(
    sessionId: string,
    audioData: string,
    sampleRate: number = VoiceDefaults.SAMPLE_RATE_HERTZ,
  ): VadFrameResult[] {
    const config = this.sessionConfigs.get(sessionId);
    if (!config) {
      this.initSession(sessionId);
    }

    const buffer = Buffer.from(audioData, 'base64');
    const frameSamples = Math.floor((sampleRate * config!.frameDurationMs) / 1000);
    const frameBytes = frameSamples * 2; // 16-bit = 2 bytes per sample
    const results: VadFrameResult[] = [];

    for (let offset = 0; offset + frameBytes <= buffer.length; offset += frameBytes) {
      const frameBuffer = buffer.slice(offset, offset + frameBytes);
      const frameBase64 = frameBuffer.toString('base64');
      results.push(this.processFrame(sessionId, frameBase64));
    }

    return results;
  }
}
