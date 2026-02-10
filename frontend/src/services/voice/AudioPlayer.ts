/**
 * AudioPlayer - TTS audio playback service using expo-av
 *
 * Handles playback of TTS audio received from the backend.
 * Supports:
 * - Queued playback (chunks arrive sequentially)
 * - Immediate interrupt (for user speaking during TTS)
 * - Playback state tracking
 * - File-based playback for better performance on mobile
 */

import { Audio, AVPlaybackStatus } from 'expo-av';
import * as FileSystem from 'expo-file-system';

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
  sampleRate: number; // Sample rate for this chunk
  encoding: string; // Audio encoding (MP3, LINEAR16, etc.)
  isComplete: boolean;
}

/**
 * Temp file for cleanup tracking
 */
interface TempAudioFile {
  uri: string;
  createdAt: number;
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
  private tempFiles: TempAudioFile[] = []; // Track temp files for cleanup
  private readonly MAX_TEMP_FILES = 5; // Keep last 5 files to avoid rapid cleanup during playback

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
        // Optimize for voice playback
        interruptionModeIOS: 1, // DO_NOT_MIX - gives us audio focus
        interruptionModeAndroid: 1, // DO_NOT_MIX
      });
    } catch (error) {
      this.callbacks.onPlaybackError?.(
        error instanceof Error ? error : new Error('Failed to initialize audio')
      );
    }
  }

  /**
   * Enqueue audio chunk for playback
   * @param base64Data Base64 encoded audio data
   * @param sampleRate Sample rate in Hz (default 24000 for TTS)
   * @param encoding Audio encoding format (default 'MP3')
   * @param isComplete Whether this is the final chunk
   */
  enqueue(base64Data: string, sampleRate = 24000, encoding = 'MP3', isComplete = false): void {
    this.queue.push({ data: base64Data, sampleRate, encoding, isComplete });

    // Start processing if not already
    if (!this.isProcessingQueue) {
      this.processQueue();
    }
  }

  /**
   * Play base64 audio directly (for single audio response)
   * @param base64Data Base64 encoded audio data
   * @param sampleRate Sample rate in Hz (default 24000 for TTS)
   * @param encoding Audio encoding format (default 'MP3')
   */
  async play(base64Data: string, sampleRate = 24000, encoding = 'MP3'): Promise<void> {
    // Clear queue and stop current playback
    await this.stop();

    // Enqueue and play
    this.enqueue(base64Data, sampleRate, encoding, true);
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

      await this.playChunk(chunk.data, chunk.sampleRate, chunk.encoding);

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
   * @param base64Data Base64 encoded audio data
   * @param sampleRate Sample rate in Hz for WAV header creation (only for raw PCM)
   * @param encoding Audio encoding format
   */
  private async playChunk(base64Data: string, sampleRate = 24000, encoding = 'MP3'): Promise<void> {
    return new Promise(async (resolve) => {
      try {
        // Create audio file URI for better mobile performance
        const uri = await this.createAudioFileUri(base64Data, sampleRate, encoding);

        // Unload previous sound if exists
        if (this.sound) {
          await this.sound.unloadAsync();
        }

        // Create and load new sound with buffer ahead for smoother playback
        const { sound } = await Audio.Sound.createAsync(
          { uri },
          {
            shouldPlay: true,
            progressUpdateIntervalMillis: 100,
            // Pre-buffer audio for smoother playback
            androidImplementation: 'MediaPlayer',
          },
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
   * Create audio file URI from base64 data
   * Writes to a temp file for better mobile playback performance
   * @param base64Data Base64 encoded audio data
   * @param sampleRate Sample rate in Hz for WAV header (only used for raw PCM)
   * @param encoding Audio encoding format (default 'MP3')
   */
  private async createAudioFileUri(
    base64Data: string,
    sampleRate = 24000,
    encoding = 'MP3'
  ): Promise<string> {
    // Check if already has data URI prefix - extract base64 part
    let audioBase64 = base64Data;
    if (base64Data.startsWith('data:')) {
      const commaIndex = base64Data.indexOf(',');
      if (commaIndex !== -1) {
        audioBase64 = base64Data.substring(commaIndex + 1);
      }
    }

    // Determine file extension and processing based on encoding
    let finalBase64 = audioBase64;
    let fileExtension = 'mp3';

    // Check audio format by looking at magic bytes
    const binaryString = atob(audioBase64);

    // Check for MP3 (starts with ID3 or 0xFF 0xFB/0xFA/0xF3)
    const isMp3 = (binaryString.length >= 3 && binaryString.substring(0, 3) === 'ID3') ||
      (binaryString.length >= 2 && binaryString.charCodeAt(0) === 0xFF &&
        (binaryString.charCodeAt(1) & 0xE0) === 0xE0);

    // Check for WAV (RIFF header)
    const isWav = binaryString.length >= 4 &&
      binaryString.charCodeAt(0) === 0x52 && // R
      binaryString.charCodeAt(1) === 0x49 && // I
      binaryString.charCodeAt(2) === 0x46 && // F
      binaryString.charCodeAt(3) === 0x46;   // F

    // Check for OGG (OggS header)
    const isOgg = binaryString.length >= 4 &&
      binaryString.charCodeAt(0) === 0x4F && // O
      binaryString.charCodeAt(1) === 0x67 && // g
      binaryString.charCodeAt(2) === 0x67 && // g
      binaryString.charCodeAt(3) === 0x53;   // S

    if (isMp3) {
      fileExtension = 'mp3';
      // MP3 is self-contained, no processing needed
    } else if (isWav) {
      fileExtension = 'wav';
      // WAV is self-contained, no processing needed
    } else if (isOgg) {
      fileExtension = 'ogg';
      // OGG is self-contained, no processing needed
    } else if (encoding === 'LINEAR16' || encoding === 'pcm') {
      // Raw PCM needs WAV header
      fileExtension = 'wav';
      finalBase64 = this.addWavHeader(binaryString, sampleRate);
    } else {
      // Default to MP3 extension for unknown formats
      fileExtension = 'mp3';
    }

    // Write to temp file for better playback performance
    const filename = `tts_audio_${Date.now()}.${fileExtension}`;
    const fileUri = `${FileSystem.cacheDirectory}${filename}`;

    await FileSystem.writeAsStringAsync(fileUri, finalBase64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // Track temp file for cleanup
    this.tempFiles.push({ uri: fileUri, createdAt: Date.now() });

    // Clean up old temp files (keep last MAX_TEMP_FILES)
    this.cleanupOldTempFiles();

    return fileUri;
  }

  /**
   * Clean up old temporary audio files
   */
  private async cleanupOldTempFiles(): Promise<void> {
    while (this.tempFiles.length > this.MAX_TEMP_FILES) {
      const oldFile = this.tempFiles.shift();
      if (oldFile) {
        try {
          await FileSystem.deleteAsync(oldFile.uri, { idempotent: true });
        } catch {
          // Ignore deletion errors - file may not exist
        }
      }
    }
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

    // Clean up all temp files
    for (const file of this.tempFiles) {
      try {
        await FileSystem.deleteAsync(file.uri, { idempotent: true });
      } catch {
        // Ignore deletion errors
      }
    }
    this.tempFiles = [];
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
