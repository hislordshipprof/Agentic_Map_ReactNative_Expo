/**
 * NLU confidence thresholds.
 * Per requirements-backend 3.1 and useNLUFlow.
 */

export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.8,    // >= 0.80: execute immediately
  MEDIUM: 0.6,  // 0.60-0.79: show confirmation
  // < 0.60: LOW, offer alternatives / escalate
} as const;
