/**
 * Agent Module - Agentic AI orchestration
 *
 * This module provides the multi-agent architecture for intelligent,
 * context-aware conversation handling. It replaces hardcoded flows
 * with LLM-driven tool orchestration.
 *
 * Architecture:
 * - ContextManagerService: Maintains conversation memory
 * - UnderstandingAgent: Multi-turn NLU with clarification
 * - OrchestratorAgent: LLM-driven tool selection and execution
 * - ToolRegistry: Available tools (search, route, confirm, etc.)
 */

import { Module } from '@nestjs/common';
import { ContextManagerService } from './context/context-manager.service';
import { UnderstandingAgent } from './agents/understanding.agent';
import { OrchestratorAgent } from './agents/orchestrator.agent';
import { ToolRegistry } from './tools/tool-registry';
import { NluModule } from '../nlu/nlu.module';
import { ErrandModule } from '../errand/errand.module';
import { PlacesModule } from '../places/places.module';

@Module({
  imports: [
    NluModule,
    ErrandModule,
    PlacesModule,
  ],
  providers: [
    // Core services
    ContextManagerService,
    ToolRegistry,

    // Agents
    UnderstandingAgent,
    OrchestratorAgent,

    // Note: NavigationToolsProvider is registered by VoiceModule
    // to avoid circular dependencies
  ],
  exports: [
    ContextManagerService,
    UnderstandingAgent,
    OrchestratorAgent,
    ToolRegistry,
  ],
})
export class AgentModule {}
