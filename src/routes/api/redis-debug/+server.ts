import { json } from '@sveltejs/kit';
import { redisCache } from '$lib/server/redis/client.js';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action') || 'stats';
    
    if (action === 'keys') {
      // For mock Redis, we can't list all keys easily
      // So we'll check common patterns
      const commonKeys = [
        'test:redis:connection',
        'test:redis:counter',
        'rip:set:sv3pt5',
        'rip:set:sv1-151', 
        'rip:set:sv2-151',
        'rip:extract:testuser123'
      ];
      
      const keyData: any = {};
      for (const key of commonKeys) {
        const exists = await redisCache.exists(key);
        if (exists) {
          const value = await redisCache.get(key);
          keyData[key] = {
            exists: true,
            data: value,
            dataType: typeof value,
            size: JSON.stringify(value).length
          };
        } else {
          keyData[key] = { exists: false };
        }
      }
      
      return json({
        success: true,
        action: 'keys',
        keys: keyData,
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'get') {
      const key = url.searchParams.get('key');
      if (!key) {
        return json({ error: 'Key parameter required' }, { status: 400 });
      }
      
      const exists = await redisCache.exists(key);
      const value = exists ? await redisCache.get(key) : null;
      
      return json({
        success: true,
        action: 'get',
        key,
        exists,
        value,
        valueType: typeof value,
        size: value ? JSON.stringify(value).length : 0,
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'stats') {
      // Get health and basic stats
      const ping = await redisCache.ping();
      
      return json({
        success: true,
        action: 'stats',
        redis_healthy: ping,
        available_actions: [
          'stats - Show Redis health',
          'keys - Show common cached keys', 
          'get?key=<key> - Get specific key value'
        ],
        common_cache_keys: [
          'rip:set:sv3pt5 - Pokemon set data',
          'rip:extract:username - User extraction data',
          'test:redis:connection - Test data',
          'test:redis:counter - Test counter'
        ],
        timestamp: new Date().toISOString()
      });
    }
    
    return json({ error: 'Unknown action' }, { status: 400 });
    
  } catch (error) {
    console.error('Redis debug error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { action, key, value, ttl } = await request.json();
    
    if (action === 'set') {
      if (!key || !value) {
        return json({ error: 'Key and value required' }, { status: 400 });
      }
      
      const result = await redisCache.set(key, value, ttl);
      return json({
        success: true,
        action: 'set',
        key,
        stored: result,
        timestamp: new Date().toISOString()
      });
    }
    
    if (action === 'del') {
      if (!key) {
        return json({ error: 'Key required' }, { status: 400 });
      }
      
      const result = await redisCache.del(key);
      return json({
        success: true,
        action: 'delete',
        key,
        deleted: result,
        timestamp: new Date().toISOString()
      });
    }
    
    return json({ error: 'Unknown action' }, { status: 400 });
    
  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
};