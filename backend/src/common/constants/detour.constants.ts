/**
 * Detour buffer configuration.
 * Per requirements-backend 2.1 and IMPLEMENTATION_PLAN §6.
 */

export const DETOUR_CATEGORIES = {
  short: { maxDistanceM: 3219, percentage: 0.1 },   // <= 2 miles: 10%
  medium: { maxDistanceM: 16093, percentage: 0.07 }, // <= 10 miles: 7%
  long: { percentage: 0.05 },                        // > 10 miles: 5%
} as const;

export const DETOUR_ABSOLUTE_BOUNDS = {
  minBufferM: 400,   // 0.25 miles
  maxBufferM: 1600,  // 1 mile
} as const;

export const NO_DETOUR_THRESHOLD_M = 50; // 0-50m extra = NO_DETOUR

export type DetourStatus =
  | 'NO_DETOUR'       // 0-50m extra
  | 'MINIMAL'         // <= 25% of buffer
  | 'ACCEPTABLE'      // 26-75% of buffer
  | 'NOT_RECOMMENDED'; // > 75% of buffer
