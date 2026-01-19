import { createHash } from 'crypto';
import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
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
    if (!this.apiKey?.trim()) {
      throw new HttpException(
        {
          error: {
            code: 'MISSING_API_KEY',
            message: 'GOOGLE_MAPS_API_KEY is not set. Add it to .env or set the environment variable.',
            suggestions: ['Copy .env.example to .env and set GOOGLE_MAPS_API_KEY', 'Get a key at https://console.cloud.google.com/apis/credentials'],
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const pathNorm = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.base}${pathNorm}`);
    Object.entries({ ...params, key: this.apiKey }).forEach(([k, v]) =>
      url.searchParams.set(k, v),
    );
    const res = await fetch(url.toString());
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) {
        throw new HttpException(
          {
            error: {
              code: 'API_QUOTA_EXCEEDED',
              message: 'Google Maps API quota exceeded.',
              suggestions: ['Retry later', 'Check your API quota in Google Cloud Console'],
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new Error(`Google Maps API error: ${res.status} ${t}`);
    }
    const json = (await res.json()) as { status: string; error_message?: string } & T;
    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      throw new Error(json.error_message ?? `Google Maps API: ${json.status}`);
    }
    return json;
  }

  /**
   * Get directions from origin to destination with optional waypoints.
   * Uses Routes API (v2 computeRoutes). Returns polyline, total distance (m), total duration (min), and legs.
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

    if (!this.apiKey?.trim()) {
      throw new HttpException(
        {
          error: {
            code: 'MISSING_API_KEY',
            message: 'GOOGLE_MAPS_API_KEY is not set.',
            suggestions: ['Set GOOGLE_MAPS_API_KEY in .env', 'Ensure the key has Routes API enabled'],
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    const body = {
      origin: { location: { latLng: { latitude: origin.lat, longitude: origin.lng } } },
      destination: { location: { latLng: { latitude: destination.lat, longitude: destination.lng } } },
      ...(waypoints?.length
        ? {
            intermediates: waypoints.map((w) => ({
              location: { latLng: { latitude: w.lat, longitude: w.lng } },
            })),
          }
        : {}),
      travelMode: 'DRIVE',
      polylineQuality: 'OVERVIEW',
      polylineEncoding: 'ENCODED_POLYLINE',
    };

    const url = 'https://routes.googleapis.com/directions/v2:computeRoutes';
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation,routes.legs.distanceMeters,routes.legs.duration',
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      if (res.status === 429) {
        throw new HttpException(
          {
            error: {
              code: 'API_QUOTA_EXCEEDED',
              message: 'Routes API quota exceeded.',
              suggestions: ['Retry later', 'Check quota in Google Cloud Console'],
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new Error(`Routes API error: ${res.status} ${text}`);
    }

    let json: {
      routes?: Array<{
        distanceMeters?: number;
        duration?: string;
        polyline?: { encodedPolyline?: string };
        legs?: Array<{
          startLocation?: { latitude?: number; longitude?: number };
          endLocation?: { latitude?: number; longitude?: number };
          distanceMeters?: number;
          duration?: string;
        }>;
      }>;
    };
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error('Routes API returned invalid JSON');
    }

    const route = json.routes?.[0];
    if (!route) return null;

    const parseDurationSec = (s: string | undefined): number => {
      if (!s) return 0;
      const m = /^(\d+)s$/.exec(s);
      return m ? parseInt(m[1], 10) : 0;
    };

    const legs: DirectionsLeg[] = (route.legs ?? []).map((leg) => ({
      distanceM: leg.distanceMeters ?? 0,
      durationMin: Math.round(parseDurationSec(leg.duration) / 60),
      startLocation: {
        lat: leg.startLocation?.latitude ?? 0,
        lng: leg.startLocation?.longitude ?? 0,
      },
      endLocation: {
        lat: leg.endLocation?.latitude ?? 0,
        lng: leg.endLocation?.longitude ?? 0,
      },
    }));

    const totalDistanceM = route.distanceMeters ?? legs.reduce((s, l) => s + l.distanceM, 0);
    const totalDurationMin = Math.round(parseDurationSec(route.duration) / 60) || legs.reduce((s, l) => s + l.durationMin, 0);
    const polyline = route.polyline?.encodedPolyline ?? '';

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
