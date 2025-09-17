/**
 * User Discovery Service
 * Handles user lookup and caching for sales events
 * Extracted from salesMonitor.ts for better separation of concerns
 */

import { userSyncService } from '../userSync.js';
import { logger } from '$lib/utils/logger.js';

export interface UserInfo {
  buyerUsername: string | null;
  sellerUsername: string | null;
}

export class UserDiscoveryService {
  private static instance: UserDiscoveryService;
  
  // Cache for negative lookups (addresses that don't have usernames)
  private negativeCache = new Map<string, number>();
  private readonly NEGATIVE_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

  static getInstance(): UserDiscoveryService {
    if (!UserDiscoveryService.instance) {
      UserDiscoveryService.instance = new UserDiscoveryService();
    }
    return UserDiscoveryService.instance;
  }

  /**
   * Enrich addresses with usernames
   */
  async enrichWithUsernames(buyerAddress: string, sellerAddress: string): Promise<UserInfo> {
    const [buyerUsername, sellerUsername] = await Promise.all([
      this.discoverUser(buyerAddress),
      this.discoverUser(sellerAddress)
    ]);

    return {
      buyerUsername,
      sellerUsername
    };
  }

  /**
   * Discover username for a single address
   */
  private async discoverUser(address: string): Promise<string | null> {
    try {
      // Check negative cache first
      if (this.isInNegativeCache(address)) {
        return null;
      }

      logger.log(`👤 Discovering user for address: ${address}`);
      
      const user = await userSyncService.syncUserByAddress(address);
      
      if (user?.username) {
        logger.log(`✅ Found username: ${user.username} for ${address}`);
        return user.username;
      } else {
        logger.log(`❌ No username found for ${address}`);
        this.addToNegativeCache(address);
        return null;
      }
    } catch (error) {
      logger.error(`❌ Error discovering user for address ${address}:`, error);
      
      // Add to negative cache on API errors to avoid immediate retries
      if (error instanceof Error && 
          (error.message.includes('404') || 
           error.message.includes('timeout') || 
           error.message.includes('network'))) {
        logger.log(`📝 Adding ${address} to negative cache due to API error`);
        this.addToNegativeCache(address);
      }
      
      return null;
    }
  }

  /**
   * Check if address is in negative cache and still valid
   */
  private isInNegativeCache(address: string): boolean {
    const cachedTime = this.negativeCache.get(address);
    if (cachedTime) {
      const isExpired = Date.now() - cachedTime > this.NEGATIVE_CACHE_DURATION;
      if (isExpired) {
        this.negativeCache.delete(address);
        return false;
      }
      return true;
    }
    return false;
  }

  /**
   * Add address to negative cache
   */
  private addToNegativeCache(address: string): void {
    this.negativeCache.set(address, Date.now());
  }

  /**
   * Clear expired entries from negative cache
   */
  clearExpiredCache(): void {
    const now = Date.now();
    for (const [address, timestamp] of this.negativeCache.entries()) {
      if (now - timestamp > this.NEGATIVE_CACHE_DURATION) {
        this.negativeCache.delete(address);
      }
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.negativeCache.size,
      entries: Array.from(this.negativeCache.keys())
    };
  }
}

// Export singleton instance
export const userDiscoveryService = UserDiscoveryService.getInstance();
