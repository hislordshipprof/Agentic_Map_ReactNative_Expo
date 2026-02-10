/**
 * Location Cache Utilities - Agentic Mobile Map
 *
 * Handles caching and retrieval of location data with address
 * to provide instant location display on app startup.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@agentic_map:current_location';
const STALE_TIME_MS = 5 * 60 * 1000; // 5 minutes
const EXPIRE_TIME_MS = 24 * 60 * 60 * 1000; // 24 hours
const SIGNIFICANT_MOVEMENT_METERS = 50; // Re-geocode if moved more than 50m

export interface CachedLocation {
  coordinates: { lat: number; lng: number };
  address: string;
  accuracy: number;
  timestamp: number;
  geocodedAt: number;
}

/**
 * Get cached location from AsyncStorage
 */
export async function getCachedLocation(): Promise<CachedLocation | null> {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const data = JSON.parse(cached) as CachedLocation;

    // Check if cache has expired (24 hours)
    if (Date.now() - data.timestamp > EXPIRE_TIME_MS) {
      await AsyncStorage.removeItem(CACHE_KEY);
      return null;
    }

    return data;
  } catch (error) {
    console.warn('Failed to get cached location:', error);
    return null;
  }
}

/**
 * Save location with address to cache
 */
export async function setCachedLocation(location: CachedLocation): Promise<void> {
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(location));
  } catch (error) {
    console.warn('Failed to cache location:', error);
  }
}

/**
 * Check if a cached location is stale (>5 minutes old)
 */
export function isLocationStale(timestamp: number): boolean {
  return Date.now() - timestamp > STALE_TIME_MS;
}

/**
 * Check if user has moved significantly (>50 meters)
 * Uses Haversine formula for distance calculation
 */
export function hasMovedSignificantly(
  oldLocation: { lat: number; lng: number },
  newLocation: { lat: number; lng: number }
): boolean {
  const distance = calculateDistanceMeters(oldLocation, newLocation);
  return distance > SIGNIFICANT_MOVEMENT_METERS;
}

/**
 * Calculate distance between two coordinates in meters using Haversine formula
 */
function calculateDistanceMeters(
  point1: { lat: number; lng: number },
  point2: { lat: number; lng: number }
): number {
  const R = 6371e3; // Earth's radius in meters
  const lat1Rad = (point1.lat * Math.PI) / 180;
  const lat2Rad = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Clear cached location
 */
export async function clearCachedLocation(): Promise<void> {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch (error) {
    console.warn('Failed to clear cached location:', error);
  }
}
