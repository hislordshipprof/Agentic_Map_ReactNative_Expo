import { Module } from '@nestjs/common';
import { AuthGuard } from '../../common/guards/auth.guard';
import { EscalateController } from './controllers/escalate.controller';
import { NluController } from './controllers/nlu.controller';
import { ConfidenceRouterService } from './confidence-router.service';
import { GeminiAdvancedService } from './gemini-advanced.service';
import { GeminiFastService } from './gemini-fast.service';
import { NluService } from './nlu.service';

@Module({
  controllers: [NluController, EscalateController],
  providers: [AuthGuard, GeminiFastService, GeminiAdvancedService, ConfidenceRouterService, NluService],
  exports: [NluService],
})
export class NluModule {}
