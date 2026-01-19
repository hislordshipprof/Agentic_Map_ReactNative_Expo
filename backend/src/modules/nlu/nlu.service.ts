import { Injectable } from '@nestjs/common';
import type { GeminiAdvancedService } from './gemini-advanced.service';
import type { GeminiFastService } from './gemini-fast.service';
import { ConfidenceRouterService } from './confidence-router.service';

export interface NLUResponse {
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
  agent: 'fast' | 'advanced';
  utterance: string;
  processingTime: number;
}

@Injectable()
export class NluService {
  constructor(
    private readonly fast: GeminiFastService,
    private readonly advanced: GeminiAdvancedService,
    private readonly router: ConfidenceRouterService,
  ) {}

  async process(utterance: string, _context?: { previousIntent?: string; previousEntities?: unknown; conversationId?: string }): Promise<NLUResponse> {
    const t0 = Date.now();
    const fastResult = await this.fast.parse(utterance);
    const decision = this.router.routeByConfidence(fastResult);

    if (decision.shouldEscalate) {
      const adv = await this.advanced.process(utterance, {
        previousResult: JSON.stringify(fastResult),
      });
      const processingTime = Date.now() - t0;
      return {
        intent: adv.intent,
        confidence: adv.confidence,
        entities: { destination: adv.destination, stops: adv.stops },
        agent: 'advanced',
        utterance,
        processingTime,
      };
    }

    const processingTime = Date.now() - t0;
    return {
      intent: fastResult.intent,
      confidence: fastResult.confidence,
      entities: { destination: fastResult.destination, stops: fastResult.stops },
      agent: 'fast',
      utterance,
      processingTime,
    };
  }

  async escalate(
    utterance: string,
    context?: { conversationHistory?: Array<{ role: string; content: string }> },
  ): Promise<NLUResponse> {
    const t0 = Date.now();
    const history = context?.conversationHistory
      ?.map((m) => `${m.role}: ${m.content}`)
      .join('\n');
    const adv = await this.advanced.process(utterance, { history });
    const processingTime = Date.now() - t0;
    return {
      intent: adv.intent,
      confidence: adv.confidence,
      entities: { destination: adv.destination, stops: adv.stops },
      agent: 'advanced',
      utterance,
      processingTime,
    };
  }
}
