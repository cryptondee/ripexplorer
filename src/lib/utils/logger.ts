/**
 * Logging utility
 * Provides environment-aware logging to prevent console pollution in production
 */

// Browser-safe environment checks
const isDev = typeof process !== 'undefined' 
  ? process.env.NODE_ENV === 'development'
  : import.meta.env?.DEV ?? false;
  
const isDebugEnabled = typeof process !== 'undefined'
  ? process.env.DEBUG === 'true'
  : import.meta.env?.VITE_DEBUG === 'true';

/**
 * Environment-aware logger
 */
export const logger = {
  /**
   * Log general messages (dev only)
   */
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  
  /**
   * Always log errors (both dev and prod)
   */
  error: (...args: any[]) => {
    console.error(...args);
  },
  
  /**
   * Log warnings (dev only)
   */
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  
  /**
   * Debug messages (only when DEBUG env is set)
   */
  debug: (...args: any[]) => {
    if (isDev && isDebugEnabled) console.debug(...args);
  },
  
  /**
   * Log with a specific prefix (dev only)
   */
  prefix: (prefix: string, ...args: any[]) => {
    if (isDev) console.log(prefix, ...args);
  },
  
  /**
   * Log cache operations with emoji prefix (dev only)
   */
  cache: (operation: 'HIT' | 'MISS' | 'STORE' | 'SKIP', key: string, ...extra: any[]) => {
    if (isDev) {
      const emoji = '🔴';
      console.log(`${emoji} Cache ${operation} for ${key}`, ...extra);
    }
  },
  
  /**
   * Log API operations (dev only)
   */
  api: (method: string, url: string, ...extra: any[]) => {
    if (isDev) {
      console.log(`🌐 ${method} ${url}`, ...extra);
    }
  },
  
  /**
   * Time a function execution (dev only)
   */
  time: async <T>(label: string, fn: () => Promise<T>): Promise<T> => {
    if (!isDev) return fn();
    
    const start = Date.now();
    try {
      const result = await fn();
      const duration = Date.now() - start;
      console.log(`⏱️ ${label}: ${duration}ms`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`⏱️ ${label}: Failed after ${duration}ms`, error);
      throw error;
    }
  }
};

export default logger;
