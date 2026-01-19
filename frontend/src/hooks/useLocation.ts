/**
 * useLocation - current device position for conversation and navigate.
 * Uses expo-location: request permissions, getCurrentPositionAsync, fallback to getLastKnownPositionAsync.
 */

import { useEffect, useState, useCallback } from 'react';
import { AppState } from 'react-native';
import * as Location from 'expo-location';

export interface UseLocationResult {
  currentLocation: { lat: number; lng: number } | null;
  locationError: Error | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
}

export function useLocation(): UseLocationResult {
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationError, setLocationError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLocationError(null);
    setIsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError(new Error('Location permission denied'));
        setCurrentLocation(null);
        return;
      }
      try {
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCurrentLocation({
          lat: loc.coords.latitude,
          lng: loc.coords.longitude,
        });
      } catch {
        const last = await Location.getLastKnownPositionAsync();
        if (last) {
          setCurrentLocation({
            lat: last.coords.latitude,
            lng: last.coords.longitude,
          });
        } else {
          setLocationError(new Error('Could not get current or last known location'));
          setCurrentLocation(null);
        }
      }
    } catch (e) {
      setLocationError(e instanceof Error ? e : new Error(String(e)));
      setCurrentLocation(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  return { currentLocation, locationError, isLoading, refresh };
}
