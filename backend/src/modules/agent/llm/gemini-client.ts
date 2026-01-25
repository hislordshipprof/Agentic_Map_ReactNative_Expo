/**
 * GeminiClient wrapper for agent module
 *
 * Provides a simple interface to call Gemini API for the orchestrator
 * and understanding agents.
 */

import { Logger } from '@nestjs/common';
import { generateContent } from '../../nlu/gemini-client';

/**
 * Gemini client for agent operations
 */
export class GeminiClient {
  private readonly logger = new Logger(GeminiClient.name);
  private apiKey: string;
  private model: string;

  constructor(model?: string) {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    // Use environment variable for model, matching existing pattern in codebase
    this.model = model || process.env.GEMINI_FAST_MODEL || 'gemini-2.0-flash';

    if (!this.apiKey) {
      this.logger.warn('GEMINI_API_KEY not set - LLM calls will fail');
    }
  }

  /**
   * Generate text completion
   */
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const system = systemPrompt || 'You are a helpful navigation assistant.';

    try {
      const response = await generateContent(
        this.apiKey,
        this.model,
        system,
        prompt,
      );
      return response;
    } catch (error) {
      this.logger.error('Generation error:', error);
      throw error;
    }
  }

  /**
   * Generate JSON completion (parses response as JSON)
   */
  async generateJson<T>(prompt: string, systemPrompt?: string): Promise<T> {
    const response = await this.generate(prompt, systemPrompt);

    // Extract JSON from response (may be wrapped in markdown code blocks)
    let jsonStr = response;

    // Remove markdown code blocks if present
    const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    try {
      return JSON.parse(jsonStr) as T;
    } catch {
      throw new Error(`Failed to parse LLM response as JSON: ${response}`);
    }
  }
}
