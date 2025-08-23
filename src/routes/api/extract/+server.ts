import { json } from '@sveltejs/kit';
import { fetchHTML } from '$lib/server/services/fetcher.js';
import { extractSvelteKitData, sanitizeExtractedData, extractFromRipFunAPI } from '$lib/server/services/parser.js';
import { cleanRipFunData } from '$lib/server/services/normalizer.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { username, method = 'auto' } = await request.json();
    
    if (!username) {
      return json({ error: 'Username is required' }, { status: 400 });
    }
    
    const trimmedUsername = username.trim();
    const targetUrl = `https://www.rip.fun/profile/${trimmedUsername}`;
    let extractedData;
    let extractionMethod = 'unknown';
    let apiCallsMade = 0;
    
    // Try API extraction first (preferred method for complete data)
    if (method === 'auto' || method === 'api') {
      try {
        console.log(`Attempting API extraction for user: ${trimmedUsername}`);
        extractedData = await extractFromRipFunAPI(trimmedUsername);
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
        console.log(`Attempting HTML extraction for user: ${trimmedUsername}`);
        
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
    
    return json({
      username: trimmedUsername,
      targetUrl,
      extractedData,
      extractionMethod,
      apiCallsMade,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Extraction failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return json({ error: `Extraction failed: ${message}` }, { status: 500 });
  }
};