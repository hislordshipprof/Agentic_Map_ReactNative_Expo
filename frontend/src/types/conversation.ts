/**
 * Conversation Types - Agentic Mobile Map
 *
 * Type definitions for conversation UI, messages, and actions.
 * Per requirements-frontend.md Phase 1.1-1.3
 */

/**
 * Message sender type
 */
export type MessageSender = 'user' | 'system';

/**
 * Message types for different UI flows
 */
export type MessageType =
  | 'simple'           // Simple text response
  | 'confirmation'     // Route confirmation with accept/adjust
  | 'disambiguation'   // Multiple place options to choose from
  | 'alternatives'     // Low confidence alternative intents
  | 'error'            // Error/fallback message
  | 'loading';         // Loading placeholder

/**
 * Action button types for system messages
 */
export type ActionType = 'primary' | 'secondary' | 'danger' | 'ghost';

/**
 * Action button in system message
 */
export interface MessageAction {
  id: string;
  label: string;
  type: ActionType;
  /** Optional action identifier for handling */
  action?: string;
  /** Optional data payload */
  payload?: Record<string, unknown>;
}

/**
 * Place option for disambiguation
 */
export interface PlaceOption {
  id: string;
  name: string;
  address: string;
  distance: number;       // miles
  rating?: number;        // star rating
  openNow?: boolean;
  closingTime?: string;   // e.g., "9pm"
  category?: string;
}

/**
 * Alternative intent option for low confidence
 */
export interface AlternativeOption {
  id: string;
  label: string;
  description: string;
  intent: string;
}

/**
 * Confirmation data for route confirmation messages
 */
export interface ConfirmationData {
  destination: {
    name: string;
    address?: string;
  };
  stops: Array<{
    name: string;
    mileMarker: number;
  }>;
  totalDistance: number;   // miles
  totalTime: number;       // minutes
}

/**
 * Message in conversation
 */
export interface Message {
  id: string;
  sender: MessageSender;
  text: string;
  timestamp: number;
  messageType?: MessageType;
  /** Actions for system messages */
  actions?: MessageAction[];
  /** Confirmation data for confirmation messages */
  confirmationData?: ConfirmationData;
  /** Place options for disambiguation messages */
  placeOptions?: PlaceOption[];
  /** Alternative options for low confidence messages */
  alternativeOptions?: AlternativeOption[];
  /** Error details for error messages */
  errorDetails?: {
    code: string;
    suggestion?: string;
  };
}

/**
 * Conversation state for Redux slice
 */
export interface ConversationState {
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  /** Current message being typed (for optimistic updates) */
  pendingMessage: string | null;
}

/**
 * Create a new user message
 */
export const createUserMessage = (text: string): Message => ({
  id: `msg_${Date.now()}_user`,
  sender: 'user',
  text,
  timestamp: Date.now(),
  messageType: 'simple',
});

/**
 * Create a new system message
 */
export const createSystemMessage = (
  text: string,
  options?: Partial<Omit<Message, 'id' | 'sender' | 'text' | 'timestamp'>>
): Message => ({
  id: `msg_${Date.now()}_system`,
  sender: 'system',
  text,
  timestamp: Date.now(),
  messageType: 'simple',
  ...options,
});

/**
 * Create a loading message placeholder
 */
export const createLoadingMessage = (): Message => ({
  id: `msg_${Date.now()}_loading`,
  sender: 'system',
  text: 'Thinking...',
  timestamp: Date.now(),
  messageType: 'loading',
});
