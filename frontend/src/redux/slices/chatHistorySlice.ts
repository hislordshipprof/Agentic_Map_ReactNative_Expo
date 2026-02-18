/**
 * Chat History Slice - Agentic Mobile Map
 *
 * Persists conversation sessions so users can review past trips
 * in the History tab and RecentTrips component.
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ChatHistoryState, ChatSession } from '@/types/chatHistory';
import { MAX_SESSIONS } from '@/types/chatHistory';
import type { Message } from '@/components/Conversation';

const initialState: ChatHistoryState = {
  sessions: [],
  activeSessionId: null,
};

function generateSessionId(): string {
  const rand = Math.random().toString(36).substring(2, 8);
  return `session_${Date.now()}_${rand}`;
}

function generateTitle(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= 50) return trimmed;
  return trimmed.substring(0, 47) + '...';
}

const chatHistorySlice = createSlice({
  name: 'chatHistory',
  initialState,
  reducers: {
    /**
     * Create a new session and set it as active.
     * Enforces MAX_SESSIONS cap by dropping the oldest.
     */
    startSession(state, action: PayloadAction<{ mode: 'text' | 'voice' }>) {
      const now = Date.now();
      const session: ChatSession = {
        id: generateSessionId(),
        mode: action.payload.mode,
        title: action.payload.mode === 'voice' ? 'Voice session' : 'Text session',
        messages: [],
        createdAt: now,
        updatedAt: now,
      };
      state.sessions.unshift(session);
      state.activeSessionId = session.id;

      // Enforce cap
      if (state.sessions.length > MAX_SESSIONS) {
        state.sessions = state.sessions.slice(0, MAX_SESSIONS);
      }
    },

    /**
     * Push a message into the specified session.
     * Auto-generates title from the first user message.
     */
    addMessageToSession(
      state,
      action: PayloadAction<{ sessionId: string; message: Message }>,
    ) {
      const { sessionId, message } = action.payload;
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) return;

      session.messages.push(message);
      session.updatedAt = Date.now();

      // Auto-title from first user message
      const hasDefaultTitle =
        session.title === 'Voice session' || session.title === 'Text session';
      if (hasDefaultTitle && message.sender === 'user') {
        session.title = generateTitle(message.text);
      }
    },

    /**
     * Set route metadata on a session and update the title to reflect destination/stops.
     */
    updateSessionMetadata(
      state,
      action: PayloadAction<{
        sessionId: string;
        destination?: string;
        stops?: string[];
        routeId?: string;
        totalTimeMin?: number;
      }>,
    ) {
      const { sessionId, destination, stops, routeId, totalTimeMin } = action.payload;
      const session = state.sessions.find((s) => s.id === sessionId);
      if (!session) return;

      if (destination) session.destination = destination;
      if (stops) session.stops = stops;
      if (routeId) session.routeId = routeId;
      if (totalTimeMin !== undefined) session.totalTimeMin = totalTimeMin;
      session.updatedAt = Date.now();

      // Update title with route info
      if (destination) {
        const stopText =
          stops && stops.length > 0 ? ` via ${stops.join(', ')}` : '';
        session.title = generateTitle(`${destination}${stopText}`);
      }
    },

    /**
     * Clear the active session. Remove it if it has zero messages.
     */
    endSession(state) {
      if (state.activeSessionId) {
        const idx = state.sessions.findIndex(
          (s) => s.id === state.activeSessionId,
        );
        if (idx !== -1 && state.sessions[idx].messages.length === 0) {
          state.sessions.splice(idx, 1);
        }
      }
      state.activeSessionId = null;
    },

    /** Remove a session by ID */
    deleteSession(state, action: PayloadAction<string>) {
      state.sessions = state.sessions.filter((s) => s.id !== action.payload);
      if (state.activeSessionId === action.payload) {
        state.activeSessionId = null;
      }
    },

    /** Remove all sessions */
    clearAllSessions(state) {
      state.sessions = [];
      state.activeSessionId = null;
    },
  },
});

export const {
  startSession,
  addMessageToSession,
  updateSessionMetadata,
  endSession,
  deleteSession,
  clearAllSessions,
} = chatHistorySlice.actions;

export type { ChatHistoryState };
export default chatHistorySlice.reducer;
