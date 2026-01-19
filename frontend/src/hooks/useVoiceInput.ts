/**
 * useVoiceInput Hook - Agentic Mobile Map
 *
 * Hold-to-talk speech-to-text using @react-native-voice/voice.
 * start() on press, stop() on release; onSpeechResults delivers the transcript
 * to onResult. Handles permissions, errors, and cleanup.
 */

import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import Voice from '@react-native-voice/voice';

export interface UseVoiceInputOptions {
  onResult: (transcript: string) => void;
  onError?: (error: string) => void;
  onPermissionDenied?: () => void;
  locale?: string;
}

export interface UseVoiceInputResult {
  start: () => Promise<void>;
  stop: () => Promise<void>;
}

const DEFAULT_LOCALE = 'en-US';
const PERMISSION_ERROR = /permission|denied|unauthorized|access/i;

export function useVoiceInput({
  onResult,
  onError,
  onPermissionDenied,
  locale = DEFAULT_LOCALE,
}: UseVoiceInputOptions): UseVoiceInputResult {
  const latestOnResult = useRef(onResult);
  const latestOnError = useRef(onError);
  const latestOnPermissionDenied = useRef(onPermissionDenied);
  const expectingResultRef = useRef(false);
  const hasErrorRef = useRef(false);

  latestOnResult.current = onResult;
  latestOnError.current = onError;
  latestOnPermissionDenied.current = onPermissionDenied;

  const start = useCallback(async () => {
    hasErrorRef.current = false;
    if (Platform.OS === 'web') {
      latestOnError.current?.('Voice input is not supported on web.');
      return;
    }
    try {
      const available = await Voice.isAvailable();
      if (!available) {
        latestOnError.current?.('Voice not supported.');
        return;
      }
    } catch (e) {
      latestOnError.current?.(e instanceof Error ? e.message : 'Voice not supported.');
      return;
    }

    try {
      await Voice.start(locale);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (PERMISSION_ERROR.test(msg)) {
        latestOnPermissionDenied.current?.();
      }
      latestOnError.current?.(msg);
    }
  }, [locale]);

  const stop = useCallback(async () => {
    if (Platform.OS === 'web') return;
    expectingResultRef.current = true;
    try {
      await Voice.stop();
    } catch (err) {
      expectingResultRef.current = false;
      latestOnError.current?.(err instanceof Error ? err.message : 'Failed to stop.');
    }
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web') return;

    Voice.onSpeechResults = (e: { value?: string[] }) => {
      if (hasErrorRef.current) return;
      hasErrorRef.current = false;
      if (!expectingResultRef.current) return;
      expectingResultRef.current = false;
      const t = e?.value?.[0] ?? '';
      latestOnResult.current?.(t);
    };

    Voice.onSpeechError = (e: { error?: string | { message?: string; code?: string } }) => {
      hasErrorRef.current = true;
      const raw = e?.error;
      const msg = typeof raw === 'string' ? raw : raw?.message ?? raw?.code ?? 'Speech recognition error';
      if (PERMISSION_ERROR.test(msg)) {
        latestOnPermissionDenied.current?.();
      }
      latestOnError.current?.(msg);
    };

    return () => {
      Voice.onSpeechResults = () => {};
      Voice.onSpeechError = () => {};
      Voice.destroy().then(() => Voice.removeAllListeners()).catch(() => {});
    };
  }, []);

  return { start, stop };
}
