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
  StopDetail,
  RouteWarning,
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
    this.logger.log(`[planRoute] ========== START ==========`);
    this.logger.log(`[planRoute] Destination: "${dto.destination_name}"`);
    this.logger.log(`[planRoute] Origin: (${dto.user_location_lat}, ${dto.user_location_lng})`);
    this.logger.log(`[planRoute] Raw stops input: ${JSON.stringify(dto.stops)}`);
    this.logger.log(`[planRoute] Raw DTO anchors: home=(${dto.home_lat}, ${dto.home_lng}), work=(${dto.work_lat}, ${dto.work_lng})`);

    try {
      const origin: Coordinates = {
        lat: dto.user_location_lat,
        lng: dto.user_location_lng,
      };

      // Resolve destination - could be anchor or place name
      const destination = this.resolveDestination(dto);
      this.logger.log(`[planRoute] Resolved destination: "${destination.name}" at (${destination.location?.lat}, ${destination.location?.lng})`);

      // Check if anchor needs setup
      if (destination.needsSetup) {
        const anchorType = destination.needsSetup;
        this.logger.warn(`[planRoute] Anchor "${anchorType}" not configured - returning setup prompt`);
        return {
          success: false,
          error: `${anchorType}_not_configured`,
          user_message: `I don't have your ${anchorType} address saved yet. Could you tell me where ${anchorType} is, or give me a specific address?`,
        };
      }

      // Build anchors from dynamic variables
      const anchors = this.buildAnchors(dto);
      this.logger.log(`[planRoute] Anchors: ${anchors.map(a => `${a.name}(${a.location.lat},${a.location.lng})`).join(', ') || 'none'}`);

      // Build stops array from comma-separated or array input
      const stops = this.parseStops(dto.stops);
      this.logger.log(`[planRoute] Parsed stops (${stops.length}): ${JSON.stringify(stops)}`);

      // Call errand service with voiceMode for faster response (single route option)
      const input: NavigateWithStopsIn = {
        origin,
        destination: {
          name: destination.name,
          location: destination.location,
        },
        stops: stops.map(name => ({ name })),
        anchors,
        voiceMode: true, // Skip alternatives to reduce latency for voice interactions
      };

      this.logger.log(`[planRoute] Calling ErrandService.navigateWithStops (voice mode)...`);
      const result = await this.errandService.navigateWithStops(input);
      const processingTime = Date.now() - startTime;

      // Log detailed results
      this.logger.log(`[planRoute] ========== RESULTS ==========`);
      this.logger.log(`[planRoute] Processing time: ${processingTime}ms`);
      this.logger.log(`[planRoute] Route ID: ${result.route.id}`);
      this.logger.log(`[planRoute] Total: ${result.route.totalTime}min, ${result.route.totalDistance}mi`);
      this.logger.log(`[planRoute] Stops found: ${result.route.stops?.length || 0}`);

      // Log each stop with details
      if (result.route.stops && result.route.stops.length > 0) {
        result.route.stops.forEach((stop, i) => {
          this.logger.log(`[planRoute]   Stop ${i + 1}: "${stop.name}" at (${stop.location.lat}, ${stop.location.lng}), detour=${stop.detourCost}m, status=${stop.status}`);
        });
      }

      // Log excluded stops
      if (result.excludedStops && result.excludedStops.length > 0) {
        this.logger.warn(`[planRoute] EXCLUDED stops: ${result.excludedStops.map(s => `"${s.name}" (${s.reason})`).join(', ')}`);
      }

      // Log warnings
      if (result.warnings && result.warnings.length > 0) {
        result.warnings.forEach(w => {
          this.logger.warn(`[planRoute] WARNING: ${w.stopName} - ${w.message} (${w.detourMinutes}min, ${w.category})`);
        });
      }

      this.logger.log(`[planRoute] ========== END ==========`);

      // Get the actual time-based detour from the route option (in minutes, not meters!)
      // detourCost on stops is in METERS (distance to corridor), not time
      // extraTimeMin on the route option is the actual time-based detour
      const clusterExtraTimeMin = result.routeOptions?.[0]?.extraTimeMin ?? 0;

      // Transform to ElevenLabs format
      // For individual stops, estimate time from distance: ~500m/min suburban driving
      const routeStops: RouteStop[] = (result.route.stops || []).map(stop => ({
        id: stop.id,
        name: stop.name,
        lat: stop.location.lat,
        lng: stop.location.lng,
        order: stop.order,
        detour_minutes: Math.round((stop.detourCost || 0) / 500), // ~500m per minute
      }));

      // Build stop details for voice feedback
      const stopDetails: StopDetail[] = (result.route.stops || []).map(stop => {
        // Estimate individual stop detour time from distance (~500m per minute)
        const detourMinutes = Math.round((stop.detourCost || 0) / 500);
        return {
          name: stop.name,
          status: this.getStopStatus(stop.status),
          detour_minutes: detourMinutes,
          detour_description: this.getDetourDescription(detourMinutes),
          is_open: stop.isOpen,
          rating: stop.rating,
        };
      });

      // Transform warnings
      const warnings: RouteWarning[] = (result.warnings || []).map(w => ({
        message: w.message,
        category: w.category,
        requires_confirmation: w.category === 'FAR',
      }));

      // Use the actual time-based cluster detour (extraTimeMin), not distance-based estimates
      const totalDetourMinutes = Math.round(clusterExtraTimeMin);
      const detourCategory = this.getDetourCategory(totalDetourMinutes);

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
        stop_details: stopDetails,
        warnings,
        total_detour_minutes: totalDetourMinutes,
        detour_category: detourCategory,
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
        voiceMode: true, // Skip alternatives for faster voice response
      };

      const result = await this.errandService.navigateWithStops(input);
      const processingTime = Date.now() - startTime;

      this.logger.log(`[addStop] Completed in ${processingTime}ms (voice mode)`);

      // Get the actual time-based detour from the route option (in minutes, not meters!)
      const clusterExtraTimeMin = result.routeOptions?.[0]?.extraTimeMin ?? 0;

      // For individual stops, estimate time from distance: ~500m/min suburban driving
      const routeStops: RouteStop[] = (result.route.stops || []).map(stop => ({
        id: stop.id,
        name: stop.name,
        lat: stop.location.lat,
        lng: stop.location.lng,
        order: stop.order,
        detour_minutes: Math.round((stop.detourCost || 0) / 500), // ~500m per minute
      }));

      // Build stop details for voice feedback
      const stopDetails: StopDetail[] = (result.route.stops || []).map(stop => {
        // Estimate individual stop detour time from distance (~500m per minute)
        const detourMinutes = Math.round((stop.detourCost || 0) / 500);
        return {
          name: stop.name,
          status: this.getStopStatus(stop.status),
          detour_minutes: detourMinutes,
          detour_description: this.getDetourDescription(detourMinutes),
          is_open: stop.isOpen,
          rating: stop.rating,
        };
      });

      // Transform warnings
      const warnings: RouteWarning[] = (result.warnings || []).map(w => ({
        message: w.message,
        category: w.category,
        requires_confirmation: w.category === 'FAR',
      }));

      // Use the actual time-based cluster detour (extraTimeMin), not distance-based estimates
      const totalDetourMinutes = Math.round(clusterExtraTimeMin);
      const detourCategory = this.getDetourCategory(totalDetourMinutes);

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
        stop_details: stopDetails,
        warnings,
        total_detour_minutes: totalDetourMinutes,
        detour_category: detourCategory,
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
        voiceMode: true, // Skip alternatives for faster voice response
      };

      const result = await this.errandService.navigateWithStops(input);
      const processingTime = Date.now() - startTime;

      this.logger.log(`[getEta] Completed in ${processingTime}ms (voice mode): ${result.route.totalTime}min`);

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
  private resolveDestination(dto: PlanRouteDto): { name: string; location?: Coordinates; needsSetup?: string } {
    const destLower = dto.destination_name.toLowerCase().trim();

    // Check for home anchor
    if (destLower === 'home') {
      if (dto.home_lat && dto.home_lng) {
        return {
          name: 'Home',
          location: { lat: dto.home_lat, lng: dto.home_lng },
        };
      }
      // Home requested but not set up
      this.logger.warn(`[resolveDestination] "home" requested but no home coordinates saved`);
      return {
        name: 'home',
        needsSetup: 'home',
      };
    }

    // Check for work anchor
    if (destLower === 'work') {
      if (dto.work_lat && dto.work_lng) {
        return {
          name: 'Work',
          location: { lat: dto.work_lat, lng: dto.work_lng },
        };
      }
      // Work requested but not set up
      this.logger.warn(`[resolveDestination] "work" requested but no work coordinates saved`);
      return {
        name: 'work',
        needsSetup: 'work',
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

  /**
   * Convert backend stop status to voice-friendly status
   */
  private getStopStatus(backendStatus: string): 'on_route' | 'small_detour' | 'large_detour' {
    switch (backendStatus) {
      case 'NO_DETOUR':
      case 'MINIMAL':
        return 'on_route';
      case 'ACCEPTABLE':
        return 'small_detour';
      case 'NOT_RECOMMENDED':
      default:
        return 'large_detour';
    }
  }

  /**
   * Generate human-readable detour description for voice
   */
  private getDetourDescription(detourMinutes: number): string {
    if (detourMinutes <= 0) {
      return 'right on your route';
    } else if (detourMinutes <= 2) {
      return 'just a minute off your route';
    } else if (detourMinutes <= 5) {
      return `about ${detourMinutes} minutes off your route`;
    } else if (detourMinutes <= 10) {
      return `${detourMinutes} minutes out of your way`;
    } else {
      return `${detourMinutes} minutes - that's quite a detour`;
    }
  }

  /**
   * Determine overall detour category based on total extra time
   */
  private getDetourCategory(totalDetourMinutes: number): 'MINIMAL' | 'SIGNIFICANT' | 'FAR' {
    if (totalDetourMinutes <= 5) {
      return 'MINIMAL';
    } else if (totalDetourMinutes <= 10) {
      return 'SIGNIFICANT';
    } else {
      return 'FAR';
    }
  }
}
