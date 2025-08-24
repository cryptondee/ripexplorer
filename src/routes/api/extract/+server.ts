import { json } from '@sveltejs/kit';
import { fetchHTML } from '$lib/server/services/fetcher.js';
import { extractSvelteKitData, sanitizeExtractedData, extractFromRipFunAPI } from '$lib/server/services/parser.js';
import { cleanRipFunData } from '$lib/server/services/normalizer.js';
import { userSyncService } from '$lib/server/services/userSync.js';
import { redisCache, CacheKeys } from '$lib/server/redis/client.js';
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
    let resolvedUsername = trimmedInput;
    let resolvedUserId: number | null = null;
    let resolutionMethod = 'direct';
    
    // Check if input is a number (user ID) or username
    const isNumericId = /^\d+$/.test(trimmedInput);
    
    if (!isNumericId) {
      // Input appears to be a username, try to resolve it to user ID
      try {
        console.log(`Attempting to resolve username: ${trimmedInput}`);
        const userData = await userSyncService.getUserByUsername(trimmedInput);
        
        if (userData) {
          resolvedUserId = userData.id;
          resolvedUsername = userData.username;
          resolutionMethod = 'database';
          console.log(`Username resolved: ${trimmedInput} -> ID: ${resolvedUserId}`);
        } else {
          console.log(`Username not found in database: ${trimmedInput}, using as direct username`);
          // Will use input directly as rip.fun username
        }
      } catch (error) {
        console.warn(`Username resolution failed for ${trimmedInput}:`, error);
        // Continue with direct username approach
      }
    } else {
      // Input is numeric, treat as user ID
      resolvedUserId = parseInt(trimmedInput);
      resolutionMethod = 'numeric';
      console.log(`Using numeric input as user ID: ${resolvedUserId}`);
    }
    
    const targetUrl = `https://www.rip.fun/profile/${resolvedUsername}`;
    let extractedData;
    let extractionMethod = 'unknown';
    let apiCallsMade = 0;
    
    // Try API extraction first (preferred method for complete data)
    if (method === 'auto' || method === 'api') {
      try {
        console.log(`Attempting API extraction for user: ${resolvedUsername} (ID: ${resolvedUserId || 'unknown'})`);
        // Use resolvedUserId if available, otherwise fall back to resolvedUsername (for numeric inputs)
        const extractionTarget = resolvedUserId ? resolvedUserId.toString() : resolvedUsername;
        extractedData = await extractFromRipFunAPI(extractionTarget);
        extractionMethod = 'api';
        apiCallsMade = extractedData.api_calls_made || 0;
        
        const cardCount = extractedData.profile?.digital_cards?.length || 0;
        console.log(`API extraction successful: ${cardCount} cards`);
        
        // If API returns no cards, fall back to HTML parsing to get complete collection
        if (cardCount === 0 && method === 'auto') {
          console.log('API returned no cards, falling back to HTML parsing for complete collection');
          extractedData = null; // Reset to trigger fallback
        }
      } catch (apiError) {
        console.warn('API extraction failed, falling back to HTML parsing:', apiError);
        
        // If method is specifically 'api', don't fall back
        if (method === 'api') {
          throw apiError;
        }
      }
    }
    
    // Fall back to HTML parsing if API extraction failed or wasn't attempted
    if (!extractedData && (method === 'auto' || method === 'html')) {
      try {
        console.log(`Attempting HTML extraction for user: ${resolvedUsername} (ID: ${resolvedUserId || 'unknown'})`);
        
        // Use longer timeouts for rip.fun profiles which can be data-heavy
        const html = await fetchHTML(targetUrl, {
          maxRetries: 3,
          initialTimeout: 20000, // 20 seconds initial
          maxTimeout: 60000, // Maximum 60 seconds
          retryDelay: 2000 // 2 second base delay
        });
        
        const extractedRaw = extractSvelteKitData(html);
        const extractedClean = sanitizeExtractedData(extractedRaw);
        const extractedFiltered = cleanRipFunData(extractedClean);
        
        extractedData = extractedFiltered;
        extractionMethod = 'html';
        
        console.log(`HTML extraction successful: ${extractedData.profile?.digital_cards?.length || 0} cards`);
      } catch (htmlError) {
        console.error('HTML extraction also failed:', htmlError);
        throw htmlError;
      }
    }
    
    if (!extractedData) {
      throw new Error('No extraction method succeeded');
    }
    
    // Prepare response data
    const responseData = {
      username: resolvedUsername,
      originalInput: trimmedInput,
      resolvedUserId,
      resolutionMethod,
      targetUrl,
      extractedData,
      extractionMethod,
      apiCallsMade,
      timestamp: new Date().toISOString()
    };
    
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