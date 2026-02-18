import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const CACHE_TTL = {
  ROUTE_SEC: 3600,       // 1 hour
  PLACE_SEC: 604800,     // 7 days
  GEOCODE_SEC: 604800,   // 7 days
  ANCHOR_SEC: 2592000,   // 30 days
  DISAMBIGUATE_SEC: 1209600, // 14 days
} as const;

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private redis: Redis | null = null;
  private fallback = new Map<string, { v: string; exp: number }>();

  constructor(private config: ConfigService) {
    const url = this.config.get<string>('REDIS_URL');
    if (url) {
      try {
        this.redis = new Redis(url, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
          connectTimeout: 2000,
        });
        this.redis.on('error', () => { /* avoid unhandled ECONNREFUSED when Redis is not running */ });
      } catch {
        this.redis = null;
      }
    }
  }

  async onModuleInit() {
    if (!this.redis) {
      this.logger.warn('No REDIS_URL configured — using in-memory cache');
      return;
    }
    try {
      await this.redis.connect();
      this.logger.log('Redis connected — caching with Redis');
    } catch {
      this.logger.warn('Redis unavailable — falling back to in-memory cache');
      this.redis = null;
    }
  }

  async onModuleDestroy() {
    if (this.redis) await this.redis.quit();
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.redis) {
      try {
        const s = await this.redis.get(key);
        if (s) return JSON.parse(s) as T;
      } catch {
        // fall through to fallback
      }
    }
    const e = this.fallback.get(key);
    if (e && e.exp > Date.now()) return JSON.parse(e.v) as T;
    if (e) this.fallback.delete(key);
    return null;
  }

  async set(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
    const s = JSON.stringify(value);
    if (this.redis) {
      try {
        if (ttlSeconds) await this.redis.setex(key, ttlSeconds, s);
        else await this.redis.set(key, s);
        return;
      } catch {
        // fall through
      }
    }
    const exp = ttlSeconds ? Date.now() + ttlSeconds * 1000 : Infinity;
    this.fallback.set(key, { v: s, exp });
  }

  async delete(key: string): Promise<void> {
    if (this.redis) {
      try { await this.redis.del(key); } catch {}
    }
    this.fallback.delete(key);
  }
}
