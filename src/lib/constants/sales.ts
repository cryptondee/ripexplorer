/**
 * Sales-related constants
 * Centralizes magic numbers and configuration values
 */

// Currency addresses on Base network
export const CURRENCY_ADDRESSES = {
  USDC: '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
  ETH: '0x0000000000000000000000000000000000000000',
} as const;

// Decimal places for different currencies
export const CURRENCY_DECIMALS = {
  USDC: 6,
  ETH: 18,
} as const;

// Default pagination and limits
export const SALES_LIMITS = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_LIVE_EVENTS: 50,
  INITIAL_EVENTS_LOAD: 10,
  STATS_QUERY_LIMIT: 1000,
} as const;

// Timeframe options
export const TIMEFRAMES = [
  { value: '1h', label: '1 Hour' },
  { value: '24h', label: '24 Hours' },
  { value: '7d', label: '7 Days' },
  { value: '30d', label: '30 Days' },
  { value: 'all', label: 'All Time' }
] as const;

// Rarity options
export const RARITIES = [
  { value: '', label: 'All Rarities' },
  { value: 'Common', label: 'Common' },
  { value: 'Uncommon', label: 'Uncommon' },
  { value: 'Rare', label: 'Rare' },
  { value: 'Epic', label: 'Epic' },
  { value: 'Legendary', label: 'Legendary' }
] as const;

// Connection and retry settings
export const CONNECTION_SETTINGS = {
  RECONNECT_DELAY: 5000,
  MAX_RECONNECT_ATTEMPTS: 5,
  KEEPALIVE_INTERVAL: 30000,
} as const;

// Default filter values
export const DEFAULT_FILTERS = {
  timeframe: '24h',
  cardSet: null,
  rarity: null,
  minPrice: null,
  maxPrice: null,
} as const;
