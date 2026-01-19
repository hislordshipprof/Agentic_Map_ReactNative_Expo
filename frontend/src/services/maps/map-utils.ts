/** Bounds and MapView region helpers. */

import type { LatLng } from '@/types/route';
import type { Region } from 'react-native-maps';

export interface Bounds {
  ne: LatLng;
  sw: LatLng;
}

export function getBoundsFromWaypoints(points: LatLng[]): Bounds {
  if (!points.length) {
    return {
      ne: { lat: 0, lng: 0 },
      sw: { lat: 0, lng: 0 },
    };
  }

  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;

  for (let i = 1; i < points.length; i++) {
    const { lat, lng } = points[i];
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  return {
    ne: { lat: maxLat, lng: maxLng },
    sw: { lat: minLat, lng: minLng },
  };
}

export function getRegionForBounds(
  bounds: Bounds,
  padding: number = 1.4
): Region {
  const { ne, sw } = bounds;
  const latitudeDelta = Math.max(0.01, (ne.lat - sw.lat) * padding);
  const longitudeDelta = Math.max(0.01, (ne.lng - sw.lng) * padding);

  return {
    latitude: (ne.lat + sw.lat) / 2,
    longitude: (ne.lng + sw.lng) / 2,
    latitudeDelta,
    longitudeDelta,
  };
}
