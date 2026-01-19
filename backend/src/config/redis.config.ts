export function getRedisConfig() {
  return {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  };
}
