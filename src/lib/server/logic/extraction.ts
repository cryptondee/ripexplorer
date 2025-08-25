/**
 * Shared extraction logic for user profile data
 * 
 * This module contains the core extraction logic that was previously embedded
 * in the /api/extract endpoint. By extracting this into a shared function,
 * both the API endpoint and other services (like trade-compare) can use
 * direct function calls instead of internal HTTP requests for better performance.
 */

import { fetchHTML } from '../services/fetcher.js';
import { extractSvelteKitData, sanitizeExtractedData, extractFromRipFunAPI } from '../services/parser.js';
import { cleanRipFunData, optimizeExtractedData } from '../services/normalizer.js';
import { userSyncService } from '../services/userSync.js';

export interface ExtractionOptions {
  method?: 'auto' | 'api' | 'html';
  forceRefresh?: boolean;
}

export interface ExtractionResult {
  username: string;
  originalInput: string;
  resolvedUserId: number | null;
  resolutionMethod: string;
  targetUrl: string;
  extractedData: any;
  extractionMethod: string;
  apiCallsMade: number;
  timestamp: string;
}

/**
 * Extract user profile data from rip.fun
 * 
 * @param input - Username or numeric user ID
 * @param options - Extraction options
 * @returns Promise<ExtractionResult>
 */
export async function extractUserProfile(
  input: string, 
  options: ExtractionOptions = {}
): Promise<ExtractionResult> {
  const { method = 'auto' } = options;
  
  if (!input) {
    throw new Error('Username or user ID is required');
  }
  
  const trimmedInput = input.trim();
  
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
      const rawExtractedData = await extractFromRipFunAPI(extractionTarget);
      extractedData = optimizeExtractedData(rawExtractedData);
      extractionMethod = 'api';
      apiCallsMade = rawExtractedData.api_calls_made || 0;
      
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
      const extractedOptimized = optimizeExtractedData(extractedFiltered);
      
      extractedData = extractedOptimized;
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
  
  // Return the extraction result
  return {
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
}