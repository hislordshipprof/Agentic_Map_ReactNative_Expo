import { Injectable } from '@nestjs/common';
import {
  DETOUR_CATEGORIES,
  DETOUR_ABSOLUTE_BOUNDS,
  NO_DETOUR_THRESHOLD_M,
  DetourStatus,
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
    if (distanceM <= DETOUR_CATEGORIES.short.maxDistanceM) {
      percentage = DETOUR_CATEGORIES.short.percentage;
    } else if (distanceM <= DETOUR_CATEGORIES.medium.maxDistanceM) {
      percentage = DETOUR_CATEGORIES.medium.percentage;
    } else {
      percentage = DETOUR_CATEGORIES.long.percentage;
    }
    const bufferM = distanceM * percentage;
    return Math.max(
      DETOUR_ABSOLUTE_BOUNDS.minBufferM,
      Math.min(DETOUR_ABSOLUTE_BOUNDS.maxBufferM, bufferM),
    );
  }

  /**
   * Get detour status from extra distance and buffer.
   */
  getDetourStatus(extraDistanceM: number, bufferM: number): DetourStatus {
    if (extraDistanceM <= NO_DETOUR_THRESHOLD_M) return 'NO_DETOUR';
    const ratio = extraDistanceM / bufferM;
    if (ratio <= 0.25) return 'MINIMAL';
    if (ratio <= 0.75) return 'ACCEPTABLE';
    return 'NOT_RECOMMENDED';
  }

  /**
   * Check if extra distance is within budget.
   */
  isWithinBudget(extraDistanceM: number, budgetM: number): boolean {
    return extraDistanceM <= budgetM;
  }
}
