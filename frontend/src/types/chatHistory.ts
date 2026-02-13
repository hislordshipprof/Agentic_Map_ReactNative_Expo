/**
 * Chat History Types - Agentic Mobile Map
 *
 * Type definitions for session-based chat history persistence.
 * Each text-chat or voice-assistant opening creates a new session.
 */

import type { Message } from '@/components/Conversation';

/**
 * A discrete chat session (one text-chat or voice-assistant opening)
 */
export interface ChatSession {
  /** Unique session ID, e.g. `session_${Date.now()}_${random}` */
  id: string;
  /** Whether this was a text or voice session */
  mode: 'text' | 'voice';
  /** Auto-generated title from destination or first user message */
  title: string;
  /** All messages in this session */
  messages: Message[];
  /** Epoch ms when session was created */
  createdAt: number;
  /** Epoch ms when session was last updated */
  updatedAt: number;
  /** Resolved destination name */
  destination?: string;
  /** Stop names along the route */
  stops?: string[];
  /** Associated route ID from backend */
  routeId?: string;
  /** Total estimated trip time in minutes */
  totalTimeMin?: number;
}

/**
 * Redux state for chat history
 */
export interface ChatHistoryState {
  /** All sessions, newest-first */
  sessions: ChatSession[];
  /** Currently active session ID (null when no screen is open) */
  activeSessionId: string | null;
}

/** Maximum number of persisted sessions */
export const MAX_SESSIONS = 50;
