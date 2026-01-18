/**
 * User Types - Agentic Mobile Map
 *
 * Type definitions for user data, anchors, and preferences.
 * Per requirements-frontend.md Phase 1.4 User Slice
 */

import { LatLng } from './route';

/**
 * Anchor type (saved location type)
 */
export type AnchorType = 'home' | 'work' | 'custom';

/**
 * User's saved anchor location
 */
export interface Anchor {
  id: string;
  name: string;
  location: LatLng;
  address?: string;
  type: AnchorType;
  /** Icon identifier for display */
  icon?: string;
  /** When this anchor was last used */
  lastUsed?: number;
  /** When this anchor was created */
  createdAt: number;
}

/**
 * Place category preferences
 */
export type PlaceCategory =
  | 'coffee'
  | 'gas'
  | 'grocery'
  | 'restaurant'
  | 'pharmacy'
  | 'atm'
  | 'convenience'
  | 'other';

/**
 * User preferences for route optimization
 */
export interface UserPreferences {
  /** Maximum detour as percentage of route (0.05 = 5%) */
  maxDetourPercentage: number;
  /** Maximum detour in minutes */
  maxDetourMinutes: number;
  /** Preferred stop categories (ordered by preference) */
  preferredStopCategories: PlaceCategory[];
  /** Avoid toll roads */
  avoidTolls: boolean;
  /** Avoid highways */
  avoidHighways: boolean;
  /** Preferred distance unit */
  distanceUnit: 'miles' | 'kilometers';
  /** Show ratings in search results */
  showRatings: boolean;
  /** Show open/closed status */
  showOpenStatus: boolean;
}

/**
 * Default user preferences
 */
export const defaultPreferences: UserPreferences = {
  maxDetourPercentage: 0.07,  // 7%
  maxDetourMinutes: 5,
  preferredStopCategories: ['coffee', 'gas', 'grocery'],
  avoidTolls: false,
  avoidHighways: false,
  distanceUnit: 'miles',
  showRatings: true,
  showOpenStatus: true,
};

/**
 * Conversation history entry for learning
 */
export interface ConversationHistoryEntry {
  id: string;
  utterance: string;
  intent: string;
  entities: Record<string, unknown>;
  timestamp: number;
  /** Whether user confirmed/accepted the result */
  wasSuccessful: boolean;
}

/**
 * User state for Redux slice
 */
export interface UserState {
  /** User's saved anchor locations */
  anchors: Anchor[];
  /** User preferences */
  preferences: UserPreferences;
  /** Recent conversation history for learning */
  conversationHistory: ConversationHistoryEntry[];
  /** Loading state */
  isLoading: boolean;
  /** Error message */
  error: string | null;
}

/**
 * Initial user state
 */
export const initialUserState: UserState = {
  anchors: [],
  preferences: defaultPreferences,
  conversationHistory: [],
  isLoading: false,
  error: null,
};

/**
 * Find anchor by name (case-insensitive)
 */
export const findAnchorByName = (
  anchors: Anchor[],
  name: string
): Anchor | undefined => {
  const lowerName = name.toLowerCase();
  return anchors.find(
    (a) => a.name.toLowerCase() === lowerName || a.type === lowerName
  );
};

/**
 * Get anchor icon based on type
 */
export const getAnchorIcon = (type: AnchorType): string => {
  switch (type) {
    case 'home':
      return 'home';
    case 'work':
      return 'briefcase';
    default:
      return 'location';
  }
};

/**
 * Get category icon
 */
export const getCategoryIcon = (category: PlaceCategory): string => {
  const icons: Record<PlaceCategory, string> = {
    coffee: 'cafe',
    gas: 'car',
    grocery: 'cart',
    restaurant: 'restaurant',
    pharmacy: 'medical',
    atm: 'card',
    convenience: 'storefront',
    other: 'location',
  };
  return icons[category];
};
