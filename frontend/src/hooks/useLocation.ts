/**
 * useLocation - current device position for conversation and navigate.
 *
 * Enhanced with:
 * - Address display via reverse geocoding
 * - Location caching for instant display on app restart
 * - Tiered accuracy acquisition (fast first, then precise)
 * - Stale/cache status indicators
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
   * Update location state and cache
   */
  const updateLocationState = useCallback(
    async (
      coords: { lat: number; lng: number },
      accuracyValue: number,
      fromCache: boolean,
      forceGeocode: boolean = false
    ) => {
      setCurrentLocation(coords);
      setAccuracy(accuracyValue);
      setIsFromCache(fromCache);

      // Check if we need to geocode (moved >50m or forced)
      const needsGeocode =
        forceGeocode ||
        !lastGeocodedLocation.current ||
        hasMovedSignificantly(lastGeocodedLocation.current, coords);

      if (needsGeocode) {
        const newAddress = await geocodeLocation(coords);
        if (newAddress) {
          setAddress(newAddress);
          lastGeocodedLocation.current = coords;

          // Cache the location with address
          const cached: CachedLocation = {
            coordinates: coords,
            address: newAddress,
            accuracy: accuracyValue,
            timestamp: Date.now(),
            geocodedAt: Date.now(),
          };
          await setCachedLocation(cached);
        }
      }
    },
    [geocodeLocation]
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
   * Main refresh function with tiered accuracy acquisition
   */
  const refresh = useCallback(async () => {
    setLocationError(null);

    // Only show loading if we don't have a cached location
    const cached = await getCachedLocation();
    if (!cached) {
      setIsLoading(true);
      setLocationStatus('loading');
    }

    try {
      // Check permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(new Error('Location permission denied'));
        setCurrentLocation(null);
        setAddress(null);
        setLocationStatus('denied');
        setIsLoading(false);
        return;
      }

      // Tier 1: Try getLastKnownPositionAsync (instant, ~200ms)
      try {
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          await updateLocationState(
            { lat: lastKnown.coords.latitude, lng: lastKnown.coords.longitude },
            lastKnown.coords.accuracy ?? 0,
            false,
            !cached // Force geocode if no cache
          );
          setLocationStatus('ready');
          setIsLoading(false);
        }
      } catch {
        // Continue to next tier
      }

      // Tier 2: getCurrentPositionAsync with Low accuracy (fast, 1-2s)
      try {
        const lowAccuracy = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Low,
        });
        await updateLocationState(
          { lat: lowAccuracy.coords.latitude, lng: lowAccuracy.coords.longitude },
          lowAccuracy.coords.accuracy ?? 0,
          false,
          true
        );
        setLocationStatus('ready');
        setIsLoading(false);
      } catch {
        // Continue to next tier
      }

      // Tier 3: getCurrentPositionAsync with Balanced accuracy (better quality)
      try {
        const balanced = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        await updateLocationState(
          { lat: balanced.coords.latitude, lng: balanced.coords.longitude },
          balanced.coords.accuracy ?? 0,
          false,
          true
        );
        setLocationStatus('ready');
      } catch {
        // If all tiers failed and we have no location, set error
        if (!cached) {
          setLocationError(new Error('Could not get current location'));
          setLocationStatus('error');
        }
      }
    } catch (e) {
      setLocationError(e instanceof Error ? e : new Error(String(e)));
      if (!cached) {
        setLocationStatus('error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [updateLocationState]);

  // Load cached location and fetch fresh on mount (once only)
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;

    loadCachedLocation().then(() => {
      refresh();
    });
  }, [loadCachedLocation, refresh]);

  // Refresh when app comes to foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

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
