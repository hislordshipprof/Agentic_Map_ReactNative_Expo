import { Module } from '@nestjs/common';
import { EscalateController } from './controllers/escalate.controller';
import { NluController } from './controllers/nlu.controller';
import { ConfidenceRouterService } from './confidence-router.service';
import { GeminiAdvancedService } from './gemini-advanced.service';
import { GeminiFastService } from './gemini-fast.service';
import { NluService } from './nlu.service';

@Module({
  controllers: [NluController, EscalateController],
  providers: [GeminiFastService, GeminiAdvancedService, ConfidenceRouterService, NluService],
  exports: [NluService],
})
export class NluModule {}
