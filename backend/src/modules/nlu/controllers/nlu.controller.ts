import { Body, Controller, Post } from '@nestjs/common';
import { NluProcessDto } from '../dtos/nlu.dto';
import { NluService } from '../nlu.service';

@Controller('nlu')
export class NluController {
  constructor(private readonly nlu: NluService) {}

  @Post('process')
  async process(@Body() dto: NluProcessDto) {
    return this.nlu.process(dto.utterance, dto.context);
  }
}
