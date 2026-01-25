/**
 * useUserAnchors - Hook for managing user's saved locations (anchors)
 *
 * This hook provides access to user's saved locations like home and work.
 * These are used by ElevenLabs dynamic variables to resolve anchor references
 * in voice commands like "take me home" or "navigate to work".
 *
 * Storage:
 * - Uses Redux with redux-persist for instant access on app load
 * - No async loading delay - anchors are available immediately after hydration
 */

import { useCallback, useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/hooks';
import {
  setAnchor as setAnchorAction,
  removeAnchor as removeAnchorAction,
} from '@/redux/slices/anchorsSlice';
import type { Anchor, AnchorType } from '@/types/user';
import type { LatLng } from '@/types/route';

/**
 * Simplified anchor coordinates for ElevenLabs dynamic variables
 */
export interface AnchorCoordinates {
  home?: LatLng;
  work?: LatLng;
}

/**
 * Return type for useUserAnchors hook
 */
export interface UseUserAnchorsResult {
  /** All user anchors */
  anchors: Anchor[];
  /** Home anchor if set */
  home?: Anchor;
  /** Work anchor if set */
  work?: Anchor;
  /** Simplified coordinates for ElevenLabs */
  coordinates: AnchorCoordinates;
  /** Loading state - always false with Redux persist (instant hydration) */
  isLoading: boolean;
  /** Whether Redux has been hydrated from persistence */
  isHydrated: boolean;
  /** Error state */
  error: string | null;
  /** Add or update an anchor */
  setAnchor: (type: AnchorType, location: LatLng, name?: string, address?: string) => Promise<void>;
  /** Remove an anchor */
  removeAnchor: (type: AnchorType) => Promise<void>;
  /** Reload anchors from storage (no-op with Redux, kept for compatibility) */
  refresh: () => Promise<void>;
}

/**
 * useUserAnchors hook
 *
 * Uses Redux for state management with redux-persist for persistence.
 * Anchors are available immediately after store hydration - no async loading.
 */
export function useUserAnchors(): UseUserAnchorsResult {
  const dispatch = useAppDispatch();

  // Select anchors state from Redux
  const anchors = useAppSelector((state) => state.anchors.anchors);
  const isHydrated = useAppSelector((state) => state.anchors._hydrated);

  // Find home and work anchors
  const home = useMemo(() => anchors.find(a => a.type === 'home'), [anchors]);
  const work = useMemo(() => anchors.find(a => a.type === 'work'), [anchors]);

  // Build coordinates object for ElevenLabs
  const coordinates = useMemo<AnchorCoordinates>(() => {
    const coords: AnchorCoordinates = {};
    if (home) {
      coords.home = home.location;
    }
    if (work) {
      coords.work = work.location;
    }
    return coords;
  }, [home, work]);

  /**
   * Set or update an anchor
   */
  const setAnchor = useCallback(async (
    type: AnchorType,
    location: LatLng,
    name?: string,
    address?: string,
  ) => {
    dispatch(setAnchorAction({ type, location, name, address }));
    console.log('[useUserAnchors] Anchor set:', type, location);
  }, [dispatch]);

  /**
   * Remove an anchor by type
   */
  const removeAnchor = useCallback(async (type: AnchorType) => {
    dispatch(removeAnchorAction(type));
    console.log('[useUserAnchors] Anchor removed:', type);
  }, [dispatch]);

  /**
   * Refresh anchors from storage
   * With Redux persist, this is a no-op - anchors are always in sync
   */
  const refresh = useCallback(async () => {
    // No-op with Redux persist - kept for API compatibility
    console.log('[useUserAnchors] Refresh called (no-op with Redux persist)');
  }, []);

  return {
    anchors,
    home,
    work,
    coordinates,
    isLoading: !isHydrated, // Only "loading" until hydrated
    isHydrated,
    error: null,
    setAnchor,
    removeAnchor,
    refresh,
  };
}

export default useUserAnchors;
