import { json } from '@sveltejs/kit';
import { redisCache } from '$lib/server/redis/client.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  try {
    // Test Redis connection and basic operations
    const testKey = 'test:redis:connection';
    const testValue = { 
      message: 'Hello Redis!', 
      timestamp: new Date().toISOString() 
    };

    // Test SET operation
    const setResult = await redisCache.set(testKey, testValue, 60); // 1 minute TTL
    
    // Test GET operation
    const getValue = await redisCache.get(testKey);
    
    // Test EXISTS operation
    const exists = await redisCache.exists(testKey);
    
    // Test PING operation
    const pingResult = await redisCache.ping();
    
    // Test INCREMENT operation
    const incrKey = 'test:redis:counter';
    const counterValue = await redisCache.incr(incrKey, 60);
    
    return json({
      success: true,
      redis_status: 'connected',
      tests: {
        set: setResult,
        get: getValue,
        exists: exists,
        ping: pingResult,
        increment: counterValue
      },
      message: 'Redis is working correctly!'
    });
    
  } catch (error) {
    console.error('Redis test failed:', error);
    
    return json({
      success: false,
      redis_status: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Redis test failed - check logs for details'
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { action } = await request.json();
    
    if (action === 'clear_test_keys') {
      // Clear test keys
      await redisCache.del('test:redis:connection');
      await redisCache.del('test:redis:counter');
      
      return json({
        success: true,
        message: 'Test keys cleared'
      });
    }
    
    return json({
      success: false,
      message: 'Unknown action'
    }, { status: 400 });
    
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};