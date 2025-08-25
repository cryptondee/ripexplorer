import { json } from '@sveltejs/kit';
import { redisCache, CacheKeys } from '$lib/server/redis/client.js';
import { extractUserProfile } from '$lib/server/logic/extraction.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { username, method = 'auto', forceRefresh = false } = await request.json();
    
    if (!username) {
      return json({ error: 'Username is required' }, { status: 400 });
    }
    
    const trimmedInput = username.trim();
    
    // Check Redis cache first (unless force refresh requested)
    if (!forceRefresh) {
      const cacheKey = CacheKeys.extraction(trimmedInput);
      const cachedResult = await redisCache.get(cacheKey);
      
      if (cachedResult) {
        console.log(`🔴 Cache HIT for extraction: ${trimmedInput}`);
        return json({
          ...cachedResult,
          cached: true,
          timestamp: new Date().toISOString()
        });
      }
      
      console.log(`🔴 Cache MISS for extraction: ${trimmedInput}`);
    } else {
      console.log(`🔴 Cache SKIP (force refresh) for extraction: ${trimmedInput}`);
    }
    
    // Use the shared extraction logic
    const responseData = await extractUserProfile(trimmedInput, { method });
    
    // Cache successful extraction for 1 hour (3600 seconds)
    try {
      const cacheKey = CacheKeys.extraction(trimmedInput);
      await redisCache.set(cacheKey, responseData, 3600);
      console.log(`🔴 Cache STORED for extraction: ${trimmedInput}`);
    } catch (cacheError) {
      // Don't fail the request if caching fails
      console.warn('Failed to cache extraction result:', cacheError);
    }
    
    return json({
      ...responseData,
      cached: false
    });
    
  } catch (error) {
    console.error('Extraction failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return json({ error: `Extraction failed: ${message}` }, { status: 500 });
  }
};