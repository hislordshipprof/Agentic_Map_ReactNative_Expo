/**
 * Route Types - Agentic Mobile Map
 *
 * Type definitions for routes, stops, waypoints, and optimization.
 * Per requirements-frontend.md Phase 1.4 and backend detour logic.
 */

/**
 * Geographic coordinates
 */
export interface LatLng {
  lat: number;
  lng: number;
}

/**
 * Detour status classification
 * Maps to backend DetourBufferService classifications
 */
export type DetourStatus =
  | 'NO_DETOUR'          // 0-50m extra - always include
  | 'MINIMAL'            // <=25% of buffer - include
  | 'ACCEPTABLE'         // 26-75% of buffer - optional
  | 'NOT_RECOMMENDED';   // >75% of buffer - exclude

/**
 * Stop on the route
 */
export interface RouteStop {
  id: string;
  name: string;
  address?: string;
  location: LatLng;
  /** Distance from route start in miles */
  mileMarker: number;
  /** Extra distance required for this stop */
  detourCost: number;
  /** Detour status classification */
  status: DetourStatus;
  /** Place category (coffee, gas, grocery, etc.) */
  category?: string;
  /** Place rating */
  rating?: number;
  /** Whether place is currently open */
  isOpen?: boolean;
  /** Order in the optimized route (1-based) */
  order?: number;
}

/**
 * Waypoint on the route (intermediate navigation point)
 */
export interface Waypoint {
  id: string;
  location: LatLng;
  /** Type of waypoint */
  type: 'start' | 'stop' | 'destination' | 'via';
  /** Associated stop if this is a stop waypoint */
  stopId?: string;
}

/**
 * Route leg between two waypoints
 */
export interface RouteLeg {
  id: string;
  startWaypoint: string;
  endWaypoint: string;
  distance: number;      // miles
  duration: number;      // minutes
  /** Encoded polyline for this leg */
  polyline: string;
}

/**
 * Complete route with all details
 */
export interface Route {
  id: string;
  /** Origin location */
  origin: {
    name: string;
    location: LatLng;
  };
  /** Destination location */
  destination: {
    name: string;
    location: LatLng;
  };
  /** Ordered list of stops */
  stops: RouteStop[];
  /** All waypoints in order */
  waypoints: Waypoint[];
  /** Route legs between waypoints */
  legs: RouteLeg[];
  /** Total route distance in miles */
  totalDistance: number;
  /** Total route time in minutes */
  totalTime: number;
  /** Encoded polyline for entire route */
  polyline: string;
  /** Detour budget used */
  detourBudget: {
    total: number;       // meters
    used: number;        // meters
    remaining: number;   // meters
  };
  /** Timestamp when route was created */
  createdAt: number;
}

/**
 * Route state for Redux slice
 */
export interface RouteState {
  /** Currently active/confirmed route */
  confirmed: Route | null;
  /** Pending route awaiting confirmation */
  pending: Route | null;
  /** All waypoints for current route */
  waypoints: Waypoint[];
  /** Total distance of current route */
  totalDistance: number;
  /** Total time of current route */
  totalTime: number;
  /** Encoded polyline for map display */
  polyline: string | null;
  /** Current stops on route */
  stops: RouteStop[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
}

/**
 * Initial route state
 */
export const initialRouteState: RouteState = {
  confirmed: null,
  pending: null,
  waypoints: [],
  totalDistance: 0,
  totalTime: 0,
  polyline: null,
  stops: [],
  isLoading: false,
  error: null,
};

/**
 * Helper to calculate detour status from cost and budget
 */
export const getDetourStatus = (
  detourCost: number,
  detourBudget: number
): DetourStatus => {
  if (detourCost <= 50) return 'NO_DETOUR';

  const percentage = detourCost / detourBudget;

  if (percentage <= 0.25) return 'MINIMAL';
  if (percentage <= 0.75) return 'ACCEPTABLE';
  return 'NOT_RECOMMENDED';
};

/**
 * Helper to format distance for display
 */
export const formatDistance = (miles: number | undefined | null): string => {
  // Handle undefined, null, NaN
  if (miles === undefined || miles === null || isNaN(miles)) {
    return '0 mi';
  }
  if (miles < 0.1) {
    const feet = Math.round(miles * 5280);
    return `${feet} ft`;
  }
  return `${miles.toFixed(1)} mi`;
};

/**
 * Helper to format duration for display
 */
export const formatDuration = (minutes: number | undefined | null): string => {
  // Handle undefined, null, NaN
  if (minutes === undefined || minutes === null || isNaN(minutes)) {
    return '0 min';
  }
  if (minutes < 60) {
    return `${Math.round(minutes)} min`;
  }
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
};
