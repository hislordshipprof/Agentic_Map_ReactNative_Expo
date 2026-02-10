import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash } from 'crypto';
import { CacheService, CACHE_TTL } from '../cache/cache.service';
import type { Coordinates } from '../../common/types';

const BASE = 'https://maps.googleapis.com/maps/api/place';
const NEW_PLACES_BASE = 'https://places.googleapis.com/v1/places';

export interface PlaceCandidate {
  placeId: string;
  name: string;
  address?: string;
  location: Coordinates;
  rating?: number;
  reviewCount?: number;
  types?: string[];
  isOpen?: boolean;
}

export interface PlaceCandidateWithDetour extends PlaceCandidate {
  /** Detour duration in seconds from routingSummaries */
  detourDurationSec?: number;
  /** Detour distance in meters from routingSummaries */
  detourDistanceM?: number;
}

/** Shape of Google NEW Places API searchText response */
interface NewPlacesSearchResponse {
  places?: Array<{
    id?: string;
    displayName?: { text?: string };
    formattedAddress?: string;
    location?: { latitude?: number; longitude?: number };
    rating?: number;
    userRatingCount?: number;
    types?: string[];
    currentOpeningHours?: { openNow?: boolean };
    regularOpeningHours?: { openNow?: boolean };
  }>;
  routingSummaries?: Array<{
    legs?: Array<{
      duration?: string; // e.g. "300s"
      distanceMeters?: number;
    }>;
  }>;
}

@Injectable()
export class GooglePlacesService {
  private readonly logger = new Logger(GooglePlacesService.name);
  private readonly apiKey: string;

  constructor(
    private config: ConfigService,
    private cache: CacheService,
  ) {
    this.apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY') ?? this.config.get<string>('GOOGLE_MAPS_API_KEY') ?? '';
  }

