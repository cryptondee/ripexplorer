/**
 * Redis client configuration for multi-environment deployment
 * Works with Railway Redis plugin, local development, and testing
 */
import Redis from 'ioredis';
import { dev } from '$app/environment';

// Global Redis instance
let redisInstance: Redis | null = null;

/**
 * Create Redis connection based on environment
 */
function createRedisConnection(): Redis {
  // Railway automatically provides REDIS_URL when Redis plugin is enabled
  const redisUrl = process.env.REDIS_URL || process.env.REDISCLOUD_URL || process.env.REDIS_PRIVATE_URL;
  
  if (redisUrl) {
    console.log('🔴 Connecting to Redis via URL:', redisUrl.split('@')[0] + '@***');
    return new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      lazyConnect: true,
      // Connection timeout
      connectTimeout: 10000,
      // Command timeout  
      commandTimeout: 5000,
    });
  }

  // Check if local Redis is explicitly requested and available
  if (dev && process.env.USE_LOCAL_REDIS === 'true') {
    console.log('🔴 Attempting to connect to local Redis (development)');
    return new Redis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 1, // Fail fast for local development
      retryDelayOnFailover: 100,
      lazyConnect: true,
      // Fail fast if can't connect
      connectTimeout: 2000,
    });
  }

  // Default: Use mock Redis for development/testing
  console.log('🔴 Using mock Redis client (no external Redis required)');
  return createMockRedis();
}

/**
 * Mock Redis client for testing/development without Redis
 */
function createMockRedis(): Redis {
  const mockStorage = new Map<string, { value: string; expiry?: number }>();
  
  const mockRedis = {
    get: async (key: string) => {
      const item = mockStorage.get(key);
      if (!item) return null;
      if (item.expiry && Date.now() > item.expiry) {
        mockStorage.delete(key);
        return null;
      }
      return item.value;
    },
    
    set: async (key: string, value: string) => {
      mockStorage.set(key, { value });
      return 'OK';
    },
    
    setex: async (key: string, ttl: number, value: string) => {
      mockStorage.set(key, { 
        value, 
        expiry: Date.now() + (ttl * 1000) 
      });
      return 'OK';
    },
    
    del: async (key: string) => {
      const existed = mockStorage.has(key);
      mockStorage.delete(key);
      return existed ? 1 : 0;
    },
    
    exists: async (key: string) => {
      return mockStorage.has(key) ? 1 : 0;
    },
    
    incr: async (key: string) => {
      const current = mockStorage.get(key);
      const newValue = current ? parseInt(current.value) + 1 : 1;
      mockStorage.set(key, { value: newValue.toString() });
      return newValue;
    },
    
    expire: async (key: string, ttl: number) => {
      const item = mockStorage.get(key);
      if (!item) return 0;
      item.expiry = Date.now() + (ttl * 1000);
      return 1;
    },
    
    // Mock connection methods
    connect: async () => {},
    disconnect: async () => {},
    ping: async () => 'PONG',
    
    // Status
    status: 'ready'
  } as any;

  console.log('🔴 Using mock Redis client');
  return mockRedis;
}

/**
 * Get Redis client instance (singleton)
 */
export function getRedisClient(): Redis {
  if (!redisInstance) {
    redisInstance = createRedisConnection();
    
    // Handle connection events only for real Redis instances (not mock)
    if (redisInstance.status !== 'ready' && typeof redisInstance.on === 'function') {
      redisInstance.on('connect', () => {
        console.log('🔴 Redis connected successfully');
      });
      
      redisInstance.on('error', (err) => {
        console.warn('🔴 Redis connection error (falling back to mock):', err.message);
        // Replace with mock client on connection failure
        if (redisInstance) {
          redisInstance.removeAllListeners();
        }
        redisInstance = createMockRedis();
      });
      
      redisInstance.on('close', () => {
        console.log('🔴 Redis connection closed (using mock fallback)');
        // Replace with mock client when connection closes
        redisInstance = createMockRedis();
      });
    }
  }
  
  return redisInstance;
}

/**
 * Redis utility functions for common operations
 */
export class RedisCache {
  private redis: Redis;
  
  constructor() {
    this.redis = getRedisClient();
  }
  
  /**
   * Get cached value with JSON parsing
   */
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.warn(`Redis GET error for key ${key} (using fallback):`, error instanceof Error ? error.message : error);
      // Refresh Redis client on error
      this.redis = getRedisClient();
      return null;
    }
  }
  
  /**
   * Set cached value with JSON stringification
   */
  async set(key: string, value: any, ttlSeconds?: number): Promise<boolean> {
    try {
      const serialized = JSON.stringify(value);
      if (ttlSeconds) {
        await this.redis.setex(key, ttlSeconds, serialized);
      } else {
        await this.redis.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.warn(`Redis SET error for key ${key} (operation continues):`, error instanceof Error ? error.message : error);
      // Refresh Redis client on error
      this.redis = getRedisClient();
      return false;
    }
  }
  
  /**
   * Delete cached value
   */
  async del(key: string): Promise<boolean> {
    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.error(`Redis DEL error for key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result > 0;
    } catch (error) {
      console.error(`Redis EXISTS error for key ${key}:`, error);
      return false;
    }
  }
  
  /**
   * Increment counter with optional expiry
   */
  async incr(key: string, ttlSeconds?: number): Promise<number> {
    try {
      const result = await this.redis.incr(key);
      if (ttlSeconds && result === 1) {
        await this.redis.expire(key, ttlSeconds);
      }
      return result;
    } catch (error) {
      console.error(`Redis INCR error for key ${key}:`, error);
      return 0;
    }
  }
  
  /**
   * Get multiple keys at once
   */
  async mget<T>(keys: string[]): Promise<(T | null)[]> {
    try {
      const values = await this.redis.mget(...keys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error(`Redis MGET error for keys ${keys.join(', ')}:`, error);
      return keys.map(() => null);
    }
  }
  
  /**
   * Health check
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === 'PONG';
    } catch (error) {
      console.error('Redis PING error:', error);
      return false;
    }
  }
}

// Export singleton instance
export const redisCache = new RedisCache();

/**
 * Cache key generators for consistent naming
 */
export const CacheKeys = {
  profile: (username: string) => `rip:profile:${username}`,
  setData: (setId: string) => `rip:set:${setId}`,
  userSearch: (query: string) => `rip:search:${query.toLowerCase()}`,
  tradeAnalysis: (userA: string, userB: string) => `rip:trade:${userA}:${userB}`,
  rateLimit: (ip: string) => `rip:rate:${ip}`,
  extraction: (username: string) => `rip:extract:${username}`,
  marketplace: (cardId: string) => `rip:market:${cardId}`,
};