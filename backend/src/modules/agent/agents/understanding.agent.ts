/**
 * Understanding Agent - Multi-turn NLU with clarification
 *
 * Responsibilities:
 * - Parse user utterances with context awareness
 * - Detect ambiguity and generate clarifying questions
 * - Refine understanding through iterative dialogue
 * - Handle clarification responses
 */

import { Injectable, Logger } from '@nestjs/common';
import { NluService } from '../../nlu/nlu.service';
import { ContextManagerService } from '../context/context-manager.service';
import { ConversationContext } from '../context/conversation-context';
import {
  ClarificationContext,
  AmbiguityType,
  buildClarificationPrompt,
  needsClarification,
  CLARIFICATION_TEMPLATES,
} from '../prompts/clarification.prompts';
import { GeminiClient } from '../llm/gemini-client';

/**
 * Result of understanding an utterance
 */
export interface UnderstandingResult {
  // Whether understanding is complete
  understood: boolean;

  // NLU result (if understood)
  intent?: string;
  confidence?: number;
  entities?: Record<string, unknown>;

  // Clarification request (if not understood)
  clarificationNeeded?: boolean;
  clarificationQuestion?: string;
  clarificationType?: AmbiguityType;
  clarificationOptions?: string[];

  // Processing metadata
  turnCount: number;
  usedContext: boolean;
}

/**
 * Options for understanding
 */
export interface UnderstandingOptions {
  // Maximum attempts before giving up
  maxTurns?: number;
  // Whether to use conversation context
  useContext?: boolean;
  // Minimum confidence to accept without clarification
  minConfidence?: number;
  // Whether this is a response to a clarification
  isClarificationResponse?: boolean;
}

const DEFAULT_OPTIONS: Required<UnderstandingOptions> = {
  maxTurns: 3,
  useContext: true,
  minConfidence: 0.7,
  isClarificationResponse: false,
};

@Injectable()
export class UnderstandingAgent {
  private readonly logger = new Logger(UnderstandingAgent.name);
  private readonly gemini: GeminiClient;

  constructor(
    private readonly nluService: NluService,
    private readonly contextManager: ContextManagerService,
  ) {
    this.gemini = new GeminiClient();
  }

  /**
   * Process an utterance and return understanding result
   */
  async processUtterance(
    sessionId: string,
    utterance: string,
    options: UnderstandingOptions = {},
  ): Promise<UnderstandingResult> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    const context = this.contextManager.getOrCreateContext(sessionId);

    this.logger.log(`Processing utterance for session ${sessionId}: "${utterance}"`);

    // Check if this is a response to a pending clarification
    if (opts.isClarificationResponse || this.contextManager.isAwaitingClarification(sessionId)) {
      return this.handleClarificationResponse(sessionId, utterance, context);
    }

    // Get context for NLU
    const nluContext = opts.useContext
      ? this.contextManager.getContextForNlu(sessionId)
      : undefined;

    // Parse utterance with NLU
    const nluResult = await this.nluService.process(utterance, {
      previousIntent: nluContext?.previousIntent,
      previousEntities: nluContext?.previousEntities,
      conversationId: sessionId,
    });

    this.logger.debug(`NLU result: intent=${nluResult.intent}, confidence=${nluResult.confidence}, entities=${JSON.stringify(nluResult.entities)}`);

    // Record the turn
    this.contextManager.recordUserTurn(sessionId, {
      intent: nluResult.intent,
      confidence: nluResult.confidence,
      entities: nluResult.entities,
      utterance,
    });

    // Check if clarification is needed
    const clarificationCheck = needsClarification(nluResult);

    if (clarificationCheck.needed && nluResult.confidence < opts.minConfidence) {
      // Generate clarification question
      const clarification = await this.generateClarification(
        utterance,
        nluResult,
        clarificationCheck.type!,
        context,
      );

      // Store pending clarification
      this.contextManager.setPendingClarification(sessionId, {
        question: clarification.question,
        options: clarification.options,
        context: {
          ambiguousEntity: clarification.ambiguousEntity,
          relatedIntent: nluResult.intent,
        },
      });

      return {
        understood: false,
        intent: nluResult.intent,
        confidence: nluResult.confidence,
        entities: nluResult.entities,
        clarificationNeeded: true,
        clarificationQuestion: clarification.question,
        clarificationType: clarificationCheck.type,
        clarificationOptions: clarification.options,
        turnCount: context.history.length,
        usedContext: opts.useContext,
      };
    }

