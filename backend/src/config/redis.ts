import IORedis from 'ioredis';


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
  console.log('🔴 OrdinCore: Connected to Redis (Worker Engine Active)');
});

redis.on('error', (err) => {
  // Only log full error if it's not a connection refusal to reduce terminal spam
  if (err.code === 'ECONNREFUSED') {
    if (process.env.NODE_ENV === 'development') {
      // Periodic subtle warning instead of constant spam
      if (Math.random() < 0.01) console.warn('⚠️ Redis not detected. Background workers are in standby.');
    }
  } else {
    console.error('Redis connection error:', err);
  }
});

// Separate connection for BullMQ (requires maxRetriesPerRequest: null)
export const redisConnection = new IORedis(redisConfig);

export default redis;
