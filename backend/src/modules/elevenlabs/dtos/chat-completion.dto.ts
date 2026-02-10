/**
 * OpenAI-Compatible Chat Completion DTOs
 *
 * These DTOs match the OpenAI chat completion API format
 * that ElevenLabs expects for custom LLM integration.
 */

import { IsString, IsArray, IsBoolean, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Chat message in OpenAI format
 */
export class ChatMessage {
  @IsString()
  role: 'system' | 'user' | 'assistant' | 'tool';

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  tool_call_id?: string;

  @IsOptional()
  tool_calls?: ToolCall[];
}

/**
 * Tool call from LLM
 */
export class ToolCall {
  @IsString()
  id: string;

  @IsString()
  type: 'function';

  function: {
    name: string;
    arguments: string;
  };
}

/**
 * Tool definition in OpenAI format
 */
export class ToolDefinition {
  @IsString()
  type: 'function';

  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
}

/**
 * ElevenLabs extra body parameters
 * Passed from ElevenLabs to identify session and context
 */
export class ElevenLabsExtraBody {
  @IsOptional()
  @IsString()
  session_id?: string;

  @IsOptional()
  @IsString()
  conversation_id?: string;

  @IsOptional()
  user_location?: {
    lat: number;
    lng: number;
  };

  @IsOptional()
  user_anchors?: Array<{
    name: string;
    location: { lat: number; lng: number };
  }>;
}

/**
 * OpenAI Chat Completion Request
 */
export class ChatCompletionRequest {
  @IsString()
  model: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChatMessage)
  messages: ChatMessage[];

  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsNumber()
  max_tokens?: number;

  @IsOptional()
  @IsArray()
  tools?: ToolDefinition[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ElevenLabsExtraBody)
  elevenlabs_extra_body?: ElevenLabsExtraBody;
}

/**
 * Chat completion choice delta (for streaming)
 */
export interface ChatCompletionDelta {
  role?: string;
  content?: string;
  tool_calls?: ToolCall[];
}

/**
 * Chat completion choice
 */
export interface ChatCompletionChoice {
  index: number;
  delta?: ChatCompletionDelta;
  message?: ChatMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | null;
}

/**
 * Chat completion chunk (streaming response)
 */
export interface ChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
}

/**
 * Usage statistics
 */
export interface CompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

/**
 * Full chat completion response (non-streaming)
 */
export interface ChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: ChatCompletionChoice[];
  usage: CompletionUsage;
}
