/**
 * Shared types for errand, places, and other modules.
 * Aligned with frontend types where applicable.
 */

export type { DetourStatus } from '../constants/detour.constants';

export interface Coordinates {
  lat: number;
  lng: number;
}

/** Alias for Coordinates (frontend uses LatLng) */
export type LatLng = Coordinates;
