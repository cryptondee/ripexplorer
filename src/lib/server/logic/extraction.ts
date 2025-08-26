/**
 * Shared extraction logic for user profile data
 * 
 * This module contains the core extraction logic that was previously embedded
 * in the /api/extract endpoint. By extracting this into a shared function,
 * both the API endpoint and other services (like trade-compare) can use
 * direct function calls instead of internal HTTP requests for better performance.
 */

import { extractFromRipFunAPI } from '../services/parser.js';
import { userSyncService } from '../services/userSync.js';

/**
 * Resolve username to user ID by fetching the rip.fun profile page
 * and extracting the user ID from the page data
 */
async function resolveUsernameFromProfilePage(username: string): Promise<number | null> {
  try {
    const profileUrl = `https://www.rip.fun/profile/${username}`;
    console.log(`Attempting to resolve username '${username}' via profile page: ${profileUrl}`);
    
    const response = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.log(`Profile not found for username: ${username}`);
        return null;
      }
      throw new Error(`Profile page returned ${response.status}`);
    }
    
    const html = await response.text();
    
    // Look for user ID in the page data - check for common patterns
    // rip.fun often includes user data in script tags or data attributes
    const userIdMatch = html.match(/"user_id":\s*(\d+)/i) || 
                       html.match(/"id":\s*(\d+)/i) ||
                       html.match(/user[_-]?id["']?:\s*["']?(\d+)/i);
    
    if (userIdMatch) {
      const userId = parseInt(userIdMatch[1]);
      console.log(`Extracted user ID ${userId} from profile page for ${username}`);
      return userId;
    }
    
    console.log(`Could not find user ID in profile page for username: ${username}`);
    return null;
    
  } catch (error) {
    console.error(`Failed to resolve username '${username}' from profile page:`, error);
    return null;
  }
}

export interface ExtractionOptions {
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
        console.log(`Username not found in database: ${trimmedInput}, attempting profile page lookup`);
        // Try to resolve username by fetching profile page
        try {
          const profilePageId = await resolveUsernameFromProfilePage(trimmedInput);
          if (profilePageId) {
            resolvedUserId = profilePageId;
            resolutionMethod = 'profile_page';
            console.log(`Username resolved via profile page: ${trimmedInput} -> ID: ${resolvedUserId}`);
          } else {
            console.log(`Username '${trimmedInput}' not found via profile page either`);
          }
        } catch (profileError) {
          console.warn(`Profile page resolution failed for ${trimmedInput}:`, profileError);
        }
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
  let extractionMethod = 'api';
  let apiCallsMade = 0;
  
  // Use API extraction (only method now)
  try {
    console.log(`Attempting API extraction for user: ${resolvedUsername} (ID: ${resolvedUserId || 'unknown'})`);
    // API requires numeric user ID only
    if (!resolvedUserId) {
      throw new Error(`Could not resolve username '${resolvedUsername}' to user ID. The user may not exist or may not be in our database yet.`);
    }
    const extractionTarget = resolvedUserId.toString();
    extractedData = await extractFromRipFunAPI(extractionTarget);
    apiCallsMade = extractedData.api_calls_made || 0;
    
    const cardCount = extractedData.profile?.digital_cards?.length || 0;
    console.log(`API extraction successful: ${cardCount} cards`);
  } catch (apiError) {
    console.error('API extraction failed:', apiError);
    throw new Error(`Failed to extract user data: ${apiError instanceof Error ? apiError.message : 'Unknown error'}`);
  }
  
  if (!extractedData) {
    throw new Error('Failed to extract user data');
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