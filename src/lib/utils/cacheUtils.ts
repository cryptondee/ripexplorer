/**
 * Centralized localStorage cache utilities for rip.fun data extractor
 * Provides consistent caching patterns for user data and Pokemon TCG sets
 */

export interface CacheData {
  data: any;
  timestamp: number;
  userId?: string;
  setId?: string;
}

// Cache key generators
export function getCacheKey(userId: string): string {
  return `ripexplorer_cache_${userId}`;
}

export function getSetCacheKey(setId: string): string {
  return `ripexplorer_set_${setId}`;
}

// User cache operations
export function saveToCache(userId: string, data: any): void {
  try {
    const cacheData: CacheData = {
      data,
      timestamp: Date.now(),
      userId
    };
    localStorage.setItem(getCacheKey(userId), JSON.stringify(cacheData));
  } catch (err) {
    console.warn('Failed to save data to localStorage:', err);
  }
}

export function loadFromCache(userId: string): CacheData | null {
  try {
    const cached = localStorage.getItem(getCacheKey(userId));
    if (cached) {
      const cacheData: CacheData = JSON.parse(cached);
      // Check if cache is for the same user
      if (cacheData.userId === userId) {
        return cacheData;
      }
    }
    return null;
  } catch (err) {
    console.warn('Failed to load data from localStorage:', err);
    return null;
  }
}

export function clearUserCache(userId: string): void {
  try {
    localStorage.removeItem(getCacheKey(userId));
  } catch (err) {
    console.warn('Failed to clear user cache:', err);
  }
}

// Set cache operations (for Pokemon TCG sets)
// DEPRECATED: Set caching now handled by Redis on backend
export function saveSetToCache(setId: string, data: any): void {
  // No-op: Set data caching moved to Redis backend to avoid localStorage quota issues
  console.log(`Set data caching handled by Redis backend for: ${setId}`);
}

// DEPRECATED: Set caching now handled by Redis on backend
export function loadSetFromCache(setId: string): CacheData | null {
  // No-op: Set data caching moved to Redis backend
  return null;
}

// Bulk cache management
// DEPRECATED: Set caching now handled by Redis on backend
export function clearAllSetCaches(): void {
  // No-op: Set data caching moved to Redis backend
  console.log('Set cache clearing handled by Redis backend');
}

export function clearAllCaches(): void {
  try {
    // Clear only user caches (not set caches which are in Redis)
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('ripexplorer_cache_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('Cleared user caches');
  } catch (err) {
    console.warn('Failed to clear user caches:', err);
  }
}

// Cache status utilities
export function getCacheAge(cacheData: CacheData | null): number {
  if (!cacheData) return Infinity;
  return Date.now() - cacheData.timestamp;
}

export function isCacheValid(cacheData: CacheData | null, maxAgeMs: number = 3600000): boolean {
  if (!cacheData) return false;
  return getCacheAge(cacheData) < maxAgeMs;
}

export function getCacheStats(): { userCaches: number; setCaches: number; totalSize: string } {
  try {
    const keys = Object.keys(localStorage);
    let userCaches = 0;
    let totalSize = 0;
    
    keys.forEach(key => {
      if (key.startsWith('ripexplorer_cache_')) {
        userCaches++;
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
    });
    
    return {
      userCaches,
      setCaches: 0, // Set caches are now in Redis, not localStorage
      totalSize: `${Math.round(totalSize / 1024)}KB`
    };
  } catch (err) {
    console.warn('Failed to get cache stats:', err);
    return { userCaches: 0, setCaches: 0, totalSize: '0KB' };
  }
}