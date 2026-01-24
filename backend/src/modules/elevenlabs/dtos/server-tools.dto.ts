/**
 * Server Tools DTOs - ElevenLabs LLM Server Tools
 *
 * These DTOs define the request/response format for ElevenLabs Server Tools.
 * Server Tools are called by ElevenLabs LLM to get route data without
 * requiring a custom LLM backend.
 */

import { IsNumber, IsString, IsOptional, IsArray, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Request DTO for plan_route server tool
 * ElevenLabs sends dynamic variables as flat parameters
 */
export class PlanRouteDto {
  @IsNumber()
  @Type(() => Number)
  user_location_lat: number;

  @IsNumber()
  @Type(() => Number)
  user_location_lng: number;

  @IsString()
  destination_name: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  destination_lat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  destination_lng?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stops?: string[];

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  home_lat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  home_lng?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  work_lat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  work_lng?: number;
}

/**
 * Request DTO for search_places server tool
 */
export class SearchPlacesDto {
  @IsString()
  query: string;

  @IsNumber()
  @Type(() => Number)
  user_location_lat: number;

  @IsNumber()
  @Type(() => Number)
  user_location_lng: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(50000)
  @Type(() => Number)
  radius_meters?: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  @Type(() => Number)
  max_results?: number;
}

/**
 * Stop in route response
 */
export interface RouteStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  order: number;
  detour_minutes?: number;
}

/**
 * Success response for plan_route
 */
export interface PlanRouteSuccessResponse {
  success: true;
  route: {
    id: string;
    destination: {
      name: string;
      lat: number;
      lng: number;
    };
    stops: RouteStop[];
    totalTime: number;
    totalDistance: number;
    polyline: string;
  };
  summary: string;
}

/**
 * Error response for server tools
 */
export interface ServerToolErrorResponse {
  success: false;
  error: string;
  user_message: string;
}

/**
 * Union type for plan_route responses
 */
export type PlanRouteResponse = PlanRouteSuccessResponse | ServerToolErrorResponse;

/**
 * Place result in search_places response
 */
export interface PlaceResult {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
  rating?: number;
  is_open?: boolean;
  distance_meters: number;
}

/**
 * Success response for search_places
 */
export interface SearchPlacesSuccessResponse {
  success: true;
  places: PlaceResult[];
  count: number;
}

/**
 * Union type for search_places responses
 */
export type SearchPlacesResponse = SearchPlacesSuccessResponse | ServerToolErrorResponse;

/**
 * Request DTO for add_stop server tool
 * Adds a stop to an existing route
 */
export class AddStopDto {
  @IsString()
  stop_name: string;

  @IsNumber()
  @Type(() => Number)
  user_location_lat: number;

  @IsNumber()
  @Type(() => Number)
  user_location_lng: number;

  @IsString()
  destination_name: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  destination_lat?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  destination_lng?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  existing_stops?: string[];
}

/**
 * Request DTO for get_eta server tool
 */
export class GetEtaDto {
  @IsNumber()
  @Type(() => Number)
  user_location_lat: number;

  @IsNumber()
  @Type(() => Number)
  user_location_lng: number;

  @IsNumber()
  @Type(() => Number)
  destination_lat: number;

  @IsNumber()
  @Type(() => Number)
  destination_lng: number;

  @IsOptional()
  @IsString()
  destination_name?: string;
}

/**
 * Success response for get_eta
 */
export interface GetEtaSuccessResponse {
  success: true;
  eta_minutes: number;
  distance_miles: number;
  summary: string;
}

/**
 * Union type for get_eta responses
 */
export type GetEtaResponse = GetEtaSuccessResponse | ServerToolErrorResponse;

/**
 * Union type for add_stop responses (uses same as PlanRoute)
 */
export type AddStopResponse = PlanRouteSuccessResponse | ServerToolErrorResponse;
