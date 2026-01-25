/**
 * Navigation Tools - Tool implementations for navigation-related actions
 *
 * These tools connect the Orchestrator Agent to existing backend services.
 */

import { Injectable, Logger } from '@nestjs/common';
import { ToolRegistry, ToolResult, BUILT_IN_TOOLS } from './tool-registry';
import { EntityResolverService } from '../../errand/services/entity-resolver.service';
import { PlaceSearchService } from '../../places/place-search.service';
import { ErrandService } from '../../errand/services/errand.service';
import { TtsService } from '../../voice/services/tts.service';
import { ContextManagerService } from '../context/context-manager.service';

@Injectable()
export class NavigationToolsProvider {
  private readonly logger = new Logger(NavigationToolsProvider.name);

  constructor(
    private readonly toolRegistry: ToolRegistry,
    private readonly entityResolver: EntityResolverService,
    private readonly placeSearch: PlaceSearchService,
    private readonly errandService: ErrandService,
    private readonly ttsService: TtsService,
    private readonly contextManager: ContextManagerService,
  ) {
    this.registerTools();
  }

  /**
   * Register all navigation tools
   */
  private registerTools(): void {
    // Register resolve_anchor tool
    this.toolRegistry.register(
      BUILT_IN_TOOLS.find((t) => t.name === 'resolve_anchor')!,
      this.resolveAnchor.bind(this),
    );

    // Register search_places tool
    this.toolRegistry.register(
      BUILT_IN_TOOLS.find((t) => t.name === 'search_places')!,
      this.searchPlaces.bind(this),
    );

    // Register calculate_route tool
    this.toolRegistry.register(
      BUILT_IN_TOOLS.find((t) => t.name === 'calculate_route')!,
      this.calculateRoute.bind(this),
    );

    // Register calculate_detour tool
    this.toolRegistry.register(
      BUILT_IN_TOOLS.find((t) => t.name === 'calculate_detour')!,
      this.calculateDetour.bind(this),
    );

    // Register ask_user tool
    this.toolRegistry.register(
      BUILT_IN_TOOLS.find((t) => t.name === 'ask_user')!,
      this.askUser.bind(this),
    );

    // Register confirm_action tool
    this.toolRegistry.register(
      BUILT_IN_TOOLS.find((t) => t.name === 'confirm_action')!,
      this.confirmAction.bind(this),
    );

    // Register start_navigation tool
    this.toolRegistry.register(
      BUILT_IN_TOOLS.find((t) => t.name === 'start_navigation')!,
      this.startNavigation.bind(this),
    );

    // Register generate_response tool
    this.toolRegistry.register(
      BUILT_IN_TOOLS.find((t) => t.name === 'generate_response')!,
      this.generateResponse.bind(this),
    );

    this.logger.log('Navigation tools registered');
  }

  /**
   * Resolve an anchor (home, work) to coordinates
   *
   * Anchors are user-defined saved locations (home, work, etc.)
   * They must be provided by the caller via params.user_anchors
   * User's current GPS location is used as fallback/hint
   */
  private async resolveAnchor(params: Record<string, unknown>): Promise<ToolResult> {
    const anchorName = params.anchor_name as string;
    const userAnchors = params.user_anchors as Array<{ name: string; location: { lat: number; lng: number } }> | undefined;
    const userLocation = params.user_location as { lat: number; lng: number } | undefined;

    try {
      // User anchors must come from user's saved settings - never use hardcoded values
      const anchors = userAnchors || [];

      if (anchors.length === 0 && !userLocation) {
        return {
          success: false,
          error: `No saved locations found. Please set up your "${anchorName}" address in settings, or enable GPS for your current location.`,
          needsUserInput: true,
          question: `I don't have your ${anchorName} address saved. Would you like to set it up now?`,
          options: ['Use current location', 'Set up in settings'],
        };
      }

      // Use user's GPS location as hint for geocoding/places search
      const hintLocation = userLocation || (anchors.length > 0 ? anchors[0].location : undefined);

      if (!hintLocation) {
        return {
          success: false,
          error: 'Unable to determine location. Please enable GPS or set up saved locations.',
        };
      }

      const resolved = await this.entityResolver.resolveDestination(
        anchorName,
        anchors,
        hintLocation,
      );

      if (resolved) {
        return {
          success: true,
          data: {
            name: resolved.name,
            address: resolved.name,
            location: resolved.location,
            source: resolved.source,
          },
        };
      }

      return {
        success: false,
        error: `Could not find "${anchorName}". Please check your saved locations in settings.`,
        needsUserInput: true,
        question: `I couldn't find "${anchorName}". Would you like to use your current location instead?`,
        options: ['Use current location', 'Cancel'],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to resolve anchor',
      };
    }
  }

