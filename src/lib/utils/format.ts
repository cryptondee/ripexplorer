/**
 * Formatting utilities
 * Centralizes all string formatting functions
 */

/**
 * Format a blockchain address to show first and last characters
 * @param address - The full blockchain address
 * @returns Formatted address like "0x1234...5678"
 */
export function formatAddress(address: string): string {
  if (!address || address.length < 10) return address || '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format a transaction hash for display
 * @param hash - The full transaction hash
 * @returns Formatted hash
 */
export function formatTxHash(hash: string): string {
  if (!hash || hash.length < 10) return hash || '';
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`;
}

/**
 * Format wei to ETH with specified decimals
 * @param wei - Value in wei as string
 * @param decimals - Number of decimal places
 * @returns Formatted ETH value
 */
export function formatWeiToEth(wei: string, decimals: number = 4): string {
  try {
    const eth = parseFloat(wei) / 1e18;
    return eth.toFixed(decimals);
  } catch {
    return '0';
  }
}

/**
 * Format a price value with currency symbol
 * @param price - Price as number or string
 * @param currency - Currency symbol (default: $)
 * @returns Formatted price string
 */
export function formatPrice(price: number | string, currency: string = '$'): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) return `${currency}0.00`;
  return `${currency}${numPrice.toFixed(2)}`;
}

/**
 * Format a number with thousand separators
 * @param num - Number to format
 * @returns Formatted number string
 */
export function formatNumber(num: number | string): string {
  const n = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(n)) return '0';
  return n.toLocaleString();
}
