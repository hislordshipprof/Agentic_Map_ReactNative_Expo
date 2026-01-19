/**
 * Mock route fixture for dev and manual QA.
 * Per IMPLEMENTATION_PLAN: test Route tab and adjustment without backend.
 */

import type { Route, Waypoint, RouteLeg } from '@/types/route';
import { getDetourStatus } from '@/types/route';

/**
 * Short encoded polyline (Google algorithm). Decodes to a small path.
 * Example: ~5 points in the Bay Area.
 */
const MOCK_POLYLINE = '_p~iF~ps|U_ulLnnqC_mqNvxq';

export const mockRoute: Route = {
  id: 'mock-route-1',
  origin: {
    name: 'Home',
    location: { lat: 37.7749, lng: -122.4194 },
  },
  destination: {
    name: 'Office',
    location: { lat: 37.7849, lng: -122.4094 },
  },
  stops: [
    {
      id: 'stop-1',
      name: 'Coffee Shop',
      address: '123 Market St',
      location: { lat: 37.7789, lng: -122.4154 },
      mileMarker: 0.4,
      detourCost: 120,
      status: getDetourStatus(120, 800),
      category: 'coffee',
      rating: 4.5,
      isOpen: true,
      order: 1,
    },
    {
      id: 'stop-2',
      name: 'Gas Station',
      address: '456 Mission St',
      location: { lat: 37.7819, lng: -122.4124 },
      mileMarker: 0.9,
      detourCost: 200,
      status: getDetourStatus(200, 800),
      category: 'gas',
      rating: 4.0,
      order: 2,
    },
  ],
  waypoints: [
    { id: 'wp-0', location: { lat: 37.7749, lng: -122.4194 }, type: 'start' },
    { id: 'wp-1', location: { lat: 37.7789, lng: -122.4154 }, type: 'stop', stopId: 'stop-1' },
    { id: 'wp-2', location: { lat: 37.7819, lng: -122.4124 }, type: 'stop', stopId: 'stop-2' },
    { id: 'wp-3', location: { lat: 37.7849, lng: -122.4094 }, type: 'destination' },
  ] as Waypoint[],
  legs: [
    { id: 'leg-0', startWaypoint: 'wp-0', endWaypoint: 'wp-1', distance: 0.4, duration: 4, polyline: MOCK_POLYLINE },
    { id: 'leg-1', startWaypoint: 'wp-1', endWaypoint: 'wp-2', distance: 0.35, duration: 3, polyline: MOCK_POLYLINE },
    { id: 'leg-2', startWaypoint: 'wp-2', endWaypoint: 'wp-3', distance: 0.3, duration: 3, polyline: MOCK_POLYLINE },
  ] as RouteLeg[],
  totalDistance: 1.05,
  totalTime: 10,
  polyline: MOCK_POLYLINE,
  detourBudget: { total: 800, used: 320, remaining: 480 },
  createdAt: Date.now(),
};
