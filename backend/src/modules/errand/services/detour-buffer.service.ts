import { Injectable } from '@nestjs/common';
import {
  DETOUR_BUFFER_PERCENTAGES,
  DETOUR_ABSOLUTE_BOUNDS,
  NO_DETOUR_THRESHOLD_M,
  DetourStatus,
  DetourCategory,
  categorizeDetour,
  getDetourWarningMessage,
} from '../../../common/constants/detour.constants';

@Injectable()
export class DetourBufferService {
  /**
   * Calculate dynamic buffer in meters based on direct route distance.
   * Short (<=2mi): 10%; Medium (<=10mi): 7%; Long: 5%.
   * Clamped to [400m, 1600m].
   */
  calculateBuffer(distanceM: number): number {
    let percentage: number;
    if (distanceM <= DETOUR_BUFFER_PERCENTAGES.short.maxDistanceM) {
      percentage = DETOUR_BUFFER_PERCENTAGES.short.percentage;
    } else if (distanceM <= DETOUR_BUFFER_PERCENTAGES.medium.maxDistanceM) {
      percentage = DETOUR_BUFFER_PERCENTAGES.medium.percentage;
    } else {
      percentage = DETOUR_BUFFER_PERCENTAGES.long.percentage;
    }
    const bufferM = distanceM * percentage;
    return Math.max(
      DETOUR_ABSOLUTE_BOUNDS.minBufferM,
      Math.min(DETOUR_ABSOLUTE_BOUNDS.maxBufferM, bufferM),
    );
  }

  /**
   * Get detour status from extra distance and buffer (legacy).
   */
  getDetourStatus(extraDistanceM: number, bufferM: number): DetourStatus {
    if (extraDistanceM <= NO_DETOUR_THRESHOLD_M) return 'NO_DETOUR';
    const ratio = extraDistanceM / bufferM;
    if (ratio <= 0.25) return 'MINIMAL';
    if (ratio <= 0.75) return 'ACCEPTABLE';
    return 'NOT_RECOMMENDED';
  }

  /**
   * Get time-based detour category from extra time in minutes.
   * MINIMAL (0-5 min), SIGNIFICANT (5-10 min), FAR (10+ min)
   */
  getDetourCategory(extraMinutes: number): DetourCategory {
    return categorizeDetour(extraMinutes);
  }

  /**
   * Get warning message for a detour category.
   */
  getWarningMessage(category: DetourCategory, extraMinutes: number): string {
    return getDetourWarningMessage(category, extraMinutes);
  }

  /**
   * Check if extra distance is within budget.
   */
  isWithinBudget(extraDistanceM: number, budgetM: number): boolean {
    return extraDistanceM <= budgetM;
  }
}
