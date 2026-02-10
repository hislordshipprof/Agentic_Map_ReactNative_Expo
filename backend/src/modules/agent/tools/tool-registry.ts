/**
 * Tool Registry - Defines tools available to the Orchestrator Agent
 *
 * Tools are functions the LLM can call to interact with backend services.
 * This is similar to Grok's Agent Tools API.
 */

import { Injectable, Logger } from '@nestjs/common';

/**
 * Tool parameter definition
 */
export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  enum?: string[]; // For restricted values
}

/**
 * Tool definition
 */
export interface ToolDefinition {
  name: string;
  description: string;
  parameters: ToolParameter[];
  returns: string;
  examples?: string[];
}

/**
 * Tool execution result
 */
export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
  needsUserInput?: boolean;
  question?: string;
  options?: string[];
}

/**
 * Tool executor function type
 */
export type ToolExecutor = (params: Record<string, unknown>) => Promise<ToolResult>;

/**
 * Registered tool with definition and executor
 */
export interface RegisteredTool {
  definition: ToolDefinition;
  executor: ToolExecutor;
}

@Injectable()
export class ToolRegistry {
  private readonly logger = new Logger(ToolRegistry.name);
  private tools: Map<string, RegisteredTool> = new Map();

  /**
   * Register a tool
   */
  register(definition: ToolDefinition, executor: ToolExecutor): void {
    this.tools.set(definition.name, { definition, executor });
    this.logger.log(`Registered tool: ${definition.name}`);
  }

