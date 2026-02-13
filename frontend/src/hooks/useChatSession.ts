/**
 * useChatSession Hook - Agentic Mobile Map
 *
 * Manages a chat session lifecycle. On mount, starts a new session
 * (or reuses an existing active session of the same mode).
 * On unmount, ends the session (removes it if empty).
 */

import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  startSession,
  addMessageToSession,
  updateSessionMetadata,
  endSession,
} from '@/redux/slices/chatHistorySlice';
import type { Message } from '@/components/Conversation';

interface ChatSessionResult {
  /** Current session ID (null before mount completes) */
  sessionId: string | null;
  /** Messages in the active session */
  messages: Message[];
  /** Add a message to the session and return it */
  addMessage: (sender: 'user' | 'system', text: string) => Message;
  /** Set route metadata on the session */
  updateRouteMetadata: (meta: {
    destination?: string;
    stops?: string[];
    routeId?: string;
    totalTimeMin?: number;
  }) => void;
  /** Manually end the session */
  endCurrentSession: () => void;
}

export function useChatSession(mode: 'text' | 'voice'): ChatSessionResult {
  const dispatch = useAppDispatch();
  const startedRef = useRef(false);

  const activeSessionId = useAppSelector(
    (state) => state.chatHistory.activeSessionId,
  );

  const messages = useAppSelector((state) => {
    if (!state.chatHistory.activeSessionId) return [];
    const session = state.chatHistory.sessions.find(
      (s) => s.id === state.chatHistory.activeSessionId,
    );
    return session?.messages ?? [];
  });

  // Start session on mount (with StrictMode guard)
  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    dispatch(startSession({ mode }));

    return () => {
      dispatch(endSession());
      startedRef.current = false;
    };
  }, [dispatch, mode]);

  const addMessage = useCallback(
    (sender: 'user' | 'system', text: string): Message => {
      const message: Message = {
        id: `${sender}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        sender,
        text,
        timestamp: Date.now(),
      };
      if (activeSessionId) {
        dispatch(
          addMessageToSession({ sessionId: activeSessionId, message }),
        );
      }
      return message;
    },
    [dispatch, activeSessionId],
  );

  const updateRouteMetadataFn = useCallback(
    (meta: {
      destination?: string;
      stops?: string[];
      routeId?: string;
      totalTimeMin?: number;
    }) => {
      if (activeSessionId) {
        dispatch(updateSessionMetadata({ sessionId: activeSessionId, ...meta }));
      }
    },
    [dispatch, activeSessionId],
  );

  const endCurrentSession = useCallback(() => {
    dispatch(endSession());
  }, [dispatch]);

  return {
    sessionId: activeSessionId,
    messages,
    addMessage,
    updateRouteMetadata: updateRouteMetadataFn,
    endCurrentSession,
  };
}

export type { ChatSessionResult };