  /**
   * Search for places
   */
  private async searchPlaces(params: Record<string, unknown>): Promise<ToolResult> {
    const query = params.query as string;
    const location = params.location as { lat: number; lng: number } | undefined;
    const radiusMeters = (params.radius_meters as number) || 5000;
    const maxResults = (params.max_results as number) || 5;
    const routeContext = params.route_context as { origin: { lat: number; lng: number }; destination: { lat: number; lng: number } } | undefined;

    // Validate required parameters
    if (!query) {
      return {
        success: false,
        error: 'Search query is required',
      };
    }

    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      this.logger.warn(`search_places called without valid location: ${JSON.stringify(location)}`);
      return {
        success: false,
        error: 'Unable to search - your location is required. Please enable GPS.',
        needsUserInput: true,
        question: 'I need your location to search for places. Would you like to enable GPS?',
        options: ['Enable GPS', 'Cancel'],
      };
    }

    this.logger.log(`Searching for "${query}" near ${location.lat},${location.lng}`);

    try {
      const results = await this.placeSearch.searchPlaces(
        query,
        location,
        radiusMeters,
        maxResults,
        routeContext ? { destination: routeContext.destination } : undefined,
      );

      if (results.length === 0) {
        return {
          success: true,
          data: [],
          needsUserInput: false,
        };
      }

      // If multiple results and we might need disambiguation
      if (results.length > 1) {
        return {
          success: true,
          data: results.map((r) => ({
            id: r.placeId,
            name: r.name,
            address: r.address,
            location: r.location,
            rating: r.rating,
          })),
        };
      }

      // Single result
      return {
        success: true,
        data: results[0],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to search places',
      };
    }
  }

  /**
   * Calculate a route
   *
   * Origin MUST be provided as coordinates (from user's GPS)
   * Destination can be coordinates or a name to resolve
   */
  private async calculateRoute(params: Record<string, unknown>): Promise<ToolResult> {
    const origin = params.origin as { lat: number; lng: number } | undefined;
    const destination = params.destination as { lat: number; lng: number } | { name: string };
    const waypoints = params.waypoints as string[] | undefined;
    const userAnchors = params.user_anchors as Array<{ name: string; location: { lat: number; lng: number } }> | undefined;

    // Origin must be user's current GPS location - never hardcode
    if (!origin || !('lat' in origin)) {
      return {
        success: false,
        error: 'Unable to determine your current location. Please enable GPS.',
        needsUserInput: true,
        question: 'I need your current location to plan a route. Would you like to enable GPS?',
        options: ['Enable GPS', 'Cancel'],
      };
    }

    try {
      // Determine destination name - handle both string and object formats
      let destName: string;
      if (typeof destination === 'string') {
        destName = destination;
      } else if (destination && typeof destination === 'object' && 'name' in destination) {
        destName = (destination as { name: string }).name;
      } else {
        destName = 'destination';
      }

      // Use errand service to calculate route
      const result = await this.errandService.navigateWithStops({
        origin,
        destination: { name: destName },
        stops: (waypoints || []).map((w) => ({ name: w })),
        anchors: userAnchors || [],
      });

      return {
        success: true,
        data: {
          id: result.route.id || `route_${Date.now()}`,
          origin: result.route.origin,
          destination: result.route.destination,
          stops: result.route.stops,
          totalTime: result.route.totalTime,
          totalDistance: result.route.totalDistance,
          polyline: result.route.polyline,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate route',
      };
    }
  }

  /**
   * Calculate detour for adding a stop
   *
   * Actually calculates the route with and without the stop to determine
   * real detour time/distance. Uses errand service for accurate calculation.
   */
  private async calculateDetour(params: Record<string, unknown>): Promise<ToolResult> {
    const currentRoute = params.current_route as {
      origin: { location: { lat: number; lng: number } };
      destination: { location: { lat: number; lng: number } };
      totalTime: number;
      totalDistance: number;
      stops?: Array<{ name: string }>;
    } | undefined;
    const newStopParam = params.new_stop as { name: string; location?: { lat: number; lng: number } } | string;
    const userLocation = params.user_location as { lat: number; lng: number } | undefined;

    // Handle both string and object formats for new_stop
    const newStop = typeof newStopParam === 'string'
      ? { name: newStopParam }
      : newStopParam;

    if (!currentRoute) {
      return {
        success: false,
        error: 'No current route to calculate detour from. Plan a route first.',
      };
    }

    try {
      // Get origin location from current route or user's GPS
      const origin = currentRoute.origin?.location || userLocation;
      if (!origin) {
        return {
          success: false,
          error: 'Unable to determine origin for detour calculation. Please enable GPS.',
        };
      }

      // Calculate new route WITH the additional stop
      const existingStops = (currentRoute.stops || []).map((s) => s.name);
      const newStops = [...existingStops, newStop.name];

      const newRouteResult = await this.errandService.navigateWithStops({
        origin,
        destination: { name: 'destination', location: currentRoute.destination.location },
        stops: newStops.map((s) => ({ name: s })),
        anchors: [],
      });

      // Calculate actual detour
      const extraTime = newRouteResult.route.totalTime - currentRoute.totalTime;
      const extraDistance = newRouteResult.route.totalDistance - currentRoute.totalDistance;

      // Categorize detour based on FINAL_REQUIREMENTS.md thresholds
      // MINIMAL: 0-5 min, SIGNIFICANT: 5-10 min, FAR: 10+ min
      let category: 'minimal' | 'significant' | 'far' = 'minimal';
      if (extraTime > 10) category = 'far';
      else if (extraTime > 5) category = 'significant';

      const result = {
        stopName: newStop.name,
        extraTime: Math.round(extraTime), // in minutes
        extraDistance: Math.round(extraDistance * 10) / 10, // in miles, 1 decimal
        category,
        newTotalTime: newRouteResult.route.totalTime,
        newTotalDistance: newRouteResult.route.totalDistance,
      };

      this.logger.log(`Detour calculated for ${newStop.name}: +${result.extraTime}min (${category})`);

      // If significant detour (>5 min), ask user for confirmation
      if (category === 'significant' || category === 'far') {
        const warningText = category === 'far'
          ? `Adding ${newStop.name} would add ${Math.round(extraTime)} minutes to your trip. That's a significant detour.`
          : `Adding ${newStop.name} would add about ${Math.round(extraTime)} minutes.`;

        return {
          success: true,
          data: result,
          needsUserInput: true,
          question: `${warningText} Would you like to add it anyway?`,
          options: ['Yes, add it', 'No, skip it', 'Find a closer one'],
        };
      }

      // Minimal detour - proceed without asking
      return {
        success: true,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to calculate detour for ${newStop.name}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to calculate detour',
      };
    }
  }

  /**
   * Ask user a question
   */
  private async askUser(params: Record<string, unknown>): Promise<ToolResult> {
    const question = params.question as string;
    const options = params.options as string[] | undefined;

    return {
      success: true,
      needsUserInput: true,
      question,
      options,
    };
  }

  /**
   * Request confirmation for an action
   */
  private async confirmAction(params: Record<string, unknown>): Promise<ToolResult> {
    const action = params.action as string;
    const details = params.details as string | undefined;

    const question = details ? `${action} ${details}` : action;

    return {
      success: true,
      needsUserInput: true,
      question,
      options: ['Yes', 'No'],
    };
  }

  /**
   * Start navigation
   */
  private async startNavigation(params: Record<string, unknown>): Promise<ToolResult> {
    const routeId = params.route_id as string;

    this.logger.log(`Starting navigation for route: ${routeId}`);

    // In production, this would trigger the actual navigation
    // For now, just acknowledge
    return {
      success: true,
      data: {
        routeId,
        status: 'navigating',
        message: 'Navigation started',
      },
    };
  }

  /**
   * Generate a natural language response
   */
  private async generateResponse(params: Record<string, unknown>): Promise<ToolResult> {
    const messageType = params.message_type as string;
    const content = params.content as Record<string, unknown>;

    try {
      let text: string;

      switch (messageType) {
        case 'route_summary':
          text = this.generateRouteSummary(content);
          break;
        case 'confirmation':
          text = content.message as string || 'Please confirm.';
          break;
        case 'error':
          text = content.message as string || 'Something went wrong.';
          break;
        case 'info':
          text = content.message as string || 'Here you go.';
          break;
        default:
          text = 'How can I help you?';
      }

      return {
        success: true,
        data: { text },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate response',
      };
    }
  }

  /**
   * Generate a route summary text
   */
  private generateRouteSummary(content: Record<string, unknown>): string {
    const destination = content.destination as string;
    const stops = content.stops as string[] | undefined;
    const time = content.time as number | undefined;

    let summary = `Your route to ${destination}`;

    if (stops && stops.length > 0) {
      summary += ` with a stop at ${stops.join(' and ')}`;
    }

    summary += ' is ready.';

    if (time) {
      summary += ` Total time is about ${time} minutes.`;
    }

    summary += ' Ready to go?';

    return summary;
  }
}