  /**
   * Get a tool by name
   */
  getTool(name: string): RegisteredTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Execute a tool
   */
  async execute(name: string, params: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        error: `Tool not found: ${name}`,
      };
    }

    try {
      this.logger.debug(`Executing tool: ${name} with params: ${JSON.stringify(params)}`);
      const result = await tool.executor(params);
      this.logger.debug(`Tool ${name} result: ${JSON.stringify(result).substring(0, 200)}`);
      return result;
    } catch (error) {
      this.logger.error(`Tool ${name} failed:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Tool execution failed',
      };
    }
  }

  /**
   * Get all tool definitions (for LLM prompt)
   */
  getAllDefinitions(): ToolDefinition[] {
    return Array.from(this.tools.values()).map((t) => t.definition);
  }

  /**
   * Get tool definitions as JSON schema (for function calling)
   */
  getToolsAsJsonSchema(): object[] {
    return this.getAllDefinitions().map((def) => ({
      type: 'function',
      function: {
        name: def.name,
        description: def.description,
        parameters: {
          type: 'object',
          properties: def.parameters.reduce(
            (acc, param) => {
              acc[param.name] = {
                type: param.type,
                description: param.description,
                ...(param.enum ? { enum: param.enum } : {}),
              };
              return acc;
            },
            {} as Record<string, unknown>,
          ),
          required: def.parameters.filter((p) => p.required).map((p) => p.name),
        },
      },
    }));
  }

  /**
   * Get tools description for prompt injection
   */
  getToolsDescription(): string {
    const descriptions = this.getAllDefinitions().map((def) => {
      const params = def.parameters
        .map((p) => `  - ${p.name} (${p.type}${p.required ? ', required' : ''}): ${p.description}`)
        .join('\n');
      return `**${def.name}**: ${def.description}\nParameters:\n${params}`;
    });

    return descriptions.join('\n\n');
  }
}

/**
 * Built-in tool definitions
 */
export const BUILT_IN_TOOLS: ToolDefinition[] = [
  {
    name: 'resolve_anchor',
    description: 'Convert an anchor name (like "home" or "work") to an actual address and coordinates',
    parameters: [
      {
        name: 'anchor_name',
        type: 'string',
        description: 'The anchor name to resolve (e.g., "home", "work")',
        required: true,
      },
      {
        name: 'user_id',
        type: 'string',
        description: 'The user ID to look up anchors for',
        required: false,
      },
    ],
    returns: 'Address and coordinates for the anchor, or error if not found',
    examples: ['resolve_anchor("home")', 'resolve_anchor("work")'],
  },
  {
    name: 'search_places',
    description: 'Search for places matching a query near a location or along a route',
    parameters: [
      {
        name: 'query',
        type: 'string',
        description: 'What to search for (e.g., "Starbucks", "gas station", "grocery store")',
        required: true,
      },
      {
        name: 'location',
        type: 'object',
        description: 'Center point for search: { lat: number, lng: number }',
        required: true,
      },
      {
        name: 'radius_meters',
        type: 'number',
        description: 'Search radius in meters (default: 5000)',
        required: false,
      },
      {
        name: 'max_results',
        type: 'number',
        description: 'Maximum number of results to return (default: 5)',
        required: false,
      },
      {
        name: 'route_context',
        type: 'object',
        description: 'Optional route context for corridor search: { origin: LatLng, destination: LatLng }',
        required: false,
      },
    ],
    returns: 'Array of places with name, address, location, rating, and distance',
    examples: [
      'search_places("Starbucks", { lat: 39.7, lng: -104.9 })',
      'search_places("gas station", location, 3000, 3)',
    ],
  },
  {
    name: 'calculate_route',
    description: 'Calculate a route between two points, optionally with waypoints',
    parameters: [
      {
        name: 'origin',
        type: 'object',
        description: 'Starting point: { lat: number, lng: number } or { name: string }',
        required: true,
      },
      {
        name: 'destination',
        type: 'object',
        description: 'End point: { lat: number, lng: number } or { name: string }',
        required: true,
      },
      {
        name: 'waypoints',
        type: 'array',
        description: 'Optional intermediate stops',
        required: false,
      },
    ],
    returns: 'Route with distance, duration, polyline, and leg details',
    examples: ['calculate_route(currentLocation, { name: "home" }, [starbucksLocation])'],
  },
  {
    name: 'calculate_detour',
    description: 'Calculate how much time/distance a stop adds to a route',
    parameters: [
      {
        name: 'current_route',
        type: 'object',
        description: 'The current route (origin, destination, existing waypoints)',
        required: true,
      },
      {
        name: 'new_stop',
        type: 'object',
        description: 'The stop to add: { name: string, location: { lat, lng } }',
        required: true,
      },
    ],
    returns: 'Detour info: extra_time, extra_distance, category (minimal/significant/far)',
    examples: ['calculate_detour(myRoute, { name: "Starbucks", location: {...} })'],
  },
  {
    name: 'ask_user',
    description: 'Ask the user a clarifying question and wait for their response',
    parameters: [
      {
        name: 'question',
        type: 'string',
        description: 'The question to ask',
        required: true,
      },
      {
        name: 'options',
        type: 'array',
        description: 'Optional list of choices to present',
        required: false,
      },
      {
        name: 'reason',
        type: 'string',
        description: 'Why this clarification is needed (for logging)',
        required: false,
      },
    ],
    returns: 'Signals that user input is needed; flow pauses until response',
    examples: [
      'ask_user("Which Starbucks - downtown or airport?", ["Downtown", "Airport"])',
      'ask_user("Adding Trader Joe\'s would add 11 minutes. Is that okay?")',
    ],
  },
  {
    name: 'confirm_action',
    description: 'Ask user to confirm an action before executing',
    parameters: [
      {
        name: 'action',
        type: 'string',
        description: 'Description of the action to confirm',
        required: true,
      },
      {
        name: 'details',
        type: 'string',
        description: 'Additional details about the action',
        required: false,
      },
    ],
    returns: 'Signals that confirmation is needed; flow pauses until response',
    examples: ['confirm_action("Start navigation to home via Starbucks?", "Total time: 15 minutes")'],
  },
  {
    name: 'start_navigation',
    description: 'Start turn-by-turn navigation for a confirmed route',
    parameters: [
      {
        name: 'route_id',
        type: 'string',
        description: 'The ID of the route to navigate',
        required: true,
      },
    ],
    returns: 'Navigation started confirmation',
    examples: ['start_navigation("route_123")'],
  },
  {
    name: 'generate_response',
    description: 'Generate a natural language response to speak to the user',
    parameters: [
      {
        name: 'message_type',
        type: 'string',
        description: 'Type of response: "route_summary", "confirmation", "error", "info"',
        required: true,
        enum: ['route_summary', 'confirmation', 'error', 'info'],
      },
      {
        name: 'content',
        type: 'object',
        description: 'Content to include in the response',
        required: true,
      },
    ],
    returns: 'Text to speak to the user',
    examples: [
      'generate_response("route_summary", { destination: "home", stops: ["Starbucks"], time: 15 })',
    ],
  },
];
