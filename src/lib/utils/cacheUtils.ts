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
export function saveSetToCache(setId: string, data: any): void {
  try {
    const cacheData: CacheData = {
      data,
      timestamp: Date.now(),
      setId
    };
    localStorage.setItem(getSetCacheKey(setId), JSON.stringify(cacheData));
  } catch (err) {
    console.warn('Failed to save set data to localStorage:', err);
  }
}

export function loadSetFromCache(setId: string): CacheData | null {
  try {
    const cached = localStorage.getItem(getSetCacheKey(setId));
    if (cached) {
      const cacheData: CacheData = JSON.parse(cached);
      return cacheData;
    }
    return null;
  } catch (err) {
    console.warn('Failed to load set data from localStorage:', err);
    return null;
  }
}

// Bulk cache management
export function clearAllSetCaches(): void {
  try {
    // Get all localStorage keys
    const keys = Object.keys(localStorage);
    // Remove all set cache keys
    keys.forEach(key => {
      if (key.startsWith('ripexplorer_set_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('Cleared all set caches');
  } catch (err) {
    console.warn('Failed to clear set caches:', err);
  }
}

export function clearAllCaches(): void {
  try {
    // Clear all user and set caches
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      if (key.startsWith('ripexplorer_')) {
        localStorage.removeItem(key);
      }
    });
    console.log('Cleared all caches');
  } catch (err) {
    console.warn('Failed to clear all caches:', err);
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
    let setCaches = 0;
    let totalSize = 0;
    
    keys.forEach(key => {
      if (key.startsWith('ripexplorer_cache_')) {
        userCaches++;
      } else if (key.startsWith('ripexplorer_set_')) {
        setCaches++;
      }
      
      if (key.startsWith('ripexplorer_')) {
        const value = localStorage.getItem(key);
        if (value) {
          totalSize += value.length;
        }
      }
    });
    
    return {
      userCaches,
      setCaches,
      totalSize: `${Math.round(totalSize / 1024)}KB`
    };
  } catch (err) {
    console.warn('Failed to get cache stats:', err);
    return { userCaches: 0, setCaches: 0, totalSize: '0KB' };
  }
}