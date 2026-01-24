/**
 * useUserAnchors - Hook for managing user's saved locations (anchors)
 *
 * This hook provides access to user's saved locations like home and work.
 * These are used by ElevenLabs dynamic variables to resolve anchor references
 * in voice commands like "take me home" or "navigate to work".
 *
 * Storage:
 * - Currently uses AsyncStorage for persistence
 * - In the future, can be migrated to a Redux userSlice
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Anchor, AnchorType } from '@/types/user';
import type { LatLng } from '@/types/route';

const ANCHORS_STORAGE_KEY = '@agentic_map:user_anchors';

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
  /** Loading state */
  isLoading: boolean;
  /** Error state */
  error: string | null;
  /** Add or update an anchor */
  setAnchor: (type: AnchorType, location: LatLng, name?: string, address?: string) => Promise<void>;
  /** Remove an anchor */
  removeAnchor: (type: AnchorType) => Promise<void>;
  /** Reload anchors from storage */
  refresh: () => Promise<void>;
}

/**
 * useUserAnchors hook
 */
export function useUserAnchors(): UseUserAnchorsResult {
  const [anchors, setAnchors] = useState<Anchor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load anchors from AsyncStorage
   */
  const loadAnchors = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const stored = await AsyncStorage.getItem(ANCHORS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as Anchor[];
        setAnchors(parsed);
      }
    } catch (err) {
      console.error('[useUserAnchors] Failed to load anchors:', err);
      setError('Failed to load saved locations');
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Save anchors to AsyncStorage
   */
  const saveAnchors = useCallback(async (newAnchors: Anchor[]) => {
    try {
      await AsyncStorage.setItem(ANCHORS_STORAGE_KEY, JSON.stringify(newAnchors));
      setAnchors(newAnchors);
    } catch (err) {
      console.error('[useUserAnchors] Failed to save anchors:', err);
      throw new Error('Failed to save location');
    }
  }, []);

  /**
   * Set or update an anchor
   */
  const setAnchor = useCallback(async (
    type: AnchorType,
    location: LatLng,
    name?: string,
    address?: string,
  ) => {
    const displayName = name || (type === 'home' ? 'Home' : type === 'work' ? 'Work' : 'Custom');

    const newAnchor: Anchor = {
      id: `anchor_${type}_${Date.now()}`,
      name: displayName,
      location,
      address,
      type,
      lastUsed: Date.now(),
      createdAt: Date.now(),
    };

    // Remove existing anchor of same type and add new one
    const filtered = anchors.filter(a => a.type !== type);
    const updated = [...filtered, newAnchor];

    await saveAnchors(updated);
  }, [anchors, saveAnchors]);

  /**
   * Remove an anchor by type
   */
  const removeAnchor = useCallback(async (type: AnchorType) => {
    const filtered = anchors.filter(a => a.type !== type);
    await saveAnchors(filtered);
  }, [anchors, saveAnchors]);

  /**
   * Refresh anchors from storage
   */
  const refresh = useCallback(async () => {
    await loadAnchors();
  }, [loadAnchors]);

  // Load anchors on mount
  useEffect(() => {
    loadAnchors();
  }, [loadAnchors]);

  // Find home and work anchors
  const home = anchors.find(a => a.type === 'home');
  const work = anchors.find(a => a.type === 'work');

  // Build coordinates object for ElevenLabs
  const coordinates: AnchorCoordinates = {};
  if (home) {
    coordinates.home = home.location;
  }
  if (work) {
    coordinates.work = work.location;
  }

  return {
    anchors,
    home,
    work,
    coordinates,
    isLoading,
    error,
    setAnchor,
    removeAnchor,
    refresh,
  };
}

export default useUserAnchors;
