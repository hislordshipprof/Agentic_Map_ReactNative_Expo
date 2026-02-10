import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  // Set log levels: 'log', 'warn', 'error' only (no 'debug' or 'verbose')
  // This reduces noise from audio chunk processing, VAD, etc.
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  // Enable CORS for ElevenLabs and development
  app.enableCors({
    origin: [
      'https://elevenlabs.io',
      'https://*.elevenlabs.io',
      'http://localhost:3000',
      'http://localhost:8081',
      // Allow all origins in development (configure properly in production)
      ...(process.env.NODE_ENV !== 'production' ? ['*'] : []),
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    credentials: true,
  });

  // Global prefix for most routes, but exclude /v1 routes (OpenAI-compatible endpoints)
  app.setGlobalPrefix('api/v1', {
    exclude: [
      'v1/chat/completions',  // ElevenLabs custom LLM endpoint
      'v1/models',            // OpenAI models endpoint
    ],
  });

  app.use((req: any, _res: any, next: () => void) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false, // Allow extra fields from ElevenLabs
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());

  const port = process.env.PORT ?? 3000;
  await app.listen(port, '0.0.0.0');
  console.log(`[Backend] Listening on http://0.0.0.0:${port} (use your PC's LAN IP, e.g. http://10.0.0.144:${port})`);
  console.log(`[Backend] ElevenLabs endpoint: http://0.0.0.0:${port}/v1/chat/completions`);
}

bootstrap().catch((err) => {
  console.error('Bootstrap failed:', err);
  process.exit(1);
});
