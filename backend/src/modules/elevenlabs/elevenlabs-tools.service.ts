/**
 * ElevenLabs Tools Service - Server Tools for ElevenLabs LLM
 *
 * This service handles Server Tool webhooks from ElevenLabs LLM.
 * When the LLM decides to call a tool, ElevenLabs sends a POST request
 * to our endpoint. We process the request and return structured data.
 *
 * Benefits over Custom LLM:
 * - ~750-1500ms faster (no extra LLM round-trip)
 * - ElevenLabs handles conversation context
 * - We only handle route planning / place search
 */

import { Injectable, Logger } from '@nestjs/common';
import { ErrandService, type NavigateWithStopsIn } from '../errand/services/errand.service';
import { PlaceSearchService } from '../places/place-search.service';
import type { Coordinates } from '../../common/types';
import type {
  PlanRouteDto,
  SearchPlacesDto,
  AddStopDto,
  GetEtaDto,
  PlanRouteResponse,
  SearchPlacesResponse,
  AddStopResponse,
  GetEtaResponse,
  RouteStop,
  PlaceResult,
} from './dtos';

@Injectable()
export class ElevenLabsToolsService {
  private readonly logger = new Logger(ElevenLabsToolsService.name);

  constructor(
    private readonly errandService: ErrandService,
    private readonly placeSearchService: PlaceSearchService,
  ) {}

  /**
   * Handle plan_route server tool call
   */
  async planRoute(dto: PlanRouteDto): Promise<PlanRouteResponse> {
    const startTime = Date.now();
    this.logger.log(`[planRoute] Starting: destination="${dto.destination_name}"`);

    try {
      const origin: Coordinates = {
        lat: dto.user_location_lat,
        lng: dto.user_location_lng,
      };

      // Resolve destination - could be anchor or place name
      const destination = this.resolveDestination(dto);

      // Build anchors from dynamic variables
      const anchors = this.buildAnchors(dto);

      // Build stops array from comma-separated or array input
      const stops = this.parseStops(dto.stops);

      // Call errand service
      const input: NavigateWithStopsIn = {
        origin,
        destination: {
          name: destination.name,
          location: destination.location,
        },
        stops: stops.map(name => ({ name })),
        anchors,
      };

      const result = await this.errandService.navigateWithStops(input);
      const processingTime = Date.now() - startTime;

      this.logger.log(
        `[planRoute] Completed in ${processingTime}ms: ` +
        `stops=${result.route.stops?.length || 0}, time=${result.route.totalTime}min`
      );

      // Transform to ElevenLabs format
      const routeStops: RouteStop[] = (result.route.stops || []).map(stop => ({
        id: stop.id,
        name: stop.name,
        lat: stop.location.lat,
        lng: stop.location.lng,
        order: stop.order,
        detour_minutes: Math.round((stop.detourCost || 0) / 60),
      }));

      const summary = this.generateRouteSummary(
        destination.name,
        routeStops,
        result.route.totalTime,
        result.route.totalDistance,
      );

      return {
        success: true,
        route: {
          id: result.route.id,
          destination: {
            name: destination.name,
            lat: result.route.destination.location.lat,
            lng: result.route.destination.location.lng,
          },
          stops: routeStops,
          totalTime: Math.round(result.route.totalTime),
          totalDistance: Number(result.route.totalDistance.toFixed(1)),
          polyline: result.route.polyline,
        },
        summary,
      };
    } catch (error) {
      this.logger.error(`[planRoute] Error:`, error);
      return this.formatError(error, 'route planning');
    }
  }

