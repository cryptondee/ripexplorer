/**
 * HTTP configuration constants
 * Centralizes headers, timeouts, and other HTTP-related settings
 */

export const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Accept': 'application/json',
} as const;

export const RIP_FUN_HEADERS = {
  ...DEFAULT_HEADERS,
  'Referer': 'https://www.rip.fun/'
} as const;

/**
 * Create fetch options with default or custom headers
 */
export function createFetchOptions(additionalHeaders: Record<string, string> = {}) {
  return {
    headers: {
      ...DEFAULT_HEADERS,
      ...additionalHeaders
    }
  };
}

/**
 * Create fetch options specifically for rip.fun API calls
 */
export function createRipFunFetchOptions(additionalHeaders: Record<string, string> = {}) {
  return {
    headers: {
      ...RIP_FUN_HEADERS,
      ...additionalHeaders
    }
  };
}

// Timeout configurations
export const TIMEOUTS = {
  DEFAULT: 20000,      // 20 seconds
  EXTENDED: 60000,     // 60 seconds
  SHORT: 5000,         // 5 seconds
} as const;
