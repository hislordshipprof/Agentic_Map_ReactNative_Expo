/**
 * AudioRecorder - Microphone capture service using expo-av
 *
 * Captures audio from the device microphone in 100ms chunks,
 * converts to base64, and provides them via callback for
 * streaming to the backend voice gateway.
 *
 * Audio Format: PCM 16-bit, 16kHz mono (matches backend STT config)
 */

import { Audio } from 'expo-av';
import { Platform } from 'react-native';

/**
 * Recording configuration
 */
export interface RecordingConfig {
  sampleRate?: number;
  channels?: number;
  bitRate?: number;
  chunkDurationMs?: number;
}

/**
 * Audio level callback data
 */
export interface AudioLevelData {
  level: number; // 0-1 normalized audio level
  timestamp: number;
}

/**
 * Recorder callbacks
 */
export interface AudioRecorderCallbacks {
  onChunk?: (base64Data: string) => void;
  onAudioLevel?: (data: AudioLevelData) => void;
  onError?: (error: Error) => void;
  onPermissionDenied?: () => void;
}

/**
 * Default recording configuration
 */
const DEFAULT_CONFIG: Required<RecordingConfig> = {
  sampleRate: 16000,
  channels: 1,
  bitRate: 256000,
  chunkDurationMs: 100,
};

/**
 * Audio recording preset for voice
 */
const RECORDING_OPTIONS: Audio.RecordingOptions = {
  isMeteringEnabled: true,
  android: {
    extension: '.wav',
    outputFormat: Audio.AndroidOutputFormat.DEFAULT,
    audioEncoder: Audio.AndroidAudioEncoder.DEFAULT,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
  },
  ios: {
    extension: '.wav',
    outputFormat: Audio.IOSOutputFormat.LINEARPCM,
    audioQuality: Audio.IOSAudioQuality.HIGH,
    sampleRate: 16000,
    numberOfChannels: 1,
    bitRate: 256000,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: {
    mimeType: 'audio/webm',
    bitsPerSecond: 128000,
  },
};

/**
 * AudioRecorder class
 */
export class AudioRecorder {
  private recording: Audio.Recording | null = null;
  private callbacks: AudioRecorderCallbacks;
  private config: Required<RecordingConfig>;
  private isRecording = false;
  private meteringInterval: NodeJS.Timeout | null = null;
  private permissionGranted = false;

  constructor(callbacks: AudioRecorderCallbacks = {}, config?: RecordingConfig) {
    this.callbacks = callbacks;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Request microphone permission
   */
  async requestPermission(): Promise<boolean> {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      this.permissionGranted = status === 'granted';

      if (!this.permissionGranted) {
        this.callbacks.onPermissionDenied?.();
      }

      return this.permissionGranted;
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error : new Error('Permission request failed'));
      return false;
    }
  }

  /**
   * Check if permission is granted
   */
  async hasPermission(): Promise<boolean> {
    const { status } = await Audio.getPermissionsAsync();
    this.permissionGranted = status === 'granted';
    return this.permissionGranted;
  }

  /**
   * Start recording
   */
  async start(): Promise<void> {
    if (this.isRecording) {
      return;
    }

    // Check permission
    if (!this.permissionGranted) {
      const granted = await this.requestPermission();
      if (!granted) {
        return;
      }
    }

    try {
      // Configure audio mode for recording
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      // Create and prepare recording
      const { recording } = await Audio.Recording.createAsync(
        RECORDING_OPTIONS,
        this.onRecordingStatusUpdate.bind(this),
        this.config.chunkDurationMs
      );

      this.recording = recording;
      this.isRecording = true;

      // Start metering for audio levels
      this.startMetering();

    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error : new Error('Failed to start recording'));
      this.isRecording = false;
    }
  }

  /**
   * Stop recording
   */
  async stop(): Promise<string | null> {
    if (!this.isRecording || !this.recording) {
      return null;
    }

    this.stopMetering();

    try {
      await this.recording.stopAndUnloadAsync();

      // Get the recording URI
      const uri = this.recording.getURI();

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      this.recording = null;
      this.isRecording = false;

      return uri;
    } catch (error) {
      this.callbacks.onError?.(error instanceof Error ? error : new Error('Failed to stop recording'));
      this.isRecording = false;
      return null;
    }
  }

  /**
   * Check if currently recording
   */
  getIsRecording(): boolean {
    return this.isRecording;
  }

  /**
   * Update callbacks
   */
  setCallbacks(callbacks: Partial<AudioRecorderCallbacks>): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Handle recording status updates
   */
  private onRecordingStatusUpdate(status: Audio.RecordingStatus): void {
    if (!status.isRecording) {
      return;
    }

    // Get metering data for audio level visualization
    if (status.metering !== undefined) {
      // Convert dB to 0-1 scale (dB typically ranges from -160 to 0)
      const normalizedLevel = Math.max(0, Math.min(1, (status.metering + 60) / 60));

      this.callbacks.onAudioLevel?.({
        level: normalizedLevel,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Start metering interval for continuous audio level updates
   */
  private startMetering(): void {
    if (this.meteringInterval) {
      return;
    }

    this.meteringInterval = setInterval(async () => {
      if (!this.recording || !this.isRecording) {
        return;
      }

      try {
        const status = await this.recording.getStatusAsync();
        if (status.isRecording && status.metering !== undefined) {
          const normalizedLevel = Math.max(0, Math.min(1, (status.metering + 60) / 60));

          this.callbacks.onAudioLevel?.({
            level: normalizedLevel,
            timestamp: Date.now(),
          });
        }
      } catch {
        // Ignore metering errors
      }
    }, 50); // Update 20 times per second
  }

  /**
   * Stop metering interval
   */
  private stopMetering(): void {
    if (this.meteringInterval) {
      clearInterval(this.meteringInterval);
      this.meteringInterval = null;
    }
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    this.stopMetering();

    if (this.recording) {
      try {
        await this.recording.stopAndUnloadAsync();
      } catch {
        // Ignore cleanup errors
      }
      this.recording = null;
    }

    this.isRecording = false;
  }
}

/**
 * Utility function to convert audio file URI to base64
 * Note: This reads the entire file - for streaming, we need chunked approach
 */
export async function audioFileToBase64(uri: string): Promise<string> {
  if (Platform.OS === 'web') {
    // Web: Fetch and convert to base64
    const response = await fetch(uri);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Remove data URL prefix
        resolve(base64.split(',')[1] || base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  // Native: Use expo-file-system (would need to be imported)
  // For now, return empty string - actual implementation would use FileSystem.readAsStringAsync
  return '';
}

/**
 * Singleton instance
 */
let audioRecorderInstance: AudioRecorder | null = null;

export function getAudioRecorder(): AudioRecorder {
  if (!audioRecorderInstance) {
    audioRecorderInstance = new AudioRecorder();
  }
  return audioRecorderInstance;
}

export function resetAudioRecorder(): void {
  if (audioRecorderInstance) {
    audioRecorderInstance.cleanup();
    audioRecorderInstance = null;
  }
}