  /**
   * Handle search_places server tool call
   */
  async searchPlaces(dto: SearchPlacesDto): Promise<SearchPlacesResponse> {
    const startTime = Date.now();
    this.logger.log(`[searchPlaces] Starting: query="${dto.query}"`);

    try {
      const location: Coordinates = {
        lat: dto.user_location_lat,
        lng: dto.user_location_lng,
      };

      const radiusM = dto.radius_meters || 5000;
      const maxResults = dto.max_results || 5;

      const results = await this.placeSearchService.searchPlaces(
        dto.query,
        location,
        radiusM,
        maxResults,
      );

      const processingTime = Date.now() - startTime;
      this.logger.log(`[searchPlaces] Found ${results.length} places in ${processingTime}ms`);

      const places: PlaceResult[] = results.map(place => ({
        id: place.placeId,
        name: place.name,
        address: place.address,
        lat: place.location.lat,
        lng: place.location.lng,
        rating: place.rating,
        is_open: place.isOpen,
        distance_meters: this.calculateDistance(location, place.location),
      }));

      return {
        success: true,
        places,
        count: places.length,
      };
    } catch (error) {
      this.logger.error(`[searchPlaces] Error:`, error);
      return this.formatError(error, 'place search');
    }
  }

  /**
   * Handle add_stop server tool call
   * Adds a new stop to the route and recalculates
   */
  async addStop(dto: AddStopDto): Promise<AddStopResponse> {
    const startTime = Date.now();
    this.logger.log(`[addStop] Adding stop: "${dto.stop_name}" to route to "${dto.destination_name}"`);

    try {
      const origin: Coordinates = {
        lat: dto.user_location_lat,
        lng: dto.user_location_lng,
      };

      // Combine existing stops with new stop
      const allStops = [...(dto.existing_stops || []), dto.stop_name];

      // Build destination
      const destination = dto.destination_lat && dto.destination_lng
        ? { name: dto.destination_name, location: { lat: dto.destination_lat, lng: dto.destination_lng } }
        : { name: dto.destination_name };

      const input: NavigateWithStopsIn = {
        origin,
        destination,
        stops: allStops.map(name => ({ name })),
        anchors: [],
      };

      const result = await this.errandService.navigateWithStops(input);
      const processingTime = Date.now() - startTime;

      this.logger.log(`[addStop] Completed in ${processingTime}ms`);

      const routeStops: RouteStop[] = (result.route.stops || []).map(stop => ({
        id: stop.id,
        name: stop.name,
        lat: stop.location.lat,
        lng: stop.location.lng,
        order: stop.order,
        detour_minutes: Math.round((stop.detourCost || 0) / 60),
      }));

      const summary = this.generateRouteSummary(
        dto.destination_name,
        routeStops,
        result.route.totalTime,
        result.route.totalDistance,
      );

      return {
        success: true,
        route: {
          id: result.route.id,
          destination: {
            name: dto.destination_name,
            lat: result.route.destination.location.lat,
            lng: result.route.destination.location.lng,
          },
          stops: routeStops,
          totalTime: Math.round(result.route.totalTime),
          totalDistance: Number(result.route.totalDistance.toFixed(1)),
          polyline: result.route.polyline,
        },
        summary,
      };
    } catch (error) {
      this.logger.error(`[addStop] Error:`, error);
      return this.formatError(error, 'adding stop');
    }
  }

  /**
   * Handle get_eta server tool call
   * Returns estimated time of arrival
   */
  async getEta(dto: GetEtaDto): Promise<GetEtaResponse> {
    const startTime = Date.now();
    this.logger.log(`[getEta] Getting ETA to ${dto.destination_name || 'destination'}`);

    try {
      const origin: Coordinates = {
        lat: dto.user_location_lat,
        lng: dto.user_location_lng,
      };

      const destination: Coordinates = {
        lat: dto.destination_lat,
        lng: dto.destination_lng,
      };

      const input: NavigateWithStopsIn = {
        origin,
        destination: {
          name: dto.destination_name || 'Destination',
          location: destination,
        },
        stops: [],
        anchors: [],
      };

      const result = await this.errandService.navigateWithStops(input);
      const processingTime = Date.now() - startTime;

      this.logger.log(`[getEta] Completed in ${processingTime}ms: ${result.route.totalTime}min`);

      const etaMinutes = Math.round(result.route.totalTime);
      const distanceMiles = Number(result.route.totalDistance.toFixed(1));
      const destName = dto.destination_name || 'your destination';

      return {
        success: true,
        eta_minutes: etaMinutes,
        distance_miles: distanceMiles,
        summary: `You're about ${etaMinutes} minutes and ${distanceMiles} miles from ${destName}.`,
      };
    } catch (error) {
      this.logger.error(`[getEta] Error:`, error);
      return this.formatError(error, 'getting ETA');
    }
  }

