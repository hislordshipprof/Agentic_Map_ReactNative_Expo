import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { envValidation } from './config/env.validation';
import { CacheModule } from './modules/cache/cache.module';
import { ErrandModule } from './modules/errand/errand.module';
import { NluModule } from './modules/nlu/nlu.module';
import { QueueModule } from './modules/queue/queue.module';
import { UserModule } from './modules/user/user.module';
import { VoiceModule } from './modules/voice/voice.module';
import { ElevenLabsModule } from './modules/elevenlabs/elevenlabs.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: envValidation,
      envFilePath: ['.env.local', '.env'],
    }),
    PrismaModule,
    CacheModule,
    QueueModule,
    ErrandModule,
    NluModule,
    UserModule,
    VoiceModule,
    ElevenLabsModule, // OpenAI-compatible endpoint for ElevenLabs custom LLM
  ],
  controllers: [AppController],
})
export class AppModule {}
