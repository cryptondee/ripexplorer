import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { redisCache, CacheKeys } from '$lib/server/redis/client.js';
import { EXTERNAL_URLS } from '$lib/constants/urls.js';
import { createRipFunFetchOptions } from '$lib/constants/http.js';

export const GET: RequestHandler = async ({ params, url }) => {
  const { setId } = params;
  const requestId = Math.random().toString(36).substring(2, 8);
  
  console.log(`📥 API[${requestId}]: Received request for set ${setId}`);
  
  if (!setId) {
    return json({ error: 'Set ID is required' }, { status: 400 });
  }

  // Check cache first
  const cacheKey = CacheKeys.setData(setId);
  const cachedData = await redisCache.get(cacheKey);
  
  if (cachedData) {
    console.log(`🔴 API[${requestId}]: Cache HIT for set data: ${setId}`);
    return json({
      ...cachedData,
      cached: true
    });
  }
  
  console.log(`🔴 API[${requestId}]: Cache MISS for set data: ${setId}`);

  try {
    // Get query parameters from the request
    const page = url.searchParams.get('page') || '1';
    const limit = url.searchParams.get('limit') || '1000';
    const sort = url.searchParams.get('sort') || 'number-asc';
    const all = url.searchParams.get('all') || 'true';

    // Fetch data from rip.fun API
    const apiUrl = EXTERNAL_URLS.RIP_FUN.API_SET_CARDS(setId, { page, limit, sort, all });
    const response = await fetch(apiUrl, createRipFunFetchOptions());

    if (!response.ok) {
      throw new Error(`rip.fun API returned ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Remove clip_embedding data to reduce payload size
    if (data.cards && Array.isArray(data.cards)) {
      data.cards = data.cards.map((card: any) => {
        const cleanCard = { ...card };
        delete cleanCard.clip_embedding;
        if (cleanCard.card) {
          delete cleanCard.card.clip_embedding;
        }
        return cleanCard;
      });
    }

    // Cache the cleaned data permanently (Pokemon set data is static)
    try {
      await redisCache.set(cacheKey, data); // No TTL = permanent cache
      console.log(`🔴 Cache STORED PERMANENTLY for set data: ${setId}`);
    } catch (cacheError) {
      // Don't fail the request if caching fails
      console.warn('Failed to cache set data:', cacheError);
    }

    return json({
      ...data,
      cached: false
    });
  } catch (error) {
    console.error(`Error fetching set ${setId} data:`, error);
    
    return json(
      { 
        error: 'Failed to fetch set data',
        details: error instanceof Error ? error.message : 'Unknown error'
      }, 
      { status: 500 }
    );
  }
};