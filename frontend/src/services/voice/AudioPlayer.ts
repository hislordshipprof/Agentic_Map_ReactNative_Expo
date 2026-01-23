/**
 * AudioPlayer - TTS audio playback service using expo-av
 *
 * Handles playback of TTS audio received from the backend.
 * Supports:
 * - Queued playback (chunks arrive sequentially)
 * - Immediate interrupt (for user speaking during TTS)
 * - Playback state tracking
 */

import { Audio, AVPlaybackStatus } from 'expo-av';

/**
 * Playback state
 */
export type PlaybackState = 'idle' | 'playing' | 'paused' | 'loading';

/**
 * Player callbacks
 */
export interface AudioPlayerCallbacks {
  onPlaybackStart?: () => void;
  onPlaybackEnd?: () => void;
  onPlaybackError?: (error: Error) => void;
  onStateChange?: (state: PlaybackState) => void;
}

/**
 * Audio chunk in queue
 */
interface AudioChunk {
  data: string; // Base64 encoded audio
  isComplete: boolean;
}

/**
 * AudioPlayer class
 */
export class AudioPlayer {
  private sound: Audio.Sound | null = null;
  private queue: AudioChunk[] = [];
  private callbacks: AudioPlayerCallbacks;
  private state: PlaybackState = 'idle';
  private isPlaying = false;
  private isProcessingQueue = false;
  private stopRequested = false; // Flag to signal stop during queue processing

  constructor(callbacks: AudioPlayerCallbacks = {}) {
    this.callbacks = callbacks;
  }

