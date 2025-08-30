import { authStore } from '$lib/stores/authStore';
import { browser } from '$app/environment';

/**
 * Session Manager Utility
 * Handles automatic session validation, refresh, and periodic checks
 */

// Interval for checking session expiry (5 minutes)
const SESSION_CHECK_INTERVAL = 5 * 60 * 1000;
let sessionCheckInterval: NodeJS.Timeout | null = null;

/**
 * Initialize session management
 * Sets up periodic session validation and refresh
 */
export function initializeSessionManager(): void {
  if (!browser) return;
  
  // Start periodic session checks
  startSessionChecks();
  
  // Listen for page visibility changes to refresh session
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  // Listen for storage changes (multiple tabs)
  window.addEventListener('storage', handleStorageChange);
  
  console.log('Session manager initialized');
}

/**
 * Start periodic session validation checks
 */
function startSessionChecks(): void {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
  }
  
  sessionCheckInterval = setInterval(async () => {
    try {
      await authStore.refreshSessionIfNeeded();
    } catch (error) {
      console.error('Periodic session check failed:', error);
    }
  }, SESSION_CHECK_INTERVAL);
}

/**
 * Handle page visibility changes
 * Refresh session when user returns to tab
 */
async function handleVisibilityChange(): Promise<void> {
  if (!document.hidden) {
    // Page became visible, check session
    try {
      await authStore.refreshSessionIfNeeded();
    } catch (error) {
      console.error('Visibility change session check failed:', error);
    }
  }
}

/**
 * Handle localStorage changes from other tabs
 * Sync authentication state across tabs
 */
function handleStorageChange(event: StorageEvent): void {
  if (event.key === 'session_token') {
    if (event.newValue === null) {
      // Session was cleared in another tab, logout
      authStore.continueAsGuest();
    } else if (event.newValue && event.newValue !== event.oldValue) {
      // New session token from another tab, reinitialize
      authStore.initialize();
    }
  }
}

/**
 * Clean up session manager
 * Should be called on app destroy
 */
export function cleanupSessionManager(): void {
  if (sessionCheckInterval) {
    clearInterval(sessionCheckInterval);
    sessionCheckInterval = null;
  }
  
  if (browser) {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    window.removeEventListener('storage', handleStorageChange);
  }
  
  console.log('Session manager cleaned up');
}

/**
 * Force immediate session validation
 * Useful for critical operations
 */
export async function validateSessionNow(): Promise<boolean> {
  try {
    await authStore.refreshSessionIfNeeded();
    
    // Get current state to check if still authenticated
    let isAuthenticated = false;
    authStore.subscribe(state => {
      isAuthenticated = state.isAuthenticated;
    })();
    
    return isAuthenticated;
  } catch (error) {
    console.error('Immediate session validation failed:', error);
    return false;
  }
}

/**
 * Check if user has a valid session
 * Returns promise that resolves to authentication status
 */
export function checkAuthStatus(): Promise<boolean> {
  return new Promise((resolve) => {
    const unsubscribe = authStore.subscribe(state => {
      if (!state.loading) {
        resolve(state.isAuthenticated);
        unsubscribe();
      }
    });
  });
}

/**
 * Wait for authentication to be initialized
 * Useful for components that need auth state immediately
 */
export function waitForAuthInit(): Promise<boolean> {
  return new Promise((resolve) => {
    const unsubscribe = authStore.subscribe(state => {
      if (!state.loading) {
        resolve(state.isAuthenticated);
        unsubscribe();
      }
    });
  });
}

/**
 * Session health check
 * Returns session information for debugging
 */
export function getSessionHealth(): {
  hasToken: boolean;
  isExpired: boolean;
  timeUntilExpiry: number | null;
  needsRefresh: boolean;
} {
  if (!browser) {
    return {
      hasToken: false,
      isExpired: true,
      timeUntilExpiry: null,
      needsRefresh: false
    };
  }
  
  const token = localStorage.getItem('session_token');
  const expiryStr = localStorage.getItem('session_expiry');
  
  if (!token || !expiryStr) {
    return {
      hasToken: false,
      isExpired: true,
      timeUntilExpiry: null,
      needsRefresh: false
    };
  }
  
  const expiry = new Date(expiryStr);
  const now = new Date();
  const timeUntilExpiry = expiry.getTime() - now.getTime();
  const oneHour = 60 * 60 * 1000;
  
  return {
    hasToken: true,
    isExpired: timeUntilExpiry <= 0,
    timeUntilExpiry,
    needsRefresh: timeUntilExpiry <= oneHour && timeUntilExpiry > 0
  };
}