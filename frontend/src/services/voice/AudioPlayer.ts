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
import { Platform } from 'react-native';

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
    // Clear queue
    this.queue = [];
    this.isProcessingQueue = false;

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
    this.callbacks.onPlaybackStart?.();
    this.updateState('playing');

    while (this.queue.length > 0) {
      const chunk = this.queue.shift();
      if (!chunk) break;

      await this.playChunk(chunk.data);

      // If this was the last chunk and it's complete, we're done
      if (chunk.isComplete && this.queue.length === 0) {
        break;
      }
    }

    this.isProcessingQueue = false;
    this.updateState('idle');
    this.callbacks.onPlaybackEnd?.();
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
   */
  private createAudioUri(base64Data: string): string {
    // Determine MIME type based on platform
    const mimeType = Platform.OS === 'web' ? 'audio/webm' : 'audio/wav';

    // Check if already has data URI prefix
    if (base64Data.startsWith('data:')) {
      return base64Data;
    }

    return `data:${mimeType};base64,${base64Data}`;
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
