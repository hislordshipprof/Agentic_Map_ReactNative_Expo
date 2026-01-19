import { createHash } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService, CACHE_TTL } from '../cache/cache.service';
import type { Coordinates } from '../../common/types';

export interface DirectionsLeg {
  distanceM: number;
  durationMin: number;
  startLocation: Coordinates;
  endLocation: Coordinates;
}

export interface DirectionsResult {
  polyline: string;
  totalDistanceM: number;
  totalDurationMin: number;
  legs: DirectionsLeg[];
}

export interface GeocodeResult {
  address: string;
  location: Coordinates;
}

@Injectable()
export class GoogleMapsService {
  private readonly apiKey: string;
  private readonly base = 'https://maps.googleapis.com/maps/api';

  constructor(
    private config: ConfigService,
    private cache: CacheService,
  ) {
    this.apiKey = this.config.get<string>('GOOGLE_MAPS_API_KEY') ?? '';
  }

  private async get<T>(path: string, params: Record<string, string>): Promise<T> {
    const url = new URL(path, this.base);
    Object.entries({ ...params, key: this.apiKey }).forEach(([k, v]) =>
      url.searchParams.set(k, v),
    );
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Google Maps API error: ${res.status}`);
    const json = (await res.json()) as { status: string; error_message?: string } & T;
    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      throw new Error(json.error_message ?? `Google Maps API: ${json.status}`);
    }
    return json;
  }

  /**
   * Get directions from origin to destination with optional waypoints.
   * Returns polyline, total distance (m), total duration (min), and legs.
   */
  async getDirections(
    origin: Coordinates,
    destination: Coordinates,
    waypoints?: Coordinates[],
  ): Promise<DirectionsResult | null> {
    const wp = waypoints?.length ? waypoints.map((w) => `${w.lat},${w.lng}`).join('|') : '';
    const key = `route:${origin.lat}:${origin.lng}:${destination.lat}:${destination.lng}:${wp}`;
    const cached = await this.cache.get<DirectionsResult>(key);
    if (cached) return cached;

    const o = `${origin.lat},${origin.lng}`;
    const d = `${destination.lat},${destination.lng}`;
    const params: Record<string, string> = { origin: o, destination: d };
    if (waypoints?.length) params.waypoints = wp;
    const json = await this.get<{
      routes?: Array<{
        overview_polyline?: { points?: string };
        legs?: Array<{
          distance?: { value?: number };
          duration?: { value?: number };
          start_location?: { lat?: number; lng?: number };
          end_location?: { lat?: number; lng?: number };
        }>;
      }>;
    }>('/directions/json', params);

    const route = json.routes?.[0];
    if (!route?.legs?.length) return null;

    const legs: DirectionsLeg[] = route.legs.map((leg, i) => ({
      distanceM: leg.distance?.value ?? 0,
      durationMin: Math.round((leg.duration?.value ?? 0) / 60),
      startLocation: {
        lat: leg.start_location?.lat ?? 0,
        lng: leg.start_location?.lng ?? 0,
      },
      endLocation: {
        lat: leg.end_location?.lat ?? 0,
        lng: leg.end_location?.lng ?? 0,
      },
    }));

    const totalDistanceM = legs.reduce((s, l) => s + l.distanceM, 0);
    const totalDurationMin = legs.reduce((s, l) => s + l.durationMin, 0);
    const polyline = route.overview_polyline?.points ?? '';

    const out: DirectionsResult = { polyline, totalDistanceM, totalDurationMin, legs };
    await this.cache.set(key, out, CACHE_TTL.ROUTE_SEC);
    return out;
  }

  async geocode(address: string): Promise<GeocodeResult | null> {
    const h = createHash('sha256').update(address).digest('hex').slice(0, 24);
    const key = `geocode:${h}`;
    const cached = await this.cache.get<GeocodeResult>(key);
    if (cached) return cached;

    const json = await this.get<{
      results?: Array<{
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      }>;
    }>('/geocode/json', { address });
    const r = json.results?.[0];
    if (!r?.geometry?.location) return null;
    const out: GeocodeResult = {
      address: r.formatted_address ?? address,
      location: { lat: r.geometry.location.lat ?? 0, lng: r.geometry.location.lng ?? 0 },
    };
    await this.cache.set(key, out, CACHE_TTL.GEOCODE_SEC);
    return out;
  }

  async reverseGeocode(location: Coordinates): Promise<GeocodeResult | null> {
    const key = `reverse:${location.lat}:${location.lng}`;
    const cached = await this.cache.get<GeocodeResult>(key);
    if (cached) return cached;

    const json = await this.get<{
      results?: Array<{
        formatted_address?: string;
        geometry?: { location?: { lat?: number; lng?: number } };
      }>;
    }>('/geocode/json', { latlng: `${location.lat},${location.lng}` });
    const r = json.results?.[0];
    if (!r?.geometry?.location) return null;
    const out: GeocodeResult = {
      address: r.formatted_address ?? '',
      location: { lat: r.geometry.location.lat ?? 0, lng: r.geometry.location.lng ?? 0 },
    };
    await this.cache.set(key, out, CACHE_TTL.GEOCODE_SEC);
    return out;
  }
}
