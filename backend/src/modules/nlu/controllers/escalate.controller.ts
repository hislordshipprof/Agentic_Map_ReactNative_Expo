import { Body, Controller, Post } from '@nestjs/common';
import { EscalateDto } from '../dtos/nlu.dto';
import { NluService } from '../nlu.service';

@Controller()
export class EscalateController {
  constructor(private readonly nlu: NluService) {}

  @Post('escalate-to-llm')
  async escalateToLlm(@Body() dto: EscalateDto) {
    return this.nlu.escalate(dto.utterance, {
      conversationHistory: dto.conversationHistory,
    });
  }
}
