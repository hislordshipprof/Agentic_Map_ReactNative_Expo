/**
 * Location Services - Agentic Mobile Map
 *
 * Exports location caching and formatting utilities.
 */

export {
  getCachedLocation,
  setCachedLocation,
  isLocationStale,
  hasMovedSignificantly,
  clearCachedLocation,
  type CachedLocation,
} from './location-cache';

export { formatAddress, formatAddressWithStatus } from './format-address';
