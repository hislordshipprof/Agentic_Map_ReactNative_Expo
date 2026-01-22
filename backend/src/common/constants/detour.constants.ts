/**
 * Detour buffer configuration.
 * Per FINAL_REQUIREMENTS.md - Route Planning Algorithm.
 */

// Buffer calculation based on route distance
export const DETOUR_BUFFER_PERCENTAGES = {
  short: { maxDistanceM: 3219, percentage: 0.1 },   // <= 2 miles: 10%
  medium: { maxDistanceM: 16093, percentage: 0.07 }, // <= 10 miles: 7%
  long: { percentage: 0.05 },                        // > 10 miles: 5%
} as const;

export const DETOUR_ABSOLUTE_BOUNDS = {
  minBufferM: 400,   // 0.25 miles
  maxBufferM: 1600,  // 1 mile
} as const;

export const NO_DETOUR_THRESHOLD_M = 50; // 0-50m extra = NO_DETOUR

/**
 * Time-based detour categories (per FINAL_REQUIREMENTS.md)
 * - MINIMAL: 0-5 minutes - proceed silently
 * - SIGNIFICANT: 5-10 minutes - warn user
 * - FAR: 10+ minutes - warn strongly, ask confirmation
 */
export const DETOUR_TIME_CATEGORIES = {
  MINIMAL: { maxMinutes: 5, action: 'proceed' },
  SIGNIFICANT: { maxMinutes: 10, action: 'warn' },
  FAR: { maxMinutes: Infinity, action: 'warn_strongly' },
} as const;

export type DetourCategory = 'MINIMAL' | 'SIGNIFICANT' | 'FAR';

// Legacy status type (for backwards compatibility)
export type DetourStatus =
  | 'NO_DETOUR'       // 0-50m extra
  | 'MINIMAL'         // <= 25% of buffer
  | 'ACCEPTABLE'      // 26-75% of buffer
  | 'NOT_RECOMMENDED'; // > 75% of buffer

/**
 * Get detour category from extra time in minutes
 */
export function categorizeDetour(extraMinutes: number): DetourCategory {
  if (extraMinutes <= DETOUR_TIME_CATEGORIES.MINIMAL.maxMinutes) {
    return 'MINIMAL';
  }
  if (extraMinutes <= DETOUR_TIME_CATEGORIES.SIGNIFICANT.maxMinutes) {
    return 'SIGNIFICANT';
  }
  return 'FAR';
}

/**
 * Get warning message for a detour category
 */
export function getDetourWarningMessage(category: DetourCategory, extraMinutes: number): string {
  const roundedMinutes = Math.round(extraMinutes);
  switch (category) {
    case 'SIGNIFICANT':
      return `This adds about ${roundedMinutes} minutes to your trip.`;
    case 'FAR':
      return `This is ${roundedMinutes} minutes out of your way. Are you sure?`;
    default:
      return '';
  }
}
