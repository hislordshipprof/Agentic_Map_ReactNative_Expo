/**
 * Voice Module - Real-time voice streaming infrastructure
 *
 * Per FINAL_REQUIREMENTS.md - Voice-First Architecture:
 * - WebSocket gateway for audio streaming
 * - VAD (Voice Activity Detection) service
 * - STT (Speech-to-Text) via Google Cloud Speech
 * - TTS (Text-to-Speech) via Google Cloud TTS
 * - Audio pipeline orchestration
 */

import { Module, OnModuleInit } from '@nestjs/common';
import { NluModule } from '../nlu/nlu.module';
import { VoiceGateway } from './voice.gateway';
import { VadService } from './services/vad.service';
import { SttService } from './services/stt.service';
import { TtsService } from './services/tts.service';
import { AudioPipelineService } from './services/audio-pipeline.service';

@Module({
  imports: [
    NluModule, // For processing transcribed text
  ],
  providers: [
    VoiceGateway,
    VadService,
    SttService,
    TtsService,
    AudioPipelineService,
  ],
  exports: [
    VoiceGateway,
    AudioPipelineService,
    TtsService,
  ],
})
export class VoiceModule implements OnModuleInit {
  constructor(
    private readonly gateway: VoiceGateway,
    private readonly pipeline: AudioPipelineService,
  ) {}

  onModuleInit() {
    // Wire up gateway and pipeline
    this.gateway.setAudioPipeline(this.pipeline);
  }
}
