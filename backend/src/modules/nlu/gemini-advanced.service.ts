import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateContent } from './gemini-client';

const SYSTEM = `You are an advanced travel assistant with complex reasoning capabilities.
The fast parser returned a low-confidence result. Apply deeper analysis.

Analyze the request considering:
1. Possible ambiguities in destination or stops
2. Implicit preferences or context clues
3. Common user patterns
4. Alternative interpretations

Return JSON only: {
  "intent": string (one of: navigate_with_stops, navigate_direct, find_place, add_stop, remove_stop, modify_route, get_suggestions, set_anchor, confirm, deny, cancel, unknown),
  "destination": string|null,
  "stops": string[],
  "confidence": number (0.0-1.0),
  "disambiguation_needed": boolean,
  "reasoning": string
}`;

export interface AdvancedAgentResult {
  intent: string;
  destination?: string | null;
  stops?: string[];
  confidence: number;
  disambiguation_needed?: boolean;
  reasoning?: string;
}

@Injectable()
export class GeminiAdvancedService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') ?? '';
    this.model = this.config.get<string>('GEMINI_ADVANCED_MODEL') ?? 'gemini-2.0-flash-exp';
  }

  async process(utterance: string, context?: { previousResult?: string; history?: string }): Promise<AdvancedAgentResult> {
    if (!this.apiKey?.trim()) {
      throw new HttpException(
        {
          error: {
            code: 'MISSING_API_KEY',
            message: 'GEMINI_API_KEY is not set. Add it to .env or set the environment variable.',
            suggestions: ['Copy .env.example to .env and set GEMINI_API_KEY', 'Get a key at https://aistudio.google.com/apikey'],
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    let user = utterance;
    if (context?.previousResult) user = `Previous parse: ${context.previousResult}\n\nUser: ${utterance}`;
    if (context?.history) user = `Context: ${context.history}\n\nUser: ${user}`;

    const raw = await generateContent(this.apiKey, this.model, SYSTEM, user);
    const cleaned = raw.replace(/```json?\s*|\s*```/g, '').trim();
    let obj: unknown;
    try {
      obj = JSON.parse(cleaned);
    } catch {
      return { intent: 'unknown', confidence: 0 };
    }
    const o = obj as Record<string, unknown>;
    return {
      intent: typeof o.intent === 'string' ? o.intent : 'unknown',
      destination: o.destination != null ? String(o.destination) : null,
      stops: Array.isArray(o.stops) ? o.stops.map(String) : [],
      confidence: typeof o.confidence === 'number' ? Math.max(0, Math.min(1, o.confidence)) : 0,
      disambiguation_needed: Boolean(o.disambiguation_needed),
      reasoning: typeof o.reasoning === 'string' ? o.reasoning : undefined,
    };
  }
}