  private async fetch(url: string, params: Record<string, string>): Promise<unknown> {
    if (!this.apiKey?.trim()) {
      throw new HttpException(
        {
          error: {
            code: 'MISSING_API_KEY',
            message: 'GOOGLE_PLACES_API_KEY or GOOGLE_MAPS_API_KEY is not set. Add it to .env or set the environment variable.',
            suggestions: ['Copy .env.example to .env and set GOOGLE_MAPS_API_KEY (or GOOGLE_PLACES_API_KEY)', 'Get a key at https://console.cloud.google.com/apis/credentials'],
          },
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }
    const u = new URL(url);
    Object.entries({ ...params, key: this.apiKey }).forEach(([k, v]) => u.searchParams.set(k, v));
    const res = await fetch(u.toString());
    if (!res.ok) {
      const t = await res.text();
      if (res.status === 429) {
        throw new HttpException(
          {
            error: {
              code: 'API_QUOTA_EXCEEDED',
              message: 'Google Places API quota exceeded.',
              suggestions: ['Retry later', 'Check your API quota in Google Cloud Console'],
            },
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
      throw new Error(`Google Places API error: ${res.status} ${t}`);
    }
    const json = (await res.json()) as { status: string; error_message?: string };
    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      throw new Error((json as { error_message?: string }).error_message ?? json.status);
    }
    return json;
  }

  /**
   * Text search for a query near a location within a specified radius.
   */
  async textSearch(
    query: string,
    location: Coordinates,
    radiusM = 10000,
    limit = 20,
  ): Promise<PlaceCandidate[]> {
    // Grid-based cache: round to ~1km precision so nearby searches share cache
    const gridLat = Math.round(location.lat * 100);
    const gridLng = Math.round(location.lng * 100);
    const cacheKey = `places:${query.toLowerCase()}:${gridLat}:${gridLng}:${radiusM}`;
    const cached = await this.cache.get<PlaceCandidate[]>(cacheKey);
    if (cached) return cached.slice(0, limit);

    const json = (await this.fetch(`${BASE}/textsearch/json`, {
      query,
      location: `${location.lat},${location.lng}`,
      radius: String(radiusM),
    })) as { results?: Array<{
      place_id?: string;
      name?: string;
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
      rating?: number;
      user_ratings_total?: number;
      types?: string[];
      opening_hours?: { open_now?: boolean };
    }> };
    // Cache ALL results from API (up to 20 max) so larger limit requests benefit from cache
    const list = json.results ?? [];
    const allResults = list.map((r) => ({
      placeId: r.place_id ?? '',
      name: r.name ?? '',
      address: r.formatted_address,
      location: {
        lat: r.geometry?.location?.lat ?? 0,
        lng: r.geometry?.location?.lng ?? 0,
      },
      rating: r.rating,
      reviewCount: r.user_ratings_total,
      types: r.types,
      isOpen: r.opening_hours?.open_now,
    }));

    // Cache full results, slice to requested limit on return
    await this.cache.set(cacheKey, allResults, CACHE_TTL.PLACE_SEC);
    return allResults.slice(0, limit);
  }

  /**
   * Search for places along a route using the NEW Places API searchText endpoint
   * with searchAlongRouteParameters. Takes an encoded polyline and returns places
   * biased by minimal detour, with per-place detour durations.
   *
   * Requires only 1 API call per stop category (vs 5+ with corridor point search).
   */
  async searchAlongRoute(
    query: string,
    encodedPolyline: string,
    maxResults = 10,
  ): Promise<PlaceCandidateWithDetour[]> {
    if (!this.apiKey?.trim()) {
      throw new HttpException(
        { error: { code: 'MISSING_API_KEY', message: 'API key not set.' } },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (!encodedPolyline?.trim()) {
      throw new Error('encodedPolyline is required for searchAlongRoute');
    }

    if (!query?.trim()) {
      throw new Error('query is required for searchAlongRoute');
    }

    // Cache key: hash the polyline (can be very long) to 16 chars
    const polylineHash = createHash('md5')
      .update(encodedPolyline)
      .digest('hex')
      .slice(0, 16);
    const cacheKey = `places:sar:${query.toLowerCase()}:${polylineHash}`;
    const cached = await this.cache.get<PlaceCandidateWithDetour[]>(cacheKey);
    if (cached) return cached.slice(0, maxResults);

    const fieldMask = [
      'places.id',
      'places.displayName',
      'places.formattedAddress',
      'places.location',
      'places.rating',
      'places.userRatingCount',
      'places.types',
      'places.currentOpeningHours',
      'routingSummaries',
    ].join(',');

    const body = {
      textQuery: query,
      searchAlongRouteParameters: {
        polyline: { encodedPolyline },
      },
      maxResultCount: 20,
    };

    const res = await fetch(`${NEW_PLACES_BASE}:searchText`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': this.apiKey,
        'X-Goog-FieldMask': fieldMask,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      this.logger.error(
        `[searchAlongRoute] API error ${res.status} for "${query}" (polyline: ${encodedPolyline.length} chars): ${text.slice(0, 300)}`,
      );
      throw new Error(`Search Along Route API error: ${res.status} ${text.slice(0, 200)}`);
    }

    const json = (await res.json()) as NewPlacesSearchResponse;
    const places = json.places ?? [];
    const summaries = json.routingSummaries ?? [];

    const results: PlaceCandidateWithDetour[] = places.map((p, i) => {
      const summary = summaries[i];
      const leg = summary?.legs?.[0];

      // Parse duration string like "300s" to seconds
      let detourSec: number | undefined;
      if (leg?.duration) {
        const match = leg.duration.match(/^(\d+)s$/);
        if (match) detourSec = parseInt(match[1], 10);
      }

      return {
        placeId: p.id ?? '',
        name: p.displayName?.text ?? '',
        address: p.formattedAddress,
        location: {
          lat: p.location?.latitude ?? 0,
          lng: p.location?.longitude ?? 0,
        },
        rating: p.rating,
        reviewCount: p.userRatingCount,
        types: p.types,
        isOpen: p.currentOpeningHours?.openNow ?? p.regularOpeningHours?.openNow,
        detourDurationSec: detourSec,
        detourDistanceM: leg?.distanceMeters,
      };
    });

    this.logger.log(
      `[searchAlongRoute] "${query}": ${results.length} results` +
      (results.length > 0 ? `, top: "${results[0].name}" (detour: ${results[0].detourDurationSec ?? '?'}s)` : ''),
    );

    await this.cache.set(cacheKey, results, CACHE_TTL.PLACE_SEC);
    return results.slice(0, maxResults);
  }

  async nearby(
    location: Coordinates,
    typeOrKeyword: string,
    radiusM = 5000,
    limit = 20,
  ): Promise<PlaceCandidate[]> {
    const json = (await this.fetch(`${BASE}/nearbysearch/json`, {
      location: `${location.lat},${location.lng}`,
      radius: String(radiusM),
      type: typeOrKeyword,
    })) as { results?: Array<{
      place_id?: string;
      name?: string;
      vicinity?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
      rating?: number;
      user_ratings_total?: number;
      types?: string[];
      opening_hours?: { open_now?: boolean };
    }> };
    const list = json.results?.slice(0, limit) ?? [];
    return list.map((r) => ({
      placeId: r.place_id ?? '',
      name: r.name ?? '',
      address: r.vicinity,
      location: {
        lat: r.geometry?.location?.lat ?? 0,
        lng: r.geometry?.location?.lng ?? 0,
      },
      rating: r.rating,
      reviewCount: r.user_ratings_total,
      types: r.types,
      isOpen: r.opening_hours?.open_now,
    }));
  }

  async autocomplete(
    input: string,
    location?: Coordinates,
    _sessionToken?: string,
  ): Promise<Array<{ placeId: string; description: string; mainText: string; secondaryText: string }>> {
    const params: Record<string, string> = { input };
    if (location) params.location = `${location.lat},${location.lng}`;
    const json = (await this.fetch(`${BASE}/autocomplete/json`, params)) as {
      predictions?: Array<{
        place_id?: string;
        description?: string;
        structured_formatting?: { main_text?: string; secondary_text?: string };
      }>;
    };
    return (json.predictions ?? []).map((p) => ({
      placeId: p.place_id ?? '',
      description: p.description ?? '',
      mainText: p.structured_formatting?.main_text ?? '',
      secondaryText: p.structured_formatting?.secondary_text ?? '',
    }));
  }

  async getPlaceDetails(placeId: string): Promise<PlaceCandidate | null> {
    const key = `place:${placeId}`;
    const cached = await this.cache.get<PlaceCandidate>(key);
    if (cached) return cached;

    const json = (await this.fetch(`${BASE}/details/json`, {
      place_id: placeId,
      fields: 'place_id,name,formatted_address,geometry,rating,user_ratings_total,types,opening_hours',
    })) as { result?: {
      place_id?: string;
      name?: string;
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
      rating?: number;
      user_ratings_total?: number;
      types?: string[];
      opening_hours?: { open_now?: boolean };
    } };
    const r = json.result;
    if (!r?.geometry?.location) return null;
    const out: PlaceCandidate = {
      placeId: r.place_id ?? placeId,
      name: r.name ?? '',
      address: r.formatted_address,
      location: { lat: r.geometry.location.lat ?? 0, lng: r.geometry.location.lng ?? 0 },
      rating: r.rating,
      reviewCount: r.user_ratings_total,
      types: r.types,
      isOpen: r.opening_hours?.open_now,
    };
    await this.cache.set(key, out, CACHE_TTL.PLACE_SEC);
    return out;
  }
}
