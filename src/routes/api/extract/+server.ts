import { json } from '@sveltejs/kit';
import { redisCache, CacheKeys } from '$lib/server/redis/client.js';
import { extractUserProfile } from '$lib/server/logic/extraction.js';
import { CACHE_DURATIONS } from '$lib/constants/cache.js';
import { logger } from '$lib/utils/logger.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { username, forceRefresh = false } = await request.json();
    
    if (!username) {
      return json({ error: 'Username is required' }, { status: 400 });
    }
    
    const trimmedInput = username.trim();
    
    // Check Redis cache first (unless force refresh requested)
    if (!forceRefresh) {
      const cacheKey = CacheKeys.extraction(trimmedInput);
      const cachedResult = await redisCache.get(cacheKey);
      
      if (cachedResult) {
        logger.cache('HIT', `extraction: ${trimmedInput}`);
        return json({
          ...cachedResult,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }
      
      logger.cache('MISS', `extraction: ${trimmedInput}`);
    } else {
      logger.cache('SKIP', `extraction: ${trimmedInput}`, '(force refresh)');
    }
    
    // Use the shared extraction logic
    const responseData = await extractUserProfile(trimmedInput, {});
    
    // Cache successful extraction
    try {
      const cacheKey = CacheKeys.extraction(trimmedInput);
      await redisCache.set(cacheKey, responseData, CACHE_DURATIONS.USER_EXTRACTION);
      logger.cache('STORE', `extraction: ${trimmedInput}`);
    } catch (cacheError) {
      // Don't fail the request if caching fails
      logger.warn('Failed to cache extraction result:', cacheError);
    }
    
    return json({
      ...responseData,
      cached: false
    });
    
  } catch (error) {
    logger.error('Extraction failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return json({ error: `Extraction failed: ${message}` }, { status: 500 });
  }
};