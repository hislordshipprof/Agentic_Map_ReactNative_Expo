import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { EscalateDto } from '../dtos/nlu.dto';
import { NluService } from '../nlu.service';

@Controller()
@UseGuards(AuthGuard)
export class EscalateController {
  constructor(private readonly nlu: NluService) {}

  @Post('escalate-to-llm')
  async escalateToLlm(@Body() dto: EscalateDto) {
    return this.nlu.escalate(dto.utterance, {
      conversationHistory: dto.conversationHistory,
    });
  }
}
