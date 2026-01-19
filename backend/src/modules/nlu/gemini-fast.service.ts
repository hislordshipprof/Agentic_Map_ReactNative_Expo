import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateContent } from './gemini-client';

const SYSTEM = `You are a travel assistant NLU parser. Parse the user's request and extract:
- intent: One of [navigate_with_stops, navigate_direct, find_place, add_stop, remove_stop, modify_route, get_suggestions, set_anchor, confirm, deny, cancel, unknown]
- destination (if applicable): Where are they going? (e.g., 'home', 'work', address)
- stops (if applicable): What stops do they want? (array of strings)
- confidence: Your confidence in this interpretation (0.0 to 1.0)
- requires_advanced: Set true if request is ambiguous or needs complex reasoning

Return JSON only: { "intent": string, "destination": string|null, "stops": string[], "confidence": number, "requires_advanced": boolean }`;

export interface FastAgentResult {
  intent: string;
  destination?: string | null;
  stops?: string[];
  confidence: number;
  requires_advanced: boolean;
}

@Injectable()
export class GeminiFastService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') ?? '';
    this.model = this.config.get<string>('GEMINI_FAST_MODEL') ?? 'gemini-2.0-flash-exp';
  }

  async parse(utterance: string): Promise<FastAgentResult> {
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
    const raw = await generateContent(this.apiKey, this.model, SYSTEM, utterance);
    const cleaned = raw.replace(/```json?\s*|\s*```/g, '').trim();
    let obj: unknown;
    try {
      obj = JSON.parse(cleaned);
    } catch {
      return {
        intent: 'unknown',
        confidence: 0,
        requires_advanced: true,
      };
    }
    const o = obj as Record<string, unknown>;
    return {
      intent: typeof o.intent === 'string' ? o.intent : 'unknown',
      destination: o.destination != null ? String(o.destination) : null,
      stops: Array.isArray(o.stops) ? o.stops.map(String) : [],
      confidence: typeof o.confidence === 'number' ? Math.max(0, Math.min(1, o.confidence)) : 0,
      requires_advanced: Boolean(o.requires_advanced),
    };
  }
}
