/**
 * ElevenLabs Controller - OpenAI-compatible chat completion endpoint
 *
 * This controller exposes an OpenAI-compatible API that ElevenLabs
 * can call as a custom LLM. It handles both streaming and non-streaming
 * requests.
 *
 * Endpoint: POST /v1/chat/completions
 *
 * This matches the OpenAI API format:
 * https://platform.openai.com/docs/api-reference/chat/create
 */

import {
  Controller,
  Post,
  Body,
  Res,
  HttpCode,
  HttpStatus,
  Logger,
  Headers,
} from '@nestjs/common';
import { Response } from 'express';
import { ElevenLabsService } from './elevenlabs.service';
import { ChatCompletionRequest } from './dtos';

@Controller('v1')
export class ElevenLabsController {
  private readonly logger = new Logger(ElevenLabsController.name);

  constructor(private readonly elevenLabsService: ElevenLabsService) {}

  /**
   * OpenAI-compatible chat completion endpoint
   *
   * ElevenLabs calls this endpoint when configured with a custom LLM.
   * Supports both streaming (SSE) and non-streaming responses.
   */
  @Post('chat/completions')
  @HttpCode(HttpStatus.OK)
  async chatCompletions(
    @Body() request: ChatCompletionRequest,
    @Res() response: Response,
    @Headers('authorization') authorization?: string,
  ): Promise<void> {
    const requestId = `req_${Date.now()}`;

    this.logger.log(
      `[${requestId}] Chat completion request: model=${request.model}, ` +
      `messages=${request.messages.length}, stream=${request.stream}`,
    );

    // Log ElevenLabs context if present
    if (request.elevenlabs_extra_body) {
      this.logger.debug(
        `[${requestId}] ElevenLabs context: ${JSON.stringify(request.elevenlabs_extra_body)}`,
      );
    }

    try {
      if (request.stream) {
        // Streaming response (SSE)
        await this.elevenLabsService.streamChatCompletion(request, response);
      } else {
        // Non-streaming response (for testing)
        const result = await this.elevenLabsService.handleChatCompletion(request);
        response.json(result);
      }
    } catch (error) {
      this.logger.error(`[${requestId}] Request failed:`, error);

      // Return OpenAI-compatible error format
      if (!response.headersSent) {
        response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
            type: 'internal_error',
            code: 'internal_error',
          },
        });
      }
    }
  }

  /**
   * Health check endpoint for the custom LLM
   */
  @Post('models')
  @HttpCode(HttpStatus.OK)
  async listModels(@Res() response: Response): Promise<void> {
    response.json({
      object: 'list',
      data: [
        {
          id: 'orchestrator-v1',
          object: 'model',
          created: Math.floor(Date.now() / 1000),
          owned_by: 'agentic-mobile-map',
          permission: [],
          root: 'orchestrator-v1',
          parent: null,
        },
      ],
    });
  }
}
