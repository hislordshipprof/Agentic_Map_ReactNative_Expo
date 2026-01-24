/**
 * ElevenLabs Module - OpenAI-compatible LLM and Server Tools integration
 *
 * This module provides two integration options with ElevenLabs:
 *
 * 1. Custom LLM (Original):
 *    - OpenAI-compatible /v1/chat/completions endpoint
 *    - Full LLM processing on backend with Gemini
 *    - Higher latency (~800-1500ms per response)
 *
 * 2. Server Tools (New - Recommended):
 *    - /api/v1/elevenlabs-tools/* endpoints
 *    - ElevenLabs LLM handles conversation
 *    - Backend only handles route planning / place search
 *    - Lower latency (~500-1000ms, just Google APIs)
 *
 * Dependencies:
 * - AgentModule: For OrchestratorAgent (Custom LLM mode)
 * - ErrandModule: For route planning (both modes)
 * - PlacesModule: For place search (Server Tools mode)
 */

import { Module } from '@nestjs/common';
import { ElevenLabsController } from './elevenlabs.controller';
import { ElevenLabsService } from './elevenlabs.service';
import { ElevenLabsToolsController } from './elevenlabs-tools.controller';
import { ElevenLabsToolsService } from './elevenlabs-tools.service';
import { AgentModule } from '../agent/agent.module';
import { ErrandModule } from '../errand/errand.module';
import { PlacesModule } from '../places/places.module';

@Module({
  imports: [
    AgentModule, // Provides OrchestratorAgent and ContextManagerService
    ErrandModule, // Provides ErrandService for route planning
    PlacesModule, // Provides PlaceSearchService for place search
  ],
  controllers: [
    ElevenLabsController, // Custom LLM endpoint (/v1/chat/completions)
    ElevenLabsToolsController, // Server Tools endpoints (/api/v1/elevenlabs-tools/*)
  ],
  providers: [
    ElevenLabsService, // Custom LLM service
    ElevenLabsToolsService, // Server Tools service
  ],
  exports: [ElevenLabsService, ElevenLabsToolsService],
})
export class ElevenLabsModule {}
