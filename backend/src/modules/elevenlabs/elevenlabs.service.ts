/**
 * ElevenLabs Service - OpenAI-compatible LLM endpoint
 *
 * This service wraps the OrchestratorAgent to provide an OpenAI-compatible
 * chat completion endpoint that ElevenLabs can call as a custom LLM.
 *
 * Flow:
 * 1. ElevenLabs sends user speech as text (after STT)
 * 2. This service processes through OrchestratorAgent
 * 3. Response is streamed back in SSE format
 * 4. ElevenLabs converts response to speech (TTS)
 */

import { Injectable, Logger } from '@nestjs/common';
import { Response } from 'express';
import { OrchestratorAgent } from '../agent/agents/orchestrator.agent';
import { ContextManagerService } from '../agent/context/context-manager.service';
import {
  ChatCompletionRequest,
  ChatCompletionChunk,
  ChatCompletionChoice,
} from './dtos';

/**
 * Generate a unique completion ID
 */
function generateCompletionId(): string {
  return `chatcmpl-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

@Injectable()
export class ElevenLabsService {
  private readonly logger = new Logger(ElevenLabsService.name);

  constructor(
    private readonly orchestrator: OrchestratorAgent,
    private readonly contextManager: ContextManagerService,
  ) {}

  /**
   * Handle streaming chat completion request
   * This is the main endpoint ElevenLabs calls
   */
  async streamChatCompletion(
    request: ChatCompletionRequest,
    response: Response,
  ): Promise<void> {
    const completionId = generateCompletionId();
    const startTime = Date.now();

    // Extract session context from ElevenLabs extra body
    const extraBody = request.elevenlabs_extra_body || {};
    const sessionId = extraBody.session_id || extraBody.conversation_id || `el_${Date.now()}`;
    const userLocation = extraBody.user_location;
    const userAnchors = extraBody.user_anchors;

    // Extract the latest user message
    const userMessage = this.extractUserMessage(request.messages);

    this.logger.log(
      `[${completionId}] Processing request: session=${sessionId}, message="${userMessage.substring(0, 50)}..."`,
    );

    // Set SSE headers
    response.setHeader('Content-Type', 'text/event-stream');
    response.setHeader('Cache-Control', 'no-cache');
    response.setHeader('Connection', 'keep-alive');
    response.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

    try {
      // Note: Removed buffer phrase - let the actual response be the first thing spoken
      // ElevenLabs handles the latency well enough

      // Use provided location or fallback to test location (Denver, CO)
      // This allows testing from ElevenLabs Preview without a mobile app
      const effectiveLocation = userLocation || {
        lat: 39.7392,
        lng: -104.9903,
      };

      this.logger.log(
        `[${completionId}] Using location: ${userLocation ? 'provided' : 'default (Denver, CO)'}`,
      );

      // Update context with location
      this.contextManager.updateUserLocation(sessionId, effectiveLocation);

      // Process through OrchestratorAgent (reuses all existing logic)
      const result = await this.orchestrator.processRequest(
        sessionId,
        userMessage,
        effectiveLocation,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(
        `[${completionId}] Orchestrator completed in ${processingTime}ms: success=${result.success}, completed=${result.completed}`,
      );

      // Debug: log the full result to understand what's being returned
      this.logger.log(
        `[${completionId}] Result fields: response=${!!result.response}, clarificationQuestion=${!!result.clarificationQuestion}, error=${!!result.error}, route=${!!result.route}`,
      );
      if (result.response) {
        this.logger.log(`[${completionId}] Response text: "${result.response.substring(0, 100)}..."`);
      }
      if (result.clarificationQuestion) {
        this.logger.log(`[${completionId}] Clarification: "${result.clarificationQuestion}"`);
      }

      // Stream the response based on result type
      if (result.response) {
        // Normal response - stream it
        await this.streamText(response, completionId, result.response);
      } else if (result.clarificationQuestion) {
        // Agent needs clarification - ask the user
        await this.streamText(response, completionId, result.clarificationQuestion);

        // If there are options, include them
        if (result.clarificationOptions && result.clarificationOptions.length > 0) {
          const optionsText = ` You can say: ${result.clarificationOptions.join(', ')}.`;
          await this.streamText(response, completionId, optionsText);
        }
      } else if (result.error) {
        // Error occurred
        const errorMessage = this.formatErrorMessage(result.error);
        await this.streamText(response, completionId, errorMessage);
      } else if (result.route) {
        // Route was planned but no explicit response - generate one
        const routeResponse = this.generateRouteResponse(result.route);
        await this.streamText(response, completionId, routeResponse);
      } else {
        // Fallback
        await this.streamText(
          response,
          completionId,
          "I've processed your request. Is there anything else you'd like to do?",
        );
      }

      // Send completion
      this.sendDoneChunk(response, completionId);

      const totalTime = Date.now() - startTime;
      this.logger.log(`[${completionId}] Completed in ${totalTime}ms`);

    } catch (error) {
      this.logger.error(`[${completionId}] Error:`, error);

      // Send error response
      const errorMessage = 'Sorry, I encountered an issue processing your request. Please try again.';
      this.sendContentChunk(response, completionId, errorMessage);
      this.sendDoneChunk(response, completionId);
    }
  }

  /**
   * Handle non-streaming chat completion (for testing)
   */
  async handleChatCompletion(
    request: ChatCompletionRequest,
  ): Promise<object> {
    const completionId = generateCompletionId();
    const extraBody = request.elevenlabs_extra_body || {};
    const sessionId = extraBody.session_id || `el_${Date.now()}`;
    const userLocation = extraBody.user_location;

    // Use provided location or fallback to test location (Denver, CO)
    const effectiveLocation = userLocation || {
      lat: 39.7392,
      lng: -104.9903,
    };

    const userMessage = this.extractUserMessage(request.messages);

    this.logger.log(`[${completionId}] Non-streaming request: "${userMessage.substring(0, 50)}..."`);

    try {
      const result = await this.orchestrator.processRequest(
        sessionId,
        userMessage,
        effectiveLocation,
      );

      let content = result.response || result.clarificationQuestion || '';
      if (result.error) {
        content = this.formatErrorMessage(result.error);
      }

      return {
        id: completionId,
        object: 'chat.completion',
        created: Math.floor(Date.now() / 1000),
        model: request.model || 'orchestrator-v1',
        choices: [{
          index: 0,
          message: {
            role: 'assistant',
            content,
          },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: userMessage.length,
          completion_tokens: content.length,
          total_tokens: userMessage.length + content.length,
        },
      };
    } catch (error) {
      this.logger.error(`[${completionId}] Error:`, error);
      throw error;
    }
  }

  /**
   * Extract the latest user message from the messages array
   */
  private extractUserMessage(messages: ChatCompletionRequest['messages']): string {
    // Get all user messages
    const userMessages = messages.filter(m => m.role === 'user');

    if (userMessages.length === 0) {
      return '';
    }

    // Return the last user message
    return userMessages[userMessages.length - 1].content;
  }

  /**
   * Stream text content in chunks for more natural TTS
   */
  private async streamText(
    response: Response,
    completionId: string,
    text: string,
  ): Promise<void> {
    this.logger.log(`[${completionId}] Streaming text: "${text}"`);

    // Split into sentences for more natural streaming
    const sentences = this.splitIntoSentences(text);
    this.logger.log(`[${completionId}] Split into ${sentences.length} sentences`);

    for (const sentence of sentences) {
      if (sentence.trim()) {
        this.logger.log(`[${completionId}] Sending chunk: "${sentence.trim()}"`);
        this.sendContentChunk(response, completionId, sentence);
        // Small delay between sentences for natural pacing
        await this.delay(50);
      }
    }
  }

  /**
   * Split text into sentences for streaming
   */
  private splitIntoSentences(text: string): string[] {
    // Split on sentence boundaries but keep the delimiter
    const sentences = text.match(/[^.!?]+[.!?]+\s*/g) || [text];
    return sentences;
  }

  /**
   * Send a content chunk in SSE format
   */
  private sendContentChunk(
    response: Response,
    completionId: string,
    content: string,
  ): void {
    const chunk: ChatCompletionChunk = {
      id: completionId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: 'orchestrator-v1',
      choices: [{
        index: 0,
        delta: { content },
        finish_reason: null,
      }],
    };

    response.write(`data: ${JSON.stringify(chunk)}\n\n`);
  }

  /**
   * Send the final [DONE] chunk
   */
  private sendDoneChunk(response: Response, completionId: string): void {
    // Send final chunk with finish_reason
    const finalChunk: ChatCompletionChunk = {
      id: completionId,
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: 'orchestrator-v1',
      choices: [{
        index: 0,
        delta: {},
        finish_reason: 'stop',
      }],
    };

    response.write(`data: ${JSON.stringify(finalChunk)}\n\n`);
    response.write('data: [DONE]\n\n');
    response.end();
  }

  /**
   * Format error message for user
   */
  private formatErrorMessage(error: string): string {
    // Make technical errors more user-friendly
    if (error.includes('location')) {
      return "I need your location to help with navigation. Could you enable location services?";
    }
    if (error.includes('not found')) {
      return "I couldn't find what you're looking for. Could you try describing it differently?";
    }
    return `I ran into an issue: ${error}. Let me know if you'd like to try again.`;
  }

  /**
   * Generate a spoken response for a planned route
   */
  private generateRouteResponse(route: {
    destination: { name: string };
    stops: Array<{ name: string }>;
    totalTime: number;
    totalDistance: number;
  }): string {
    const destination = route.destination.name;
    const stopCount = route.stops?.length || 0;
    const minutes = Math.round(route.totalTime);
    const miles = (route.totalDistance).toFixed(1);

    if (stopCount > 0) {
      const stopNames = route.stops.map(s => s.name).join(' and ');
      return `I've planned your route to ${destination} with a stop at ${stopNames}. ` +
        `Total time is about ${minutes} minutes, covering ${miles} miles. Ready to start?`;
    }

    return `Your route to ${destination} is ready. ` +
      `It's about ${minutes} minutes and ${miles} miles. Ready to navigate?`;
  }

  /**
   * Simple delay utility
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
