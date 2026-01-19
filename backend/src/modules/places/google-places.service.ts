import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CacheService, CACHE_TTL } from '../cache/cache.service';
import type { Coordinates } from '../../common/types';

const BASE = 'https://maps.googleapis.com/maps/api/place';

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

@Injectable()
export class GooglePlacesService {
  private readonly apiKey: string;

  constructor(
    private config: ConfigService,
    private cache: CacheService,
  ) {
    this.apiKey = this.config.get<string>('GOOGLE_PLACES_API_KEY') ?? this.config.get<string>('GOOGLE_MAPS_API_KEY') ?? '';
  }

  private async fetch(url: string, params: Record<string, string>): Promise<unknown> {
    const u = new URL(url);
    Object.entries({ ...params, key: this.apiKey }).forEach(([k, v]) => u.searchParams.set(k, v));
    const res = await fetch(u.toString());
    if (!res.ok) throw new Error(`Google Places API error: ${res.status}`);
    const json = (await res.json()) as { status: string; error_message?: string };
    if (json.status !== 'OK' && json.status !== 'ZERO_RESULTS') {
      throw new Error((json as { error_message?: string }).error_message ?? json.status);
    }
    return json;
  }

  /**
   * Text search for a query near a location.
   */
  async textSearch(
    query: string,
    location: Coordinates,
    _radiusM = 10000,
    limit = 20,
  ): Promise<PlaceCandidate[]> {
    const json = (await this.fetch(`${BASE}/textsearch/json`, {
      query,
      location: `${location.lat},${location.lng}`,
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
    const list = json.results?.slice(0, limit) ?? [];
    return list.map((r) => ({
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
