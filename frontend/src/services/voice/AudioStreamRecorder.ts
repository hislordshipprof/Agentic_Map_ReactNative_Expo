/**
 * AudioStreamRecorder - Real-time audio streaming service using expo-audio-studio
 *
 * Captures audio from the device microphone in 100ms chunks and streams them
 * in real-time via callbacks for WebSocket transmission to the backend.
 *
 * Audio Format: PCM 16-bit, 16kHz mono (matches backend STT config)
 *
 * This replaces the old AudioRecorder.ts which used expo-av (no real-time streaming).
 */

import {
  useAudioRecorder,
  type RecordingConfig,
  type AudioDataEvent,
  type AudioAnalysis,
  ExpoAudioStreamModule,
} from '@siteed/expo-audio-studio';
import { useCallback, useRef, useEffect } from 'react';

/**
 * Audio streaming configuration
 */
export interface AudioStreamConfig {
  /** Sample rate in Hz (default: 16000 for STT) */
  sampleRate?: number;
  /** Number of channels (default: 1 for mono) */
  channels?: number;
  /** Encoding format (default: 'pcm_16bit') */
  encoding?: 'pcm_8bit' | 'pcm_16bit' | 'pcm_32bit';
  /** Interval in ms between audio chunk emissions (default: 100) */
  intervalMs?: number;
}

/**
 * Callbacks for audio streaming events
 */
export interface AudioStreamCallbacks {
  /** Called with each audio chunk (base64 encoded) */
  onAudioChunk: (base64Data: string, sequenceNumber: number) => void;
  /** Called with audio level for visualization (0-1) */
  onAudioLevel: (level: number) => void;
  /** Called when recording starts */
  onRecordingStart: () => void;
  /** Called when recording stops */
  onRecordingStop: () => void;
  /** Called on error */
  onError: (error: Error) => void;
  /** Called when microphone permission is denied */
  onPermissionDenied: () => void;
}

/**
 * Default configuration matching backend STT requirements
 */
const DEFAULT_CONFIG: Required<AudioStreamConfig> = {
  sampleRate: 16000,
  channels: 1,
  encoding: 'pcm_16bit',
  intervalMs: 100,
};

/**
 * Convert ArrayBuffer to base64 string
 */
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  // Use btoa for base64 encoding (works in React Native)
  return btoa(binary);
}

/**
 * Hook result for audio streaming
 */
export interface UseAudioStreamResult {
  /** Start audio streaming */
  startStreaming: () => Promise<boolean>;
  /** Stop audio streaming */
  stopStreaming: () => Promise<void>;
  /** Check if currently streaming */
  isStreaming: boolean;
  /** Check if permission is granted */
  hasPermission: boolean;
  /** Request microphone permission */
  requestPermission: () => Promise<boolean>;
}

/**
 * useAudioStream hook - Real-time audio streaming for voice mode
 *
 * Provides real-time 100ms audio chunks via the onAudioChunk callback.
 * Audio is encoded as PCM 16-bit, 16kHz mono and sent as base64.
 */