    // Understanding is complete
    return {
      understood: true,
      intent: nluResult.intent,
      confidence: nluResult.confidence,
      entities: nluResult.entities,
      clarificationNeeded: false,
      turnCount: context.history.length,
      usedContext: opts.useContext,
    };
  }

  /**
   * Handle a response to a clarification question
   */
  private async handleClarificationResponse(
    sessionId: string,
    response: string,
    context: ConversationContext,
  ): Promise<UnderstandingResult> {
    this.logger.log(`Handling clarification response: "${response}"`);

    const pending = context.pendingClarification;
    if (!pending) {
      // No pending clarification, process normally
      return this.processUtterance(sessionId, response, { isClarificationResponse: false });
    }

    // Clear the pending clarification
    this.contextManager.clearPendingClarification(sessionId);

    // Parse the response in context of the original question
    const enrichedUtterance = this.enrichWithContext(response, pending, context);

    // Re-process with enriched context
    const nluResult = await this.nluService.process(enrichedUtterance, {
      previousIntent: context.agentState.lastIntent,
      previousEntities: context.activeEntities,
      conversationId: sessionId,
    });

    // Record the clarification response
    this.contextManager.recordUserTurn(sessionId, {
      intent: nluResult.intent,
      confidence: Math.min(nluResult.confidence + 0.1, 1), // Boost confidence for clarified intent
      entities: nluResult.entities,
      utterance: response,
    });

    return {
      understood: true,
      intent: nluResult.intent,
      confidence: Math.min(nluResult.confidence + 0.1, 1),
      entities: nluResult.entities,
      clarificationNeeded: false,
      turnCount: context.history.length,
      usedContext: true,
    };
  }

  /**
   * Enrich a clarification response with context
   */
  private enrichWithContext(
    response: string,
    pending: NonNullable<ConversationContext['pendingClarification']>,
    context: ConversationContext,
  ): string {
    // If response is a short answer like "yes", "the first one", "Starbucks"
    // enrich it with the original context

    const lowerResponse = response.toLowerCase().trim();

    // Handle selection from options
    if (pending.options && pending.options.length > 0) {
      // Check for ordinal references
      const ordinals = ['first', 'second', 'third', 'fourth', '1', '2', '3', '4'];
      for (let i = 0; i < ordinals.length; i++) {
        if (lowerResponse.includes(ordinals[i])) {
          const optionIndex = i % pending.options.length;
          if (pending.options[optionIndex]) {
            // Return enriched with the selected option
            const selectedOption = pending.options[optionIndex];
            return `I want ${selectedOption}`;
          }
        }
      }

      // Check if response matches an option
      for (const option of pending.options) {
        if (lowerResponse.includes(option.toLowerCase())) {
          return `I want ${option}`;
        }
      }
    }

    // Handle yes/no
    if (['yes', 'yeah', 'yep', 'sure', 'ok', 'okay'].includes(lowerResponse)) {
      // Confirm the previous intent
      if (context.agentState.lastIntent) {
        return `Yes, ${context.agentState.lastIntent}`;
      }
    }

    if (['no', 'nope', 'nah', 'cancel', 'never mind'].includes(lowerResponse)) {
      return 'cancel';
    }

    // Return as-is if we can't enrich
    return response;
  }

  /**
   * Generate a clarification question
   */
  private async generateClarification(
    utterance: string,
    nluResult: { intent: string; confidence: number; entities: Record<string, unknown> },
    type: AmbiguityType,
    context: ConversationContext,
  ): Promise<{ question: string; options?: string[]; ambiguousEntity?: string }> {
    this.logger.debug(`Generating clarification for type: ${type}`);

    // Try template-based clarification first (faster)
    const templateResult = this.tryTemplateClarification(type, nluResult, context);
    if (templateResult) {
      return templateResult;
    }

    // Fall back to LLM-generated clarification
    const clarificationContext: ClarificationContext = {
      type,
      originalUtterance: utterance,
      intent: nluResult.intent,
      confidence: nluResult.confidence,
    };

    // Add type-specific context
    if (type === 'missing_info') {
      clarificationContext.missingFields = this.identifyMissingFields(nluResult);
    }

    const prompt = buildClarificationPrompt(clarificationContext);

    try {
      const question = await this.gemini.generate(prompt);
      return { question: question.trim() };
    } catch (error) {
      this.logger.error('Failed to generate clarification via LLM:', error);
      // Fallback to generic question
      return { question: CLARIFICATION_TEMPLATES.intentUnclear() };
    }
  }

  /**
   * Try to use a template for clarification (faster than LLM)
   */
  private tryTemplateClarification(
    type: AmbiguityType,
    nluResult: { intent: string; confidence: number; entities: Record<string, unknown> },
    context: ConversationContext,
  ): { question: string; options?: string[]; ambiguousEntity?: string } | null {
    switch (type) {
      case 'missing_info':
        if (!nluResult.entities.destination) {
          return { question: CLARIFICATION_TEMPLATES.missingDestination() };
        }
        break;

      case 'confirmation_needed':
        if (context.activeEntities.destination) {
          const stops = context.activeEntities.stops || [];
          return {
            question: CLARIFICATION_TEMPLATES.confirmRoute(
              context.activeEntities.destination,
              stops,
            ),
          };
        }
        break;

      case 'unclear_intent':
        if (nluResult.confidence < 0.5) {
          return { question: CLARIFICATION_TEMPLATES.intentUnclear() };
        }
        break;
    }

    return null;
  }

  /**
   * Identify what information is missing from NLU result
   */
  private identifyMissingFields(nluResult: {
    intent: string;
    entities: Record<string, unknown>;
  }): string[] {
    const missing: string[] = [];

    // Navigation intents need destination
    if (
      ['navigate', 'navigate_with_stops', 'navigate_direct'].includes(nluResult.intent) &&
      !nluResult.entities.destination
    ) {
      missing.push('destination');
    }

    // add_stop needs a stop name
    if (nluResult.intent === 'add_stop' && !nluResult.entities.stops) {
      missing.push('stop name');
    }

    return missing;
  }

  /**
   * Handle place disambiguation when multiple candidates found
   */
  async handlePlaceDisambiguation(
    sessionId: string,
    query: string,
    candidates: Array<{ name: string; address: string; distance?: string }>,
  ): Promise<{ question: string; options: string[] }> {
    const options = candidates.slice(0, 4).map((c) => c.name);

    let question: string;
    if (candidates.length === 2) {
      question = CLARIFICATION_TEMPLATES.multiplePlacesWithOptions([...options]);
    } else {
      question = `I found ${candidates.length} options for ${query}. Which one would you like?`;
    }

    // Store as pending clarification
    this.contextManager.setPendingClarification(sessionId, {
      question,
      options,
      context: {
        ambiguousEntity: query,
        candidates: candidates.map((c) => ({ name: c.name, details: c.address })),
      },
    });

    return { question, options };
  }
}
