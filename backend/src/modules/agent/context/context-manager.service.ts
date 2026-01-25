/**
 * Context Manager Service - Manages conversation contexts for all sessions
 *
 * Responsibilities:
 * - Create and store conversation contexts
 * - Update context based on NLU results and route planning
 * - Provide context summaries for LLM calls
 * - Clean up stale contexts
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  ConversationContext,
  ConversationTurn,
  CurrentRouteState,
  PendingClarification,
  UserPreferences,
  createConversationContext,
  addTurn,
  updateEntities,
  getConversationSummary,
  clearRouteState,
} from './conversation-context';

/**
 * NLU result to be stored in context
 */
export interface NluResultForContext {
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
  utterance: string;
}

/**
 * Route result to be stored in context
 */
export interface RouteResultForContext {
  routeId: string;
  origin: { name: string; location: { lat: number; lng: number } };
  destination: { name: string; location: { lat: number; lng: number } };
  stops: Array<{
    id: string;
    name: string;
    category: string;
    location: { lat: number; lng: number };
  }>;
  totalTime: number;
  totalDistance: number;
}

@Injectable()
export class ContextManagerService {
  private readonly logger = new Logger(ContextManagerService.name);
  private contexts: Map<string, ConversationContext> = new Map();

  // Configuration
  private readonly CONTEXT_TTL_MS = 30 * 60 * 1000; // 30 minutes
  private readonly CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Start cleanup interval
    setInterval(() => this.cleanupStaleContexts(), this.CLEANUP_INTERVAL_MS);
  }

  /**
   * Get or create a conversation context for a session
   */
  getOrCreateContext(sessionId: string, userId?: string): ConversationContext {
    let context = this.contexts.get(sessionId);

    if (!context) {
      context = createConversationContext(sessionId, userId);
      this.contexts.set(sessionId, context);
      this.logger.log(`Created new context for session: ${sessionId}`);
    } else {
      // Update last activity
      context.lastActivityAt = Date.now();
    }

    return context;
  }

  /**
   * Get context for a session (returns undefined if not exists)
   */
  getContext(sessionId: string): ConversationContext | undefined {
    return this.contexts.get(sessionId);
  }

  /**
   * Record a user utterance (simple version - just the transcript)
   * Use this when NLU hasn't been processed yet
   */
  recordUserTurn(sessionId: string, utterance: string): ConversationContext;
  /**
   * Record a user utterance and NLU result (full version)
   */
  recordUserTurn(sessionId: string, nluResult: NluResultForContext): ConversationContext;
  recordUserTurn(
    sessionId: string,
    utteranceOrNluResult: string | NluResultForContext,
  ): ConversationContext {
    let context = this.getOrCreateContext(sessionId);

    if (typeof utteranceOrNluResult === 'string') {
      // Simple version: just the utterance
      context = addTurn(context, {
        role: 'user',
        content: utteranceOrNluResult,
      });
      this.contexts.set(sessionId, context);
      this.logger.debug(`Recorded user utterance for session: ${sessionId}`);
      return context;
    }

    // Full version: with NLU result
    const nluResult = utteranceOrNluResult;

    // Add user turn
    context = addTurn(context, {
      role: 'user',
      content: nluResult.utterance,
      intent: nluResult.intent,
      confidence: nluResult.confidence,
      entities: nluResult.entities,
    });

    // Update active entities
    context = updateEntities(context, nluResult.entities);

    // Update agent state
    context.agentState.lastIntent = nluResult.intent;
    context.agentState.lastConfidence = nluResult.confidence;

    this.contexts.set(sessionId, context);
    this.logger.debug(`Recorded user turn for session: ${sessionId}, intent: ${nluResult.intent}`);

    return context;
  }

  /**
   * Record an assistant response (simple version - just response and optional intent)
   */
  recordAssistantTurn(sessionId: string, response: string, intent?: string): ConversationContext;
  /**
   * Record an assistant response (full version with tool calls)
   */
  recordAssistantTurn(
    sessionId: string,
    response: string,
    toolCalls: Array<{ tool: string; params: Record<string, unknown>; result?: unknown }>,
    routeId?: string,
  ): ConversationContext;
  recordAssistantTurn(
    sessionId: string,
    response: string,
    toolCallsOrIntent?: string | Array<{ tool: string; params: Record<string, unknown>; result?: unknown }>,
    routeId?: string,
  ): ConversationContext {
    let context = this.getOrCreateContext(sessionId);

    // Handle simple version (intent as string)
    if (typeof toolCallsOrIntent === 'string' || toolCallsOrIntent === undefined) {
      context = addTurn(context, {
        role: 'assistant',
        content: response,
        intent: toolCallsOrIntent as string | undefined,
      });
      this.contexts.set(sessionId, context);
      return context;
    }

    // Full version with tool calls
    context = addTurn(context, {
      role: 'assistant',
      content: response,
      toolCalls: toolCallsOrIntent,
      routeId,
    });

    this.contexts.set(sessionId, context);
    return context;
  }

  /**
   * Set the current route for a session
   */
  setCurrentRoute(sessionId: string, route: RouteResultForContext): ConversationContext {
    const context = this.getOrCreateContext(sessionId);

    context.currentRoute = {
      routeId: route.routeId,
      origin: route.origin,
      destination: route.destination,
      stops: route.stops.map((s) => ({
        ...s,
        confirmed: false,
      })),
      totalTime: route.totalTime,
      totalDistance: route.totalDistance,
      status: 'planning',
    };

    this.contexts.set(sessionId, context);
    this.logger.log(`Set route for session: ${sessionId}, routeId: ${route.routeId}`);

    return context;
  }

  /**
   * Update route status
   */
  updateRouteStatus(
    sessionId: string,
    status: CurrentRouteState['status'],
  ): ConversationContext | undefined {
    const context = this.contexts.get(sessionId);
    if (!context?.currentRoute) return undefined;

    context.currentRoute.status = status;
    context.lastActivityAt = Date.now();

    this.contexts.set(sessionId, context);
    return context;
  }

  /**
   * Add a stop to the current route
   */
  addStopToRoute(
    sessionId: string,
    stop: { id: string; name: string; category: string; location: { lat: number; lng: number } },
  ): ConversationContext | undefined {
    const context = this.contexts.get(sessionId);
    if (!context?.currentRoute) return undefined;

    // Check if stop already exists
    const existingStop = context.currentRoute.stops.find(
      (s) => s.name.toLowerCase() === stop.name.toLowerCase(),
    );
    if (!existingStop) {
      context.currentRoute.stops.push({
        ...stop,
        confirmed: false,
      });
    }

    context.lastActivityAt = Date.now();
    this.contexts.set(sessionId, context);

    return context;
  }

  /**
   * Remove a stop from the current route
   */
  removeStopFromRoute(sessionId: string, stopName: string): ConversationContext | undefined {
    const context = this.contexts.get(sessionId);
    if (!context?.currentRoute) return undefined;

    context.currentRoute.stops = context.currentRoute.stops.filter(
      (s) => s.name.toLowerCase() !== stopName.toLowerCase(),
    );

    context.lastActivityAt = Date.now();
    this.contexts.set(sessionId, context);

    return context;
  }

  /**
   * Set a pending clarification question
   */
  setPendingClarification(
    sessionId: string,
    clarification: Omit<PendingClarification, 'id' | 'createdAt' | 'expiresAt'>,
  ): ConversationContext {
    const context = this.getOrCreateContext(sessionId);

    context.pendingClarification = {
      ...clarification,
      id: `clarify_${Date.now()}`,
      createdAt: Date.now(),
      expiresAt: Date.now() + 60000, // 1 minute expiry
    };

    context.agentState.awaitingResponse = true;
    this.contexts.set(sessionId, context);

    return context;
  }

  /**
   * Clear pending clarification (after user responds)
   */
  clearPendingClarification(sessionId: string): ConversationContext | undefined {
    const context = this.contexts.get(sessionId);
    if (!context) return undefined;

    context.pendingClarification = undefined;
    context.agentState.awaitingResponse = false;
    context.lastActivityAt = Date.now();

    this.contexts.set(sessionId, context);
    return context;
  }

  /**
   * Update user location
   */
  updateUserLocation(
    sessionId: string,
    location: { lat: number; lng: number; address?: string },
  ): ConversationContext {
    const context = this.getOrCreateContext(sessionId);

    context.userLocation = {
      ...location,
      updatedAt: Date.now(),
    };

    this.contexts.set(sessionId, context);
    return context;
  }

  /**
   * Update user preferences
   */
  updatePreferences(
    sessionId: string,
    preferences: Partial<UserPreferences>,
  ): ConversationContext {
    const context = this.getOrCreateContext(sessionId);

    context.preferences = {
      ...context.preferences,
      ...preferences,
    };

    this.contexts.set(sessionId, context);
    return context;
  }

  /**
   * Get conversation summary for LLM context injection
   */
  getContextSummary(sessionId: string): string {
    const context = this.contexts.get(sessionId);
    if (!context) return 'No previous conversation context.';

    return getConversationSummary(context);
  }

  /**
   * Get context for NLU (simplified for prompt injection)
   */
  getContextForNlu(sessionId: string): {
    previousIntent?: string;
    previousEntities?: Record<string, unknown>;
    conversationSummary: string;
    hasPendingRoute: boolean;
    pendingClarification?: string;
  } {
    const context = this.contexts.get(sessionId);

    if (!context) {
      return {
        conversationSummary: '',
        hasPendingRoute: false,
      };
    }

    // Get the last user turn
    const lastUserTurn = [...context.history].reverse().find((t) => t.role === 'user');

    return {
      previousIntent: lastUserTurn?.intent,
      previousEntities: context.activeEntities,
      conversationSummary: getConversationSummary(context),
      hasPendingRoute: !!context.currentRoute,
      pendingClarification: context.pendingClarification?.question,
    };
  }

  /**
   * Check if context expects a clarification response
   */
  isAwaitingClarification(sessionId: string): boolean {
    const context = this.contexts.get(sessionId);
    if (!context?.pendingClarification) return false;

    // Check if clarification has expired
    if (Date.now() > context.pendingClarification.expiresAt) {
      this.clearPendingClarification(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Clear route state for a session
   */
  clearRoute(sessionId: string): ConversationContext | undefined {
    const context = this.contexts.get(sessionId);
    if (!context) return undefined;

    const clearedContext = clearRouteState(context);
    this.contexts.set(sessionId, clearedContext);

    return clearedContext;
  }

  /**
   * Delete context for a session
   */
  deleteContext(sessionId: string): void {
    this.contexts.delete(sessionId);
    this.logger.log(`Deleted context for session: ${sessionId}`);
  }

  /**
   * Cleanup stale contexts
   */
  private cleanupStaleContexts(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, context] of this.contexts) {
      if (now - context.lastActivityAt > this.CONTEXT_TTL_MS) {
        this.contexts.delete(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.log(`Cleaned up ${cleanedCount} stale contexts`);
    }
  }

  /**
   * Get stats for monitoring
   */
  getStats(): { activeContexts: number; totalTurns: number } {
    let totalTurns = 0;
    for (const context of this.contexts.values()) {
      totalTurns += context.history.length;
    }

    return {
      activeContexts: this.contexts.size,
      totalTurns,
    };
  }
}