  /**
   * Resolve destination from DTO
   * Handles "home", "work" anchors or place names
   */
  private resolveDestination(dto: PlanRouteDto): { name: string; location?: Coordinates } {
    const destLower = dto.destination_name.toLowerCase().trim();

    // Check for home anchor
    if (destLower === 'home' && dto.home_lat && dto.home_lng) {
      return {
        name: 'Home',
        location: { lat: dto.home_lat, lng: dto.home_lng },
      };
    }

    // Check for work anchor
    if (destLower === 'work' && dto.work_lat && dto.work_lng) {
      return {
        name: 'Work',
        location: { lat: dto.work_lat, lng: dto.work_lng },
      };
    }

    // Check if explicit coordinates provided
    if (dto.destination_lat && dto.destination_lng) {
      return {
        name: dto.destination_name,
        location: { lat: dto.destination_lat, lng: dto.destination_lng },
      };
    }

    // Let entity resolver find the place
    return { name: dto.destination_name };
  }

  /**
   * Build anchors array from dynamic variables
   */
  private buildAnchors(dto: PlanRouteDto): Array<{ name: string; location: Coordinates }> {
    const anchors: Array<{ name: string; location: Coordinates }> = [];

    if (dto.home_lat && dto.home_lng) {
      anchors.push({
        name: 'home',
        location: { lat: dto.home_lat, lng: dto.home_lng },
      });
    }

    if (dto.work_lat && dto.work_lng) {
      anchors.push({
        name: 'work',
        location: { lat: dto.work_lat, lng: dto.work_lng },
      });
    }

    return anchors;
  }

  /**
   * Parse stops from array or comma-separated string
   */
  private parseStops(stops?: string[]): string[] {
    if (!stops || stops.length === 0) {
      return [];
    }

    // Handle case where ElevenLabs sends a single comma-separated string
    if (stops.length === 1 && stops[0].includes(',')) {
      return stops[0].split(',').map(s => s.trim()).filter(Boolean);
    }

    return stops.filter(Boolean);
  }

  /**
   * Generate human-readable route summary
   */
  private generateRouteSummary(
    destination: string,
    stops: RouteStop[],
    totalMinutes: number,
    totalMiles: number,
  ): string {
    const time = Math.round(totalMinutes);
    const distance = totalMiles.toFixed(1);

    if (stops.length === 0) {
      return `Route to ${destination}: ${time} min, ${distance} miles`;
    }

    const stopNames = stops.map(s => s.name).join(', ');
    return `Route to ${destination} with ${stops.length} stop${stops.length > 1 ? 's' : ''} ` +
      `(${stopNames}): ${time} min, ${distance} miles`;
  }

  /**
   * Calculate distance between two coordinates in meters
   */
  private calculateDistance(a: Coordinates, b: Coordinates): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const x =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(x)));
  }

  /**
   * Format error for ElevenLabs response
   */
  private formatError(error: unknown, context: string): { success: false; error: string; user_message: string } {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Generate user-friendly message
    let userMessage: string;
    if (errorMessage.includes('location') || errorMessage.includes('not found')) {
      userMessage = "I couldn't find that location. Could you try a different name?";
    } else if (errorMessage.includes('route') || errorMessage.includes('direction')) {
      userMessage = "I couldn't calculate that route. Maybe try a different destination?";
    } else {
      userMessage = `Sorry, I had trouble with ${context}. Please try again.`;
    }

    return {
      success: false,
      error: errorMessage,
      user_message: userMessage,
    };
  }
}
