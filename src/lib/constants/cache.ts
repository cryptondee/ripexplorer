/**
 * Cache duration constants in seconds
 * Centralizes all cache TTL configurations
 */

export const CACHE_DURATIONS = {
  // User and profile data
  USER_PROFILE: 3600,           // 1 hour
  USER_EXTRACTION: 3600,        // 1 hour
  
  // Card and set data
  SET_DATA: 86400,              // 24 hours
  CARD_LISTINGS: 300,           // 5 minutes
  
  // Trade and comparison data
  TRADE_COMPARISON: 3600,       // 1 hour
  
  // Sales data
  SALES_EVENTS: 60,             // 1 minute (real-time data)
  
  // Username resolution
  USERNAME_RESOLUTION: 7200,    // 2 hours
} as const;

// Helper to convert seconds to milliseconds
export const toMilliseconds = (seconds: number): number => seconds * 1000;

// Human-readable cache duration names
export const CACHE_DURATION_NAMES: Record<number, string> = {
  60: '1 minute',
  300: '5 minutes',
  3600: '1 hour',
  7200: '2 hours',
  86400: '24 hours',
};
