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
  let extractionMethod = 'api';
  let apiCallsMade = 0;
  
  // Use API extraction (only method now)
  try {
    console.log(`Attempting API extraction for user: ${resolvedUsername} (ID: ${resolvedUserId || 'unknown'})`);
    // Use resolvedUserId if available, otherwise fall back to resolvedUsername (for numeric inputs)
    const extractionTarget = resolvedUserId ? resolvedUserId.toString() : resolvedUsername;
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