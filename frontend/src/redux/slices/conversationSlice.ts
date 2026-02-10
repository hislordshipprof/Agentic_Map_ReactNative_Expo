/**
 * Conversation Slice - Redux state management for chat UI
 *
 * Per requirements-frontend.md Phase 1.1:
 * - Message history management
 * - Loading states for backend processing
 * - User/system message display
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  ConversationState,
  Message,
  MessageAction,
  ConfirmationData,
  PlaceOption,
  AlternativeOption,
} from '@/types';

/**
 * Initial state
 */
const initialState: ConversationState = {
  messages: [],
  isLoading: false,
  error: null,
  pendingMessage: null,
};

/**
 * Conversation slice
 */
const conversationSlice = createSlice({
  name: 'conversation',
  initialState,
  reducers: {
    /**
     * Add a user message
     */
    addUserMessage: (state, action: PayloadAction<string>) => {
      const message: Message = {
        id: `msg_${Date.now()}_user`,
        sender: 'user',
        text: action.payload,
        timestamp: Date.now(),
        messageType: 'simple',
      };
      state.messages.push(message);
      state.isLoading = true;
      state.error = null;
    },

    /**
     * Add a system message
     */
    addSystemMessage: (
      state,
      action: PayloadAction<{
        text: string;
        messageType?: Message['messageType'];
        actions?: MessageAction[];
        confirmationData?: ConfirmationData;
        placeOptions?: PlaceOption[];
        alternativeOptions?: AlternativeOption[];
      }>
    ) => {
      const { text, messageType = 'simple', ...rest } = action.payload;
      const message: Message = {
        id: `msg_${Date.now()}_system`,
        sender: 'system',
        text,
        timestamp: Date.now(),
        messageType,
        ...rest,
      };
      state.messages.push(message);
      state.isLoading = false;
    },

    /**
     * Add a loading placeholder message
     */
    addLoadingMessage: (state) => {
      const message: Message = {
        id: `msg_${Date.now()}_loading`,
        sender: 'system',
        text: 'Thinking...',
        timestamp: Date.now(),
        messageType: 'loading',
      };
      state.messages.push(message);
      state.isLoading = true;
    },

    /**
     * Remove loading message (replace with actual response)
     */
    removeLoadingMessage: (state) => {
      state.messages = state.messages.filter((m) => m.messageType !== 'loading');
    },

    /**
     * Update a message (e.g., to add actions)
     */
    updateMessage: (
      state,
      action: PayloadAction<{ id: string; updates: Partial<Message> }>
    ) => {
      const { id, updates } = action.payload;
      const index = state.messages.findIndex((m) => m.id === id);
      if (index !== -1) {
        state.messages[index] = { ...state.messages[index], ...updates };
      }
    },

    /**
     * Remove a message
     */
    removeMessage: (state, action: PayloadAction<string>) => {
      state.messages = state.messages.filter((m) => m.id !== action.payload);
    },

    /**
     * Set loading state
     */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    /**
     * Set error state
     */
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    /**
     * Set pending message (typing indicator)
     */
    setPendingMessage: (state, action: PayloadAction<string | null>) => {
      state.pendingMessage = action.payload;
    },

    /**
     * Clear conversation history
     */
    clearConversation: (state) => {
      state.messages = [];
      state.isLoading = false;
      state.error = null;
      state.pendingMessage = null;
    },

    /**
     * Handle action button press in a message
     */
    handleMessageAction: (
      state,
      action: PayloadAction<{ messageId: string; actionId: string }>
    ) => {
      // This is mainly for tracking - actual handling done by thunks
      const { messageId, actionId } = action.payload;
      const message = state.messages.find((m) => m.id === messageId);
      if (message?.actions) {
        // Mark action as handled - actual handling done by thunks
        message.actions.find((a) => a.id === actionId);
      }
    },
  },
});

export const {
  addUserMessage,
  addSystemMessage,
  addLoadingMessage,
  removeLoadingMessage,
  updateMessage,
  removeMessage,
  setLoading,
  setError,
  setPendingMessage,
  clearConversation,
  handleMessageAction,
} = conversationSlice.actions;

export default conversationSlice.reducer;
