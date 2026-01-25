/**
 * Conversation Context - Multi-turn conversation memory
 *
 * Maintains conversation history, user preferences, and current state
 * to enable contextual understanding across multiple utterances.
 *
 * Example flow:
 * User: "Take me home with Starbucks"
 * [context stores: destination=home, stops=[Starbucks], route=planned]
 * User: "Add Walmart too"
 * [context provides: previous route, so "add" is understood]
 */

/**
 * A single turn in the conversation
 */
export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;

  // NLU analysis (for user turns)
  intent?: string;
  confidence?: number;
  entities?: Record<string, unknown>;

  // Route data (for assistant turns with routes)
  routeId?: string;

  // Tool calls made (for tracking agent actions)
  toolCalls?: Array<{
    tool: string;
    params: Record<string, unknown>;
    result?: unknown;
  }>;
}

/**
 * User preferences learned over time
 */
export interface UserPreferences {
  // Frequently visited places
  preferredCoffee?: string; // e.g., "Starbucks"
  preferredGas?: string; // e.g., "Shell"
  preferredGrocery?: string; // e.g., "Walmart"

  // Behavior preferences
  detourTolerance: 'low' | 'medium' | 'high'; // How much extra time is acceptable
  preferQuickRoutes: boolean; // Prefer fastest over shortest
  avoidHighways: boolean;

  // Time-based patterns
  rushHourBehavior: 'avoid_detours' | 'normal';
  typicalCommuteTimes?: {
    morning?: string; // e.g., "8:00 AM"
    evening?: string; // e.g., "5:30 PM"
  };
}

/**
 * Current route state
 */
export interface CurrentRouteState {
  routeId: string;
  origin: {
    name: string;
    location: { lat: number; lng: number };
  };
  destination: {
    name: string;
    location: { lat: number; lng: number };
  };
  stops: Array<{
    id: string;
    name: string;
    category: string;
    location: { lat: number; lng: number };
    confirmed: boolean;
  }>;
  totalTime: number;
  totalDistance: number;
  status: 'planning' | 'confirmed' | 'navigating' | 'completed';
}

/**
 * Pending clarification request
 */
export interface PendingClarification {
  id: string;
  question: string;
  options?: string[];
  context: {
    ambiguousEntity?: string;
    candidates?: Array<{ name: string; details: string }>;
    relatedIntent?: string;
  };
  createdAt: number;
  expiresAt: number;
}

/**
 * Full conversation context for a session
 */
export interface ConversationContext {
  // Session identification
  sessionId: string;
  userId?: string;
  createdAt: number;
  lastActivityAt: number;

  // Conversation history (last N turns)
  history: ConversationTurn[];
  maxHistoryLength: number;

  // Current state
  currentRoute?: CurrentRouteState;
  pendingClarification?: PendingClarification;

  // User location (updated from frontend)
  userLocation?: {
    lat: number;
    lng: number;
    address?: string;
    updatedAt: number;
  };

  // User preferences
  preferences: UserPreferences;

  // Extracted entities from recent conversation
  activeEntities: {
    destination?: string;
    stops?: string[];
    anchors?: Record<string, { lat: number; lng: number }>;
  };

  // Agent state
  agentState: {
    lastIntent?: string;
    lastConfidence?: number;
    awaitingResponse: boolean;
    currentTool?: string;
  };
}

/**
 * Default user preferences
 */
export const DEFAULT_PREFERENCES: UserPreferences = {
  detourTolerance: 'medium',
  preferQuickRoutes: true,
  avoidHighways: false,
  rushHourBehavior: 'normal',
};

/**
 * Create a new conversation context
 */
export function createConversationContext(
  sessionId: string,
  userId?: string,
): ConversationContext {
  return {
    sessionId,
    userId,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    history: [],
    maxHistoryLength: 10, // Keep last 10 turns
    preferences: { ...DEFAULT_PREFERENCES },
    activeEntities: {},
    agentState: {
      awaitingResponse: false,
    },
  };
}

/**
 * Add a turn to the conversation history
 */
export function addTurn(
  context: ConversationContext,
  turn: Omit<ConversationTurn, 'id' | 'timestamp'>,
): ConversationContext {
  const newTurn: ConversationTurn = {
    ...turn,
    id: `turn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
  };

  const history = [...context.history, newTurn];

  // Trim to max length
  if (history.length > context.maxHistoryLength) {
    history.shift();
  }

  return {
    ...context,
    history,
    lastActivityAt: Date.now(),
  };
}

/**
 * Update active entities from NLU result
 */
export function updateEntities(
  context: ConversationContext,
  entities: Record<string, unknown>,
): ConversationContext {
  const activeEntities = { ...context.activeEntities };

  // Merge new entities (don't overwrite with undefined)
  if (entities.destination) {
    activeEntities.destination = entities.destination as string;
  }
  if (entities.stops && Array.isArray(entities.stops)) {
    // Append new stops to existing ones
    activeEntities.stops = [
      ...(activeEntities.stops || []),
      ...(entities.stops as string[]),
    ];
    // Remove duplicates
    activeEntities.stops = [...new Set(activeEntities.stops)];
  }

  return {
    ...context,
    activeEntities,
    lastActivityAt: Date.now(),
  };
}

/**
 * Get conversation summary for LLM context
 */
export function getConversationSummary(context: ConversationContext): string {
  const parts: string[] = [];

  // Recent history
  if (context.history.length > 0) {
    parts.push('Recent conversation:');
    const recentTurns = context.history.slice(-5); // Last 5 turns
    for (const turn of recentTurns) {
      const role = turn.role === 'user' ? 'User' : 'Assistant';
      parts.push(`${role}: ${turn.content}`);
      if (turn.intent) {
        parts.push(`  [Intent: ${turn.intent}, Confidence: ${turn.confidence}]`);
      }
    }
  }

  // Current route
  if (context.currentRoute) {
    parts.push('\nCurrent route:');
    parts.push(`  From: ${context.currentRoute.origin.name}`);
    parts.push(`  To: ${context.currentRoute.destination.name}`);
    if (context.currentRoute.stops.length > 0) {
      const stopNames = context.currentRoute.stops.map((s) => s.name).join(', ');
      parts.push(`  Stops: ${stopNames}`);
    }
    parts.push(`  Status: ${context.currentRoute.status}`);
  }

  // Active entities
  if (context.activeEntities.destination || context.activeEntities.stops?.length) {
    parts.push('\nActive context:');
    if (context.activeEntities.destination) {
      parts.push(`  Destination: ${context.activeEntities.destination}`);
    }
    if (context.activeEntities.stops?.length) {
      parts.push(`  Stops: ${context.activeEntities.stops.join(', ')}`);
    }
  }

  // Pending clarification
  if (context.pendingClarification) {
    parts.push('\nAwaiting user response to:');
    parts.push(`  "${context.pendingClarification.question}"`);
  }

  return parts.join('\n');
}

/**
 * Check if context has enough information to plan a route
 */
export function canPlanRoute(context: ConversationContext): boolean {
  return !!(
    context.activeEntities.destination ||
    (context.currentRoute && context.activeEntities.stops?.length)
  );
}

/**
 * Clear route-related state (after navigation completes or cancels)
 */
export function clearRouteState(context: ConversationContext): ConversationContext {
  return {
    ...context,
    currentRoute: undefined,
    activeEntities: {},
    agentState: {
      ...context.agentState,
      lastIntent: undefined,
      awaitingResponse: false,
    },
    lastActivityAt: Date.now(),
  };
}
