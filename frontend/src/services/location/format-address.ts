/**
 * Address Formatting Utility - Agentic Mobile Map
 *
 * Formats geocoded address data into user-friendly display strings.
 * Prioritizes street address format (e.g., "1225 Peoria St").
 */

import type * as Location from 'expo-location';

/**
 * Format a geocoded address into a user-friendly string
 *
 * Priority order:
 * 1. "1225 Peoria St" (street number + street)
 * 2. "Downtown, Chicago" (name + city)
 * 3. "Chicago, IL" (city + region)
 * 4. Fallback to city, name, or "Unknown location"
 */
export function formatAddress(geo: Location.LocationGeocodedAddress): string {
  // Priority 1: Street address format "1225 Peoria St"
  if (geo.streetNumber && geo.street) {
    return `${geo.streetNumber} ${geo.street}`;
  }

  // Priority 2: Just street name if available
  if (geo.street) {
    return geo.street;
  }

  // Priority 3: Named location with city "Downtown, Chicago"
  if (geo.name && geo.city && geo.name !== geo.city) {
    return `${geo.name}, ${geo.city}`;
  }

  // Priority 4: City and state/region "Chicago, IL"
  if (geo.city && geo.region) {
    return `${geo.city}, ${geo.region}`;
  }

  // Priority 5: Just city
  if (geo.city) {
    return geo.city;
  }

  // Priority 6: Named location
  if (geo.name) {
    return geo.name;
  }

  // Priority 7: District or subregion
  if (geo.district) {
    return geo.district;
  }

  // Priority 8: Region/state
  if (geo.region) {
    return geo.region;
  }

  // Fallback
  return 'Unknown location';
}

/**
 * Format address with additional context for stale/cached state
 */
export function formatAddressWithStatus(
  address: string | null,
  isStale: boolean,
  isFromCache: boolean
): string {
  if (!address) {
    return 'Unknown location';
  }

  if (isStale && isFromCache) {
    return `${address} (updating)`;
  }

  return address;
}