  /**
   * Initialize audio mode for playback
   */
  async initialize(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
    } catch (error) {
      this.callbacks.onPlaybackError?.(
        error instanceof Error ? error : new Error('Failed to initialize audio')
      );
    }
  }

  /**
   * Enqueue audio chunk for playback
   */
  enqueue(base64Data: string, isComplete = false): void {
    this.queue.push({ data: base64Data, isComplete });

    // Start processing if not already
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Play base64 audio directly (for single audio response)
   */
  async play(base64Data: string): Promise<void> {
    // Clear queue and stop current playback
    await this.stop();

    // Enqueue and play
    this.enqueue(base64Data, true);
  }

  /**
   * Stop playback immediately (for interrupt)
   */
  async stop(): Promise<void> {
    // Signal stop to any running queue processor
    this.stopRequested = true;

    // Clear queue
    this.queue = [];

    // Stop current sound
    if (this.sound) {
      try {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
      } catch {
        // Ignore stop errors
      }
      this.sound = null;
    }

    this.isPlaying = false;
    this.isProcessingQueue = false;
    this.updateState('idle');
  }

  /**
   * Pause playback
   */
  async pause(): Promise<void> {
    if (this.sound && this.isPlaying) {
      try {
        await this.sound.pauseAsync();
        this.updateState('paused');
      } catch (error) {
        this.callbacks.onPlaybackError?.(
          error instanceof Error ? error : new Error('Failed to pause')
        );
      }
    }
  }

  /**
   * Resume playback
   */
  async resume(): Promise<void> {
    if (this.sound && this.state === 'paused') {
      try {
        await this.sound.playAsync();
        this.updateState('playing');
      } catch (error) {
        this.callbacks.onPlaybackError?.(
          error instanceof Error ? error : new Error('Failed to resume')
        );
      }
    }
  }

  /**
   * Get current playback state
   */
  getState(): PlaybackState {
    return this.state;
  }

  /**
   * Check if currently playing
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Update callbacks
   */
  setCallbacks(callbacks: Partial<AudioPlayerCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Process the audio queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.queue.length === 0) {
      return;
    }

    this.isProcessingQueue = true;
    this.stopRequested = false; // Reset stop flag when starting
    this.callbacks.onPlaybackStart?.();
    this.updateState('playing');

    while (this.queue.length > 0) {
      // Check if stop was requested (fixes race condition)
      if (this.stopRequested) {
        break;
      }

      const chunk = this.queue.shift();
      if (!chunk) break;

      await this.playChunk(chunk.data);

      // Check again after async operation
      if (this.stopRequested) {
        break;
      }

      // If this was the last chunk and it's complete, we're done
      if (chunk.isComplete && this.queue.length === 0) {
        break;
      }
    }

    // Only update state if we weren't stopped externally
    if (!this.stopRequested) {
      this.isProcessingQueue = false;
      this.updateState('idle');
      this.callbacks.onPlaybackEnd?.();
    }
  }

  /**
   * Play a single audio chunk
   */
  private async playChunk(base64Data: string): Promise<void> {
    return new Promise(async (resolve) => {
      try {
        // Create data URI from base64
        const uri = this.createAudioUri(base64Data);

        // Unload previous sound if exists
        if (this.sound) {
          await this.sound.unloadAsync();
        }

        // Create and load new sound
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          { shouldPlay: true },
          this.onPlaybackStatusUpdate.bind(this, resolve)
        );

        this.sound = sound;
        this.isPlaying = true;

      } catch (error) {
        this.callbacks.onPlaybackError?.(
          error instanceof Error ? error : new Error('Failed to play audio chunk')
        );
        resolve();
      }
    });
  }

  /**
   * Handle playback status updates
   */
  private onPlaybackStatusUpdate(
    resolve: () => void,
    status: AVPlaybackStatus
  ): void {
    if (!status.isLoaded) {
      return;
    }

    // Check if playback finished
    if (status.didJustFinish) {
      this.isPlaying = false;
      resolve();
    }
  }

  /**
   * Create audio URI from base64 data
   * Adds WAV header if raw PCM data is detected
   */
  private createAudioUri(base64Data: string): string {
    // Check if already has data URI prefix
    if (base64Data.startsWith('data:')) {
      return base64Data;
    }

    // Decode to check for WAV header
    const binaryString = atob(base64Data);

    // Check if already has WAV header (starts with "RIFF")
    const hasWavHeader = binaryString.length >= 4 &&
      binaryString.charCodeAt(0) === 0x52 && // R
      binaryString.charCodeAt(1) === 0x49 && // I
      binaryString.charCodeAt(2) === 0x46 && // F
      binaryString.charCodeAt(3) === 0x46;   // F

    if (hasWavHeader) {
      return `data:audio/wav;base64,${base64Data}`;
    }

    // Add WAV header for raw PCM data
    const wavBase64 = this.addWavHeader(binaryString, 24000); // TTS uses 24kHz
    return `data:audio/wav;base64,${wavBase64}`;
  }

  /**
   * Add WAV header to raw PCM data
   */
  private addWavHeader(pcmData: string, sampleRate: number): string {
    const dataLength = pcmData.length;
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // "RIFF" chunk
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, 36 + dataLength, true); // file size - 8
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // subchunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, 1, true); // num channels (mono)
    view.setUint32(24, sampleRate, true); // sample rate
    view.setUint32(28, sampleRate * 2, true); // byte rate
    view.setUint16(32, 2, true); // block align
    view.setUint16(34, 16, true); // bits per sample

    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataLength, true); // data size

    // Combine header and PCM data
    const headerBytes = new Uint8Array(header);
    let binary = '';
    for (let i = 0; i < headerBytes.length; i++) {
      binary += String.fromCharCode(headerBytes[i]);
    }
    binary += pcmData;

    return btoa(binary);
  }

  /**
   * Update state and notify callback
   */
  private updateState(newState: PlaybackState): void {
    if (this.state !== newState) {
      this.state = newState;
      this.callbacks.onStateChange?.(newState);
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.stop();
  }
}

/**
 * Singleton instance
 */
let audioPlayerInstance: AudioPlayer | null = null;

export function getAudioPlayer(): AudioPlayer {
  if (!audioPlayerInstance) {
    audioPlayerInstance = new AudioPlayer();
  }
  return audioPlayerInstance;
}

export function resetAudioPlayer(): void {
  if (audioPlayerInstance) {
    audioPlayerInstance.cleanup();
    audioPlayerInstance = null;
  }
}
