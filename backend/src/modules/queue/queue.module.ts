import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('REDIS_URL') ?? 'redis://localhost:6379';
        try {
          const u = new URL(url);
          return {
            redis: {
              host: u.hostname,
              port: parseInt(u.port || '6379', 10),
            },
          };
        } catch {
          return { redis: { host: 'localhost', port: 6379 } };
        }
      },
      inject: [ConfigService],
    }),
    BullModule.registerQueue(
      { name: 'optimize_route' },
      { name: 'batch_place_search' },
    ),
  ],
  exports: [BullModule],
})
export class QueueModule {}
