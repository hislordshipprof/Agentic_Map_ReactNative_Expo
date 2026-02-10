/**
 * useLocation - current device position for conversation and navigate.
 *
 * Enhanced with:
 * - Address display via reverse geocoding
 * - Location caching for instant display on app restart
 * - Tiered accuracy acquisition (fast first, then precise)
 * - Stale/cache status indicators
 * - Concurrency guard (only one refresh at a time)
 * - Single state update per refresh (avoids blue-dot flicker)
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';
import {
  getCachedLocation,
  setCachedLocation,
  isLocationStale,
  hasMovedSignificantly,
  formatAddress,
  type CachedLocation,
} from '@/services/location';

export type LocationStatus = 'loading' | 'ready' | 'stale' | 'error' | 'denied';

export interface UseLocationResult {
  currentLocation: { lat: number; lng: number } | null;
  address: string | null;
  locationStatus: LocationStatus;
  isLoading: boolean;
  locationError: Error | null;
  accuracy: number | null;
  isFromCache: boolean;
  refresh: () => Promise<void>;
}

export function useLocation(): UseLocationResult {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>('loading');
  const [locationError, setLocationError] = useState<Error | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [isFromCache, setIsFromCache] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Track last geocoded location to avoid unnecessary re-geocoding
  const lastGeocodedLocation = useRef<{ lat: number; lng: number } | null>(null);
  const hasInitialized = useRef(false);
  // Guard against concurrent refreshes
  const isRefreshing = useRef(false);

  /**
   * Reverse geocode coordinates to get street address
   */
  const geocodeLocation = useCallback(
    async (coords: { lat: number; lng: number }): Promise<string | null> => {
      try {
        const results = await Location.reverseGeocodeAsync({
          latitude: coords.lat,
          longitude: coords.lng,
        });

        if (results && results.length > 0) {
          return formatAddress(results[0]);
        }
        return null;
      } catch (error) {
        console.warn('Reverse geocoding failed:', error);
        return null;
      }
    },
    []
  );

  /**
   * Load cached location immediately on mount
   */
  const loadCachedLocation = useCallback(async () => {
    const cached = await getCachedLocation();
    if (cached) {
      setCurrentLocation(cached.coordinates);
      setAddress(cached.address);
      setAccuracy(cached.accuracy);
      setIsFromCache(true);
      lastGeocodedLocation.current = cached.coordinates;

      // Check if cached location is stale
      if (isLocationStale(cached.timestamp)) {
        setLocationStatus('stale');
      } else {
        setLocationStatus('ready');
        setIsLoading(false);
      }
      return cached;
    }
    return null;
  }, []);

  /**
   * Main refresh function with tiered accuracy acquisition.
   *
   * Collects the best location across all tiers, then applies a SINGLE
   * state update at the end. This prevents the marker from flickering
   * due to multiple intermediate renders (one per tier).
   *
   * A concurrency guard ensures only one refresh runs at a time.
   * The AppState effect uses a ref to avoid dependency cycling.
   */
  const refresh = useCallback(async () => {
    // Prevent concurrent refreshes — if one is already running, skip
    if (isRefreshing.current) return;
    isRefreshing.current = true;

    setLocationError(null);

    // Only show loading if we don't have a cached location
    const cached = await getCachedLocation();
    if (!cached) {
      setIsLoading(true);
      setLocationStatus('loading');
    }

    // Accumulate the best result across tiers instead of updating state per tier
    let bestCoords: { lat: number; lng: number } | null = null;
    let bestAccuracy = 0;
    let hasFreshLocation = false;

    try {
      // Check permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(new Error('Location permission denied'));
        setCurrentLocation(null);
        setAddress(null);
        setLocationStatus('denied');
        setIsLoading(false);
        isRefreshing.current = false;
        return;
      }

      // Tier 1: Try getLastKnownPositionAsync (instant, ~200ms)
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          bestCoords = { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude };
          bestAccuracy = lastKnown.coords.accuracy ?? 0;
          hasFreshLocation = true;
        }
      } catch {
        // Continue to next tier
      }

      // Tier 2: getCurrentPositionAsync with Low accuracy (fast, 1-2s)
      try {
        const lowAccuracy = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        bestCoords = { lat: lowAccuracy.coords.latitude, lng: lowAccuracy.coords.longitude };
        bestAccuracy = lowAccuracy.coords.accuracy ?? 0;
        hasFreshLocation = true;
      } catch {
        // Continue to next tier
      }

      // Tier 3: getCurrentPositionAsync with Balanced accuracy (better quality)
      try {
        const balanced = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        bestCoords = { lat: balanced.coords.latitude, lng: balanced.coords.longitude };
        bestAccuracy = balanced.coords.accuracy ?? 0;
        hasFreshLocation = true;
      } catch {
        // If all tiers failed and we have no location, set error
        if (!hasFreshLocation && !cached) {
          setLocationError(new Error('Could not get current location'));
          setLocationStatus('error');
        }
      }

      // Apply a SINGLE state update with the best result from all tiers
      if (bestCoords) {
        setCurrentLocation(bestCoords);
        setAccuracy(bestAccuracy);
        setIsFromCache(false);
        setLocationStatus('ready');

        // Geocode only if moved significantly or no previous geocode
        const needsGeocode =
          !lastGeocodedLocation.current ||
          hasMovedSignificantly(lastGeocodedLocation.current, bestCoords);

        if (needsGeocode) {
          const newAddress = await geocodeLocation(bestCoords);
          if (newAddress) {
            setAddress(newAddress);
            lastGeocodedLocation.current = bestCoords;

            const cachedEntry: CachedLocation = {
              coordinates: bestCoords,
              address: newAddress,
              accuracy: bestAccuracy,
              timestamp: Date.now(),
              geocodedAt: Date.now(),
            };
            await setCachedLocation(cachedEntry);
          }
        }
      }
    } catch (e) {
      setLocationError(e instanceof Error ? e : new Error(String(e)));
      if (!cached) {
        setLocationStatus('error');
      }
    } finally {
      setIsLoading(false);
      isRefreshing.current = false;
    }
  }, [geocodeLocation]);

  // Stable ref for refresh — used by AppState effect to avoid dependency cycling.
  // The effect never re-registers, so the listener is stable across renders.
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  // Load cached location and fetch fresh on mount (once only)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    loadCachedLocation().then(() => {
      refreshRef.current();
    });
  }, [loadCachedLocation]);

  // Refresh when app comes to foreground.
  // Uses refreshRef so the effect never re-registers (empty dep besides stable ref).
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshRef.current();
      }
    });
    return () => sub.remove();
  }, []);

  return {
    currentLocation,
    address,
    locationStatus,
    isLoading,
    locationError,
    accuracy,
    isFromCache,
    refresh,
  };
}
