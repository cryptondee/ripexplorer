import { authStore } from '$lib/stores/authStore';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import { checkAuthStatus, waitForAuthInit } from './sessionManager';

/**
 * Authentication Guards
 * Utilities for protecting routes and handling authentication requirements
 */

export interface AuthGuardOptions {
  redirectTo?: string;
  requireAuth?: boolean;
  allowGuests?: boolean;
  onUnauthorized?: () => void;
}

/**
 * Route guard that ensures user is authenticated
 * Can be used in page load functions or component initialization
 */
export async function requireAuthentication(options: AuthGuardOptions = {}): Promise<boolean> {
  const {
    redirectTo = '/extract',
    requireAuth = true,
    allowGuests = false,
    onUnauthorized
  } = options;
  
  if (!browser) {
    // Server-side rendering, assume access is allowed
    return true;
  }
  
  try {
    // Wait for authentication to be initialized
    const isAuthenticated = await waitForAuthInit();
    
    if (requireAuth && !isAuthenticated && !allowGuests) {
      console.log('Access denied: authentication required');
      
      if (onUnauthorized) {
        onUnauthorized();
      } else {
        // Redirect to specified page
        await goto(redirectTo);
      }
      
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Authentication guard failed:', error);
    
    if (onUnauthorized) {
      onUnauthorized();
    } else {
      await goto(redirectTo);
    }
    
    return false;
  }
}

/**
 * Component-level authentication guard
 * Can be used in onMount to protect components
 */
export function createAuthGuard(options: AuthGuardOptions = {}) {
  return {
    async check(): Promise<boolean> {
      return requireAuthentication(options);
    },
    
    async waitForAuth(): Promise<boolean> {
      return waitForAuthInit();
    },
    
    subscribe: authStore.subscribe
  };
}

/**
 * Decorator-like function for protecting page actions
 * Wraps a function to ensure authentication before execution
 */
export function withAuth<T extends (...args: any[]) => any>(
  fn: T,
  options: AuthGuardOptions = {}
): T {
  return (async (...args: any[]) => {
    const isAuthorized = await requireAuthentication(options);
    
    if (!isAuthorized) {
      throw new Error('Authentication required');
    }
    
    return fn(...args);
  }) as T;
}

/**
 * Check if current user has access to a protected feature
 * Used for conditional UI rendering
 */
export async function canAccess(feature: 'watchlist' | 'notifications' | 'profile'): Promise<boolean> {
  const isAuthenticated = await checkAuthStatus();
  
  switch (feature) {
    case 'watchlist':
    case 'notifications':
    case 'profile':
      return isAuthenticated;
    default:
      return false;
  }
}

/**
 * Get user permissions for UI customization
 */
export async function getUserPermissions(): Promise<{
  canSaveFavorites: boolean;
  canReceiveNotifications: boolean;
  canExportData: boolean;
  canSyncProfile: boolean;
}> {
  const isAuthenticated = await checkAuthStatus();
  
  return {
    canSaveFavorites: isAuthenticated,
    canReceiveNotifications: isAuthenticated,
    canExportData: true, // Always allowed (guest exports are temporary)
    canSyncProfile: isAuthenticated
  };
}

/**
 * Authentication state checker for reactive UI
 * Returns a readable store that updates with auth changes
 */
export function createAuthWatcher() {
  let currentState = {
    isAuthenticated: false,
    username: null as string | null,
    loading: true
  };
  
  const subscribers = new Set<(state: typeof currentState) => void>();
  
  // Subscribe to auth store changes
  authStore.subscribe(state => {
    currentState = {
      isAuthenticated: state.isAuthenticated,
      username: state.username,
      loading: state.loading
    };
    
    // Notify all subscribers
    subscribers.forEach(callback => {
      try {
        callback(currentState);
      } catch (error) {
        console.error('Auth watcher callback failed:', error);
      }
    });
  });
  
  return {
    subscribe(callback: (state: typeof currentState) => void) {
      subscribers.add(callback);
      
      // Immediately call with current state
      callback(currentState);
      
      // Return unsubscribe function
      return () => {
        subscribers.delete(callback);
      };
    },
    
    get state() {
      return currentState;
    }
  };
}

/**
 * Quick authentication check for immediate use
 * Does not wait for initialization
 */
export function isCurrentlyAuthenticated(): boolean {
  let result = false;
  
  // Synchronously get current state
  const unsubscribe = authStore.subscribe(state => {
    result = state.isAuthenticated && !state.loading;
  });
  unsubscribe();
  
  return result;
}

/**
 * Show authentication prompt
 * Can be used to trigger login modals or redirect to auth flow
 */
export interface AuthPromptOptions {
  message?: string;
  feature?: string;
  onAuthenticated?: () => void;
  onCancelled?: () => void;
}

export function showAuthPrompt(options: AuthPromptOptions = {}): void {
  const {
    message = 'This feature requires authentication',
    feature = 'this feature',
    onAuthenticated,
    onCancelled
  } = options;
  
  // For now, just log the prompt
  // In a real implementation, this would show a modal or redirect
  console.log(`Auth prompt: ${message} for ${feature}`);
  
  // TODO: Implement modal or redirect logic
  // This would integrate with ProfileClaimModal or similar components
  
  if (onCancelled) {
    onCancelled();
  }
}