import { json } from '@sveltejs/kit';
import { fetchHTML } from '$lib/server/services/fetcher.js';
import { extractSvelteKitData, sanitizeExtractedData } from '$lib/server/services/parser.js';
import { cleanRipFunData } from '$lib/server/services/normalizer.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { username } = await request.json();
    
    if (!username) {
      return json({ error: 'Username is required' }, { status: 400 });
    }
    
    const targetUrl = `https://www.rip.fun/profile/${username.trim()}`;
    
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
    
    return json({
      username,
      targetUrl,
      extractedData: extractedFiltered,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Extraction failed:', error);
    const message = error instanceof Error ? error.message : 'Unknown error occurred';
    return json({ error: `Extraction failed: ${message}` }, { status: 500 });
  }
};