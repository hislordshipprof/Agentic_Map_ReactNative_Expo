/**
 * useNLUFlow Hook - Agentic Mobile Map
 *
 * Core hook for managing NLU confidence-based UI flows.
 * Per requirements-frontend.md Phase 2.1:
 * - HIGH (≥0.80): Execute immediately, show results
 * - MEDIUM (0.60-0.79): Show confirmation dialog
 * - LOW (<0.60): Show alternatives dialog
 * - Escalation to Gemini 3.0 Pro after 2 failed attempts
 *
 * Per CLAUDE.md:
 * - Gemini 2.5 Pro handles ~85% of requests
 * - Escalates to Gemini 3.0 Pro when confidence < 0.60
 */

import { useState, useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  processNLUResponse,
  setIntent,
  updateEntities,
  setConfirmationRequired,
  confirmIntent,
  startEscalation,
  resetRetries,
  clearNLU,
} from '@/redux/slices';
import type { NLUResponse, Intent, Entities, ConfidenceLevel } from '@/types/nlu';
import { errandApi } from '@/services/api/errand';

/**
 * Confidence thresholds per requirements
 */
export const CONFIDENCE_THRESHOLDS = {
  HIGH: 0.80,
  MEDIUM: 0.60,
  MAX_RETRIES: 2,
} as const;

/**
 * Flow state for UI control
 */
export type NLUFlowState =
  | 'idle'
  | 'processing'
  | 'high_confidence'
  | 'confirmation_required'
  | 'alternatives_required'
  | 'disambiguation_required'
  | 'escalating'
  | 'error';

/**
 * Hook result type
 */
export interface UseNLUFlowResult {
  // Current flow state
  flowState: NLUFlowState;

  // NLU data
  intent: Intent | null;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  entities: Entities;
  isConfirmationRequired: boolean;

  // Escalation state
  isEscalating: boolean;
  retryCount: number;

  // Actions
  processUtterance: (utterance: string, currentLocation?: { lat: number; lng: number }) => Promise<void>;
  onNLUResponse: (response: NLUResponse) => void;
  confirmCurrentIntent: () => void;
  rejectAndRephrase: () => void;
  selectAlternative: (alternativeId: string) => void;
  handleDisambiguation: (selectedId: string) => void;
  reset: () => void;

  // Helpers
  getConfidenceLevel: (score: number) => ConfidenceLevel;
  shouldShowConfirmation: () => boolean;
  shouldShowAlternatives: () => boolean;
  shouldEscalate: () => boolean;
}

/**
 * Determine confidence level from score
 */
export const getConfidenceLevel = (score: number): ConfidenceLevel => {
  if (score >= CONFIDENCE_THRESHOLDS.HIGH) return 'HIGH';
  if (score >= CONFIDENCE_THRESHOLDS.MEDIUM) return 'MEDIUM';
  return 'LOW';
};

/**
 * useNLUFlow Hook
 *
 * Manages the NLU confidence-based routing logic for the conversation UI.
 * Coordinates between Redux state and dialog display decisions.
 */
