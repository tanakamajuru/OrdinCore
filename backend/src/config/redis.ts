import IORedis from 'ioredis';
import dotenv from 'dotenv';

dotenv.config();

const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null,
  retryStrategy(times: number) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
};

export const redis = new IORedis(redisConfig);

redis.on('connect', () => {
  console.log('🔴 Connected to Redis');
});

redis.on('error', (err) => {
  console.error('Redis connection error:', err);
});

// Separate connection for BullMQ (requires maxRetriesPerRequest: null)
export const redisConnection = new IORedis(redisConfig);

export default redis;