export function useAudioStream(
  callbacks: Partial<AudioStreamCallbacks>,
  config?: AudioStreamConfig
): UseAudioStreamResult {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const sequenceNumberRef = useRef(0);
  const callbacksRef = useRef(callbacks);
  const hasPermissionRef = useRef(false);

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = callbacks;
  }, [callbacks]);

  // Use the expo-audio-studio hook
  const {
    startRecording,
    stopRecording,
    isRecording,
  } = useAudioRecorder({
    logger: __DEV__ ? console : undefined,
  });

  /**
   * Request microphone permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      const { status } = await ExpoAudioStreamModule.requestPermissionsAsync();
      hasPermissionRef.current = status === 'granted';

      if (!hasPermissionRef.current) {
        callbacksRef.current.onPermissionDenied?.();
      }

      return hasPermissionRef.current;
    } catch (error) {
      callbacksRef.current.onError?.(
        error instanceof Error ? error : new Error('Permission request failed')
      );
      return false;
    }
  }, []);

  /**
   * Handle audio stream data
   * Sends audio data to backend (WAV header stripping handled on backend)
   */
  const handleAudioStream = useCallback(async (event: AudioDataEvent) => {
    try {
      let base64Data: string;
      let dataType = 'unknown';

      // Convert data to base64 - backend handles WAV header stripping
      if (typeof event.data === 'string') {
        // Check if this looks like base64 (no file paths or other string data)
        const isLikelyBase64 = /^[A-Za-z0-9+/]+=*$/.test(event.data.slice(0, 100));
        if (isLikelyBase64) {
          // Already base64 encoded - pass through
          base64Data = event.data;
          dataType = 'string-base64';
        } else {
          // Not base64 - might be a file path or error, skip
          console.warn('[AudioStream] Received non-base64 string data:', event.data.substring(0, 50));
          return;
        }
      } else if (event.data instanceof ArrayBuffer) {
        base64Data = arrayBufferToBase64(event.data);
        dataType = 'ArrayBuffer';
      } else if (event.data instanceof Uint8Array) {
        base64Data = arrayBufferToBase64(
          event.data.buffer.slice(
            event.data.byteOffset,
            event.data.byteOffset + event.data.byteLength
          )
        );
        dataType = 'Uint8Array';
      } else if (event.data instanceof Float32Array) {
        // Float32Array needs conversion to Int16 for LINEAR16 format
        const int16Data = new Int16Array(event.data.length);
        for (let i = 0; i < event.data.length; i++) {
          // Convert float [-1, 1] to int16 [-32768, 32767]
          const s = Math.max(-1, Math.min(1, event.data[i]));
          int16Data[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        base64Data = arrayBufferToBase64(int16Data.buffer);
        dataType = 'Float32Array';
      } else {
        // Fallback: try to use as-is
        base64Data = String(event.data);
        dataType = 'fallback';
      }

      // Only send if we have data
      if (base64Data && base64Data.length > 0) {
        // Increment sequence number and send chunk
        sequenceNumberRef.current += 1;

        // Log first few chunks for debugging
        if (sequenceNumberRef.current <= 3) {
          console.log(`[AudioStream] Chunk #${sequenceNumberRef.current}: type=${dataType}, base64Length=${base64Data.length}, first20chars=${base64Data.substring(0, 20)}`);
        }

        callbacksRef.current.onAudioChunk?.(base64Data, sequenceNumberRef.current);
      }
    } catch (error) {
      callbacksRef.current.onError?.(
        error instanceof Error ? error : new Error('Failed to process audio chunk')
      );
    }
  }, []);

  /**
   * Handle audio analysis data (for audio level)
   */
  const handleAudioAnalysis = useCallback(async (data: AudioAnalysis) => {
    // Extract audio level from analysis data
    // Use amplitudeRange for visualization
    if (data.amplitudeRange) {
      const { max } = data.amplitudeRange;
      // Normalize to 0-1 range
      const level = Math.min(1, Math.max(0, Math.abs(max)));
      callbacksRef.current.onAudioLevel?.(level);
    } else if ('rms' in data && typeof (data as { rms?: number }).rms === 'number') {
      // RMS is already somewhat normalized, but may need adjustment
      const rms = (data as { rms: number }).rms;
      const level = Math.min(1, Math.max(0, rms * 2));
      callbacksRef.current.onAudioLevel?.(level);
    }
  }, []);

  /**
   * Start audio streaming
   */
  const startStreaming = useCallback(async (): Promise<boolean> => {
    console.log('[AudioStreamRecorder] startStreaming called');

    // Check permission first
    if (!hasPermissionRef.current) {
      console.log('[AudioStreamRecorder] Requesting permission...');
      const granted = await requestPermission();
      if (!granted) {
        console.log('[AudioStreamRecorder] Permission denied');
        return false;
      }
      console.log('[AudioStreamRecorder] Permission granted');
    }

    try {
      // Reset sequence number
      sequenceNumberRef.current = 0;
      console.log('[AudioStreamRecorder] Starting recording with config:', mergedConfig);

      // Configure recording for streaming
      // Cast sample rate and channels to the expected literal types
      // Note: expo-audio-studio requires primary output to be enabled for streaming to work
      const recordingConfig: RecordingConfig = {
        sampleRate: mergedConfig.sampleRate as 16000 | 44100 | 48000,
        channels: mergedConfig.channels as 1 | 2,
        encoding: mergedConfig.encoding,
        interval: mergedConfig.intervalMs,
        enableProcessing: true, // Enable for audio level analysis
        keepAwake: true, // Keep device awake during recording

        // Enable primary output - required for streaming to work
        // The WAV header will be stripped in handleAudioStream
        output: {
          primary: {
            enabled: true, // Must be enabled for expo-audio-studio streaming
          },
          compressed: {
            enabled: false,
          },
        },

        // Real-time audio streaming callback
        onAudioStream: handleAudioStream,

        // Audio analysis for level visualization
        onAudioAnalysis: handleAudioAnalysis,

        // Handle interruptions
        onRecordingInterrupted: (event) => {
          console.log('[AudioStreamRecorder] Recording interrupted:', event.reason);
          callbacksRef.current.onRecordingStop?.();
        },
      };

      await startRecording(recordingConfig);
      console.log('[AudioStreamRecorder] Recording started successfully');
      callbacksRef.current.onRecordingStart?.();
      return true;
    } catch (error) {
      callbacksRef.current.onError?.(
        error instanceof Error ? error : new Error('Failed to start streaming')
      );
      return false;
    }
  }, [
    mergedConfig,
    requestPermission,
    handleAudioStream,
    handleAudioAnalysis,
    startRecording,
  ]);

  /**
   * Stop audio streaming
   */
  const stopStreaming = useCallback(async (): Promise<void> => {
    try {
      await stopRecording();
      callbacksRef.current.onRecordingStop?.();
    } catch (error) {
      callbacksRef.current.onError?.(
        error instanceof Error ? error : new Error('Failed to stop streaming')
      );
    }
  }, [stopRecording]);

  return {
    startStreaming,
    stopStreaming,
    isStreaming: isRecording,
    hasPermission: hasPermissionRef.current,
    requestPermission,
  };
}

export default useAudioStream;
