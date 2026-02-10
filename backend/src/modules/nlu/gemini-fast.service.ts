import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateContent, generateContentMultiTurn, GeminiMessage } from './gemini-client';

const SYSTEM = `You are a friendly travel assistant that helps users plan multi-stop journeys.

You MUST return valid JSON in one of two formats:

1. When you can confidently extract a navigation intent (user provides destination/stops):
{ "type": "action", "intent": "<intent>", "destination": "<destination>|null", "stops": ["<stop1>", ...], "confidence": <0.0-1.0>, "requires_advanced": <bool> }

Intents: navigate_with_stops, navigate_direct, find_place, add_stop, remove_stop, modify_route, get_suggestions, set_anchor, confirm, deny, cancel, unknown

2. When the user is chatting, info is missing, or you need clarification:
{ "type": "conversation", "message": "<your friendly reply>", "missingInfo": ["<what you still need>"] }

Use "conversation" when:
- The user greets you or makes small talk ("hi", "hello", "how are you")
- The request is vague ("I need to run errands" - ask where they want to go)
- Key info is missing (no destination mentioned)
- You need to clarify something

Use "action" when:
- You can confidently extract destination and/or stops
- The user confirms or denies something
- The user gives a clear navigation command

Examples:
- "hi" → { "type": "conversation", "message": "Hey! Where would you like to go today?", "missingInfo": ["destination"] }
- "I need to run some errands" → { "type": "conversation", "message": "Sure! Where do you need to go? Tell me your stops and destination.", "missingInfo": ["destination", "stops"] }
- "Take me to Starbucks" → { "type": "action", "intent": "navigate_direct", "destination": "Starbucks", "stops": [], "confidence": 0.95, "requires_advanced": false }
- "Take me home with Starbucks on the way" → { "type": "action", "intent": "navigate_with_stops", "destination": "home", "stops": ["Starbucks"], "confidence": 0.95, "requires_advanced": false }
- "Take me to A then B then C" → { "type": "action", "intent": "navigate_with_stops", "destination": "C", "stops": ["A", "B"], "confidence": 0.90, "requires_advanced": false }

IMPORTANT: The LAST place mentioned is always the destination. Earlier places are stops.
Return JSON only, no markdown fences.`;

export interface FastAgentResult {
  type?: 'action' | 'conversation';
  intent: string;
  destination?: string | null;
  stops?: string[];
  confidence: number;
  requires_advanced: boolean;
  message?: string;
  missingInfo?: string[];
}

@Injectable()
export class GeminiFastService {
  private readonly apiKey: string;
  private readonly model: string;

  constructor(private config: ConfigService) {
    this.apiKey = this.config.get<string>('GEMINI_API_KEY') ?? '';
    this.model = this.config.get<string>('GEMINI_FAST_MODEL') ?? 'gemini-2.0-flash-exp';
  }

  async parse(
    utterance: string,
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<FastAgentResult> {
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

    let raw: string;
    if (conversationHistory && conversationHistory.length > 0) {
      const contents: GeminiMessage[] = conversationHistory.map((m) => ({
        role: m.role === 'model' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      contents.push({ role: 'user', parts: [{ text: utterance }] });
      raw = await generateContentMultiTurn(this.apiKey, this.model, SYSTEM, contents);
    } else {
      raw = await generateContent(this.apiKey, this.model, SYSTEM, utterance);
    }

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

    if (o.type === 'conversation') {
      return {
        type: 'conversation',
        intent: 'unknown',
        confidence: 0,
        requires_advanced: false,
        message: typeof o.message === 'string' ? o.message : 'How can I help you?',
        missingInfo: Array.isArray(o.missingInfo) ? o.missingInfo.map(String) : [],
      };
    }

    return {
      type: 'action',
      intent: typeof o.intent === 'string' ? o.intent : 'unknown',
      destination: o.destination != null ? String(o.destination) : null,
      stops: Array.isArray(o.stops) ? o.stops.map(String) : [],
      confidence: typeof o.confidence === 'number' ? Math.max(0, Math.min(1, o.confidence)) : 0,
      requires_advanced: Boolean(o.requires_advanced),
    };
  }
}
