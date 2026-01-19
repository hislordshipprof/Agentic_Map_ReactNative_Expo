import { Injectable } from '@nestjs/common';
import { CONFIDENCE_THRESHOLDS } from '../../common/constants/confidence.constants';
import type { FastAgentResult } from './gemini-fast.service';

export type RoutingAction = 'EXECUTE' | 'CONFIRM' | 'CLARIFY' | 'ESCALATE_TO_ADVANCED';

export interface RoutingDecision {
  action: RoutingAction;
  confidence: number;
  shouldEscalate: boolean;
}

@Injectable()
export class ConfidenceRouterService {
  routeByConfidence(result: FastAgentResult): RoutingDecision {
    const { confidence, requires_advanced } = result;
    const shouldEscalate = confidence < CONFIDENCE_THRESHOLDS.MEDIUM || requires_advanced;

    let action: RoutingAction = 'EXECUTE';
    if (shouldEscalate) action = 'ESCALATE_TO_ADVANCED';
    else if (confidence < CONFIDENCE_THRESHOLDS.HIGH) action = 'CONFIRM';

    return { action, confidence, shouldEscalate };
  }

  shouldEscalateToAdvanced(result: FastAgentResult): boolean {
    return result.confidence < CONFIDENCE_THRESHOLDS.MEDIUM || result.requires_advanced;
  }
}
