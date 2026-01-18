/**
 * NLU Types - Agentic Mobile Map
 *
 * Type definitions for natural language understanding,
 * confidence levels, intents, and entities.
 * Per requirements-frontend.md Phase 2.1
 */

/**
 * Confidence level thresholds
 * Per CLAUDE.md Three-Tier Confidence System
 */
export const ConfidenceThreshold = {
  HIGH: 0.80,    // Execute immediately
  MEDIUM: 0.60,  // Show confirmation dialog
  // Below 0.60 is LOW - escalate to advanced agent
} as const;

/**
 * Confidence level classification
 */
export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW';

/**
 * Get confidence level from score
 */
export const getConfidenceLevel = (score: number): ConfidenceLevel => {
  if (score >= ConfidenceThreshold.HIGH) return 'HIGH';
  if (score >= ConfidenceThreshold.MEDIUM) return 'MEDIUM';
  return 'LOW';
};

/**
 * Intent types the system can recognize
 */
export type Intent =
  | 'navigate_with_stops'     // Main use case: "Take me home with Starbucks"
  | 'navigate_direct'         // Direct navigation: "Take me to Target"
  | 'find_place'              // Place search: "Find coffee shops nearby"
  | 'add_stop'                // Add to existing route: "Add a gas station"
  | 'remove_stop'             // Remove from route: "Skip Walmart"
  | 'modify_route'            // Change route: "Use a different Starbucks"
  | 'get_suggestions'         // Proactive: "What's on my way?"
  | 'set_anchor'              // Save location: "Save this as Home"
  | 'confirm'                 // Affirmative: "Yes", "That's right"
  | 'deny'                    // Negative: "No", "That's wrong"
  | 'cancel'                  // Cancel: "Never mind", "Cancel"
  | 'unknown';                // Could not determine intent

/**
 * Entity types extracted from utterances
 */
export interface Entities {
  /** Destination (resolved or raw) */
  destination?: string;
  /** List of requested stops */
  stops?: string[];
  /** Search radius preference */
  radius?: number;
  /** Specific place name */
  placeName?: string;
  /** Place category (coffee, gas, grocery) */
  category?: string;
  /** Anchor reference (home, work) */
  anchorReference?: string;
  /** Time constraint */
  timeConstraint?: string;
  /** Order preference (nearest, fastest) */
  orderPreference?: 'nearest' | 'fastest' | 'cheapest';
  /** Selected place ID after disambiguation */
  selectedPlaceId?: string;
  /** Disambiguation candidates (when multiple matches) */
  disambiguationCandidates?: Array<{
    id: string;
    name: string;
    address: string;
  }>;
}

/**
 * NLU response from backend
 */
export interface NLUResponse {
  /** Detected intent */
  intent: Intent;
  /** Confidence score (0-1) */
  confidence: number;
  /** Extracted entities */
  entities: Entities;
  /** Which agent processed this (fast or advanced) */
  agent: 'fast' | 'advanced';
  /** Raw utterance */
  utterance: string;
  /** Processing time in ms */
  processingTime: number;
}

/**
 * NLU state for Redux slice
 */
export interface NLUState {
  /** Last detected intent */
  lastIntent: Intent | null;
  /** Last confidence score */
  lastConfidence: number | null;
  /** Current extracted entities */
  currentEntities: Entities;
  /** Whether confirmation is required (medium confidence) */
  confirmationRequired: boolean;
  /** Number of low confidence retries */
  lowConfidenceRetries: number;
  /** Whether escalation to advanced agent is in progress */
  isEscalating: boolean;
  /** Last NLU response for reference */
  lastResponse: NLUResponse | null;
}

/**
 * Initial NLU state
 */
export const initialNLUState: NLUState = {
  lastIntent: null,
  lastConfidence: null,
  currentEntities: {},
  confirmationRequired: false,
  lowConfidenceRetries: 0,
  isEscalating: false,
  lastResponse: null,
};

/**
 * Check if intent requires stops
 */
export const isStopIntent = (intent: Intent): boolean => {
  return ['navigate_with_stops', 'add_stop', 'get_suggestions'].includes(intent);
};

/**
 * Check if intent is navigational
 */
export const isNavigationIntent = (intent: Intent): boolean => {
  return ['navigate_with_stops', 'navigate_direct', 'modify_route'].includes(intent);
};

/**
 * Check if confirmation/denial response
 */
export const isResponseIntent = (intent: Intent): boolean => {
  return ['confirm', 'deny', 'cancel'].includes(intent);
};

/**
 * Get human-readable intent description
 */
export const getIntentDescription = (intent: Intent): string => {
  const descriptions: Record<Intent, string> = {
    navigate_with_stops: 'Plan a multi-stop trip',
    navigate_direct: 'Navigate to a destination',
    find_place: 'Find a place nearby',
    add_stop: 'Add a stop to your route',
    remove_stop: 'Remove a stop from your route',
    modify_route: 'Change your route',
    get_suggestions: 'Get stop suggestions',
    set_anchor: 'Save a location',
    confirm: 'Confirm',
    deny: 'Deny',
    cancel: 'Cancel',
    unknown: 'Unknown request',
  };
  return descriptions[intent];
};
