/**
 * ElevenLabs Tools Controller - Server Tools Endpoints
 *
 * These endpoints are called by ElevenLabs LLM when it decides to use
 * server tools. The LLM sends structured parameters and expects
 * structured responses.
 *
 * Endpoints:
 * - POST /api/v1/elevenlabs-tools/plan-route
 * - POST /api/v1/elevenlabs-tools/search-places
 *
 * These are NOT authenticated endpoints because:
 * 1. ElevenLabs sends the request, not the user's device
 * 2. Authentication happens at the ElevenLabs agent level
 * 3. We can add API key validation if needed for production
 */

import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Logger,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { ElevenLabsToolsService } from './elevenlabs-tools.service';
import {
  PlanRouteDto,
  SearchPlacesDto,
  AddStopDto,
  GetEtaDto,
  type PlanRouteResponse,
  type SearchPlacesResponse,
  type AddStopResponse,
  type GetEtaResponse,
} from './dtos';

@Controller('elevenlabs-tools')
export class ElevenLabsToolsController {
  private readonly logger = new Logger(ElevenLabsToolsController.name);

  constructor(private readonly toolsService: ElevenLabsToolsService) {}

  /**
   * Plan a route from user's current location to a destination
   *
   * Server Tool: plan_route
   *
   * The ElevenLabs LLM calls this when the user wants to navigate.
   * Returns structured route data that the LLM can describe to the user.
   */
  @Post('plan-route')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async planRoute(@Body() dto: PlanRouteDto): Promise<PlanRouteResponse> {
    this.logger.log(
      `[plan-route] Request: destination="${dto.destination_name}", ` +
      `stops=${dto.stops?.length || 0}, ` +
      `location=(${dto.user_location_lat}, ${dto.user_location_lng})`
    );

    const result = await this.toolsService.planRoute(dto);

    this.logger.log(
      `[plan-route] Response: success=${result.success}, ` +
      (result.success ? `time=${result.route.totalTime}min` : `error="${result.error}"`)
    );

    return result;
  }

  /**
   * Search for places near the user
   *
   * Server Tool: search_places
   *
   * The ElevenLabs LLM calls this when the user wants to find places
   * without necessarily navigating to them.
   */
  @Post('search-places')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async searchPlaces(@Body() dto: SearchPlacesDto): Promise<SearchPlacesResponse> {
    this.logger.log(
      `[search-places] Request: query="${dto.query}", ` +
      `radius=${dto.radius_meters || 5000}m, ` +
      `location=(${dto.user_location_lat}, ${dto.user_location_lng})`
    );

    const result = await this.toolsService.searchPlaces(dto);

    this.logger.log(
      `[search-places] Response: success=${result.success}, ` +
      (result.success ? `count=${result.count}` : `error="${result.error}"`)
    );

    return result;
  }

  /**
   * Add a stop to the current route
   *
   * Server Tool: add_stop
   *
   * Recalculates the route with an additional stop.
   */
  @Post('add-stop')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async addStop(@Body() dto: AddStopDto): Promise<AddStopResponse> {
    this.logger.log(
      `[add-stop] Request: stop="${dto.stop_name}", destination="${dto.destination_name}"`
    );

    const result = await this.toolsService.addStop(dto);

    this.logger.log(
      `[add-stop] Response: success=${result.success}`
    );

    return result;
  }

  /**
   * Get estimated time of arrival
   *
   * Server Tool: get_eta
   *
   * Returns ETA and distance to destination.
   */
  @Post('get-eta')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async getEta(@Body() dto: GetEtaDto): Promise<GetEtaResponse> {
    this.logger.log(
      `[get-eta] Request: destination="${dto.destination_name || 'unknown'}"`
    );

    const result = await this.toolsService.getEta(dto);

    this.logger.log(
      `[get-eta] Response: success=${result.success}, ` +
      (result.success ? `eta=${result.eta_minutes}min` : `error="${result.error}"`)
    );

    return result;
  }

  /**
   * Health check endpoint
   */
  @Post('health')
  @HttpCode(HttpStatus.OK)
  async healthCheck(): Promise<{ status: string; timestamp: number }> {
    return {
      status: 'ok',
      timestamp: Date.now(),
    };
  }
}