export const useNLUFlow = (): UseNLUFlowResult => {
  const dispatch = useAppDispatch();

  // Select NLU state from Redux
  const nluState = useAppSelector((state) => state.nlu);
  const {
    lastIntent,
    lastConfidence,
    currentEntities,
    confirmationRequired,
    isEscalating,
    lowConfidenceRetries,
  } = nluState;

  // Local flow state for UI control
  const [flowState, setFlowState] = useState<NLUFlowState>('idle');

  /**
   * Calculate current confidence level
   */
  const confidenceLevel = useMemo(
    () => getConfidenceLevel(lastConfidence ?? 0),
    [lastConfidence]
  );

  /**
   * Handle NLU API response (called by API service)
   * Use this when you have an NLU response from the API
   */
  const onNLUResponse = useCallback(
    (response: NLUResponse) => {
      dispatch(processNLUResponse(response));

      const level = getConfidenceLevel(response.confidence);

      switch (level) {
        case 'HIGH':
          setFlowState('high_confidence');
          dispatch(setConfirmationRequired(false));
          break;

        case 'MEDIUM':
          setFlowState('confirmation_required');
          dispatch(setConfirmationRequired(true));
          break;

        case 'LOW':
          if (lowConfidenceRetries >= CONFIDENCE_THRESHOLDS.MAX_RETRIES) {
            setFlowState('escalating');
            dispatch(startEscalation());
          } else {
            setFlowState('alternatives_required');
          }
          break;
      }

      // Check for disambiguation needs (if entities have multiple candidates)
      if (response.entities.disambiguationCandidates?.length) {
        setFlowState('disambiguation_required');
      }
    },
    [dispatch, lowConfidenceRetries]
  );

  /**
   * Process a user utterance and determine the flow
   */
  const processUtterance = useCallback(
    async (utterance: string, currentLocation?: { lat: number; lng: number }) => {
      setFlowState('processing');

      try {
        const res = await errandApi.processNLU({
          utterance,
          currentLocation,
          context: undefined,
        });
        if (!res.success || res.error) {
          setFlowState('error');
          throw new Error(res.error?.message ?? 'Could not understand. Please try again.');
        }
        if (res.success && res.data) {
          onNLUResponse(res.data);
        }
      } catch (error) {
        setFlowState('error');
        console.error('NLU processing error:', error);
        throw error instanceof Error ? error : new Error(String(error));
      }
    },
    [onNLUResponse]
  );

  /**
   * User confirms the understood intent (MEDIUM confidence flow)
   */
  const confirmCurrentIntent = useCallback(() => {
    dispatch(confirmIntent());
    dispatch(setConfirmationRequired(false));
    setFlowState('high_confidence'); // Proceed as if high confidence
  }, [dispatch]);

  /**
   * User wants to rephrase (rejects current understanding)
   */
  const rejectAndRephrase = useCallback(() => {
    dispatch(setConfirmationRequired(false));
    setFlowState('idle');
    // Increment retry count is handled by the conversationSlice
  }, [dispatch]);

  /**
   * User selects an alternative from the LOW confidence dialog
   */
  const selectAlternative = useCallback(
    (alternativeId: string) => {
      // Map alternative to intent and update state
      dispatch(setIntent(alternativeId as Intent));
      dispatch(setConfirmationRequired(false));
      dispatch(resetRetries());
      setFlowState('high_confidence');
    },
    [dispatch]
  );

  /**
   * User selects a disambiguation option
   */
  const handleDisambiguation = useCallback(
    (selectedId: string) => {
      // Update entities with the disambiguated selection
      dispatch(
        updateEntities({
          selectedPlaceId: selectedId,
        })
      );
      setFlowState('high_confidence');
    },
    [dispatch]
  );

  /**
   * Reset the NLU flow to initial state
   */
  const reset = useCallback(() => {
    dispatch(clearNLU());
    setFlowState('idle');
  }, [dispatch]);

  /**
   * Helper: Should we show the confirmation dialog?
   */
  const shouldShowConfirmation = useCallback(() => {
    return (
      flowState === 'confirmation_required' ||
      (confidenceLevel === 'MEDIUM' && confirmationRequired)
    );
  }, [flowState, confidenceLevel, confirmationRequired]);

  /**
   * Helper: Should we show the alternatives dialog?
   * Only when we have explicitly entered alternatives_required from an NLU LOW response.
   */
  const shouldShowAlternatives = useCallback(() => {
    return flowState === 'alternatives_required';
  }, [flowState]);

  /**
   * Helper: Should we escalate to Gemini 3.0 Pro?
   */
  const shouldEscalate = useCallback(() => {
    return (
      confidenceLevel === 'LOW' &&
      lowConfidenceRetries >= CONFIDENCE_THRESHOLDS.MAX_RETRIES
    );
  }, [confidenceLevel, lowConfidenceRetries]);

  return {
    // State
    flowState,
    intent: lastIntent,
    confidence: lastConfidence ?? 0,
    confidenceLevel,
    entities: currentEntities,
    isConfirmationRequired: confirmationRequired,
    isEscalating,
    retryCount: lowConfidenceRetries,

    // Actions
    processUtterance,
    onNLUResponse,
    confirmCurrentIntent,
    rejectAndRephrase,
    selectAlternative,
    handleDisambiguation,
    reset,

    // Helpers
    getConfidenceLevel,
    shouldShowConfirmation,
    shouldShowAlternatives,
    shouldEscalate,
  };
};

export default useNLUFlow;
