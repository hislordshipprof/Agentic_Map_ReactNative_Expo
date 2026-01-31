import { Injectable, Logger } from '@nestjs/common';
import { GeminiAdvancedService } from './gemini-advanced.service';
import { GeminiFastService } from './gemini-fast.service';
import { ConfidenceRouterService } from './confidence-router.service';

export interface NLUResponse {
  type?: 'action' | 'conversation';
  intent: string;
  confidence: number;
  entities: Record<string, unknown>;
  agent: 'fast' | 'advanced';
  utterance: string;
  processingTime: number;
  message?: string;
  missingInfo?: string[];
}

@Injectable()
export class NluService {
  private readonly logger = new Logger(NluService.name);

  constructor(
    private readonly fast: GeminiFastService,
    private readonly advanced: GeminiAdvancedService,
    private readonly router: ConfidenceRouterService,
  ) {}

  async process(
    utterance: string,
    context?: { previousIntent?: string; previousEntities?: unknown; conversationId?: string },
    conversationHistory?: Array<{ role: string; content: string }>,
  ): Promise<NLUResponse> {
    this.logger.log(`[process] Utterance: "${utterance}", history=${conversationHistory?.length ?? 0} msgs`);
    const t0 = Date.now();
    const fastResult = await this.fast.parse(utterance, conversationHistory);
    this.logger.log(`[process] Fast result: type=${fastResult.type}, intent=${fastResult.intent}, confidence=${fastResult.confidence}, dest=${fastResult.destination}, stops=${JSON.stringify(fastResult.stops)}`);
    // Conversational response: skip confidence routing, return immediately
    if (fastResult.type === 'conversation') {
      const processingTime = Date.now() - t0;
      this.logger.log(`[process] Conversational response: "${fastResult.message}"`);
      return {
        type: 'conversation',
        intent: 'unknown',
        confidence: 0,
        entities: {},
        agent: 'fast',
        utterance,
        processingTime,
        message: fastResult.message,
        missingInfo: fastResult.missingInfo,
      };
    }

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

    // Fallback: if no destination but stops exist, use last stop as destination
    let destination = fastResult.destination;
    let stops = fastResult.stops ?? [];
    if (!destination && stops.length > 0) {
      destination = stops[stops.length - 1];
      stops = stops.slice(0, -1);
      this.logger.log(`[process] Fallback: using last stop "${destination}" as destination`);
    }

    const processingTime = Date.now() - t0;
    const response: NLUResponse = {
      type: 'action',
      intent: fastResult.intent,
      confidence: fastResult.confidence,
      entities: { destination, stops },
      agent: 'fast' as const,
      utterance,
      processingTime,
    };
    this.logger.log(`[process] Returning: intent=${response.intent}, confidence=${response.confidence}, entities=${JSON.stringify(response.entities)}`);
    return response;
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
