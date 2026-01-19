import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../../common/guards/auth.guard';
import { NluProcessDto } from '../dtos/nlu.dto';
import { NluService } from '../nlu.service';

@Controller('nlu')
@UseGuards(AuthGuard)
export class NluController {
  constructor(private readonly nlu: NluService) {}

  @Post('process')
  async process(@Body() dto: NluProcessDto) {
    return this.nlu.process(dto.utterance, dto.context);
  }
}
