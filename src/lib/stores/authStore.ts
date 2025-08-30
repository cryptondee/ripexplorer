import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { getBrowserFingerprint } from '$lib/utils/browserFingerprint.js';

export interface AuthState {
  isAuthenticated: boolean;
  username: string | null;
  sessionToken: string | null;
  sessionExpiry: Date | null;
  isGuest: boolean;
  browserFingerprint: string | null;
  loading: boolean;
}

export interface LoginCredentials {
  username: string;
  pin: string;
}

export interface ClaimCredentials extends LoginCredentials {
  confirmPin: string;
}

// Initial state
const initialState: AuthState = {
  isAuthenticated: false,
  username: null,
  sessionToken: null,
  sessionExpiry: null,
  isGuest: true,
  browserFingerprint: null,
  loading: false
};

// Create the writable store
function createAuthStore() {
  const { subscribe, set, update } = writable<AuthState>(initialState);

  return {
    subscribe,
    
    // Initialize authentication on app load
    async initialize(): Promise<void> {
      // Skip initialization during server-side rendering
      if (!browser || typeof window === 'undefined') {
        return;
      }
      
      update(state => ({ ...state, loading: true }));
      
      try {
        // Get browser fingerprint
        const fingerprint = await getBrowserFingerprint();
        
        // Check for stored session token
        const storedToken = localStorage.getItem('session_token');
        const storedUsername = localStorage.getItem('username');
        const storedExpiry = localStorage.getItem('session_expiry');
        
        if (storedToken && storedUsername && storedExpiry) {
          const expiryDate = new Date(storedExpiry);
          
          // Check if token is expired
          if (expiryDate > new Date()) {
            // Validate session with server
            const isValid = await this.validateSession(storedToken);
            
            if (isValid) {
              update(state => ({
                ...state,
                isAuthenticated: true,
                username: storedUsername,
                sessionToken: storedToken,
                sessionExpiry: expiryDate,
                isGuest: false,
                browserFingerprint: fingerprint,
                loading: false
              }));
              return;
            }
          }
          
          // Session invalid or expired, clean up
          this.clearStoredSession();
        }
        
        // No valid session, remain as guest
        update(state => ({
          ...state,
          isGuest: true,
          browserFingerprint: fingerprint,
          loading: false
        }));
        
      } catch (error) {
        console.error('Auth initialization failed:', error);
        update(state => ({ ...state, loading: false }));
      }
    },
    
    // Validate session token with server
    async validateSession(sessionToken: string): Promise<boolean> {
      try {
        const response = await fetch('/api/auth/validate-session', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionToken, refreshIfNeeded: true })
        });
        
        const data = await response.json();
        
        // If session was refreshed, update stored token
        if (data.success && data.valid && data.refreshed && data.sessionToken) {
          const currentState = get(authStore);
          const newExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
          
          // Update localStorage
          this.setSession(data.sessionToken, currentState.username || '');
          
          // Update store state
          update(state => ({
            ...state,
            sessionToken: data.sessionToken,
            sessionExpiry: newExpiry
          }));
          
          console.log('Session token refreshed automatically');
        }
        
        return data.success && data.valid;
      } catch (error) {
        console.error('Session validation failed:', error);
        return false;
      }
    },
    
    // Claim profile (create new account)
    async claimProfile(credentials: ClaimCredentials): Promise<{ success: boolean; error?: string }> {
      update(state => ({ ...state, loading: true }));
      
      try {
        const fingerprint = await getBrowserFingerprint();
        
        const response = await fetch('/api/auth/claim-profile', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: credentials.username,
            pin: credentials.pin,
            confirmPin: credentials.confirmPin,
            browserFingerprint: fingerprint
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          // Store session data
          this.setSession(data.sessionToken, data.username);
          
          update(state => ({
            ...state,
            isAuthenticated: true,
            username: data.username,
            sessionToken: data.sessionToken,
            sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            isGuest: false,
            browserFingerprint: fingerprint,
            loading: false
          }));
          
          return { success: true };
        } else {
          update(state => ({ ...state, loading: false }));
          return { success: false, error: data.error || 'Failed to create account' };
        }
      } catch (error) {
        console.error('Profile claim failed:', error);
        update(state => ({ ...state, loading: false }));
        return { success: false, error: 'Network error occurred' };
      }
    },
    
    // Login with existing credentials
    async login(credentials: LoginCredentials): Promise<{ success: boolean; error?: string }> {
      update(state => ({ ...state, loading: true }));
      
      try {
        const fingerprint = await getBrowserFingerprint();
        
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: credentials.username,
            pin: credentials.pin,
            browserFingerprint: fingerprint
          })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          // Store session data
          this.setSession(data.sessionToken, data.username);
          
          update(state => ({
            ...state,
            isAuthenticated: true,
            username: data.username,
            sessionToken: data.sessionToken,
            sessionExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
            isGuest: false,
            browserFingerprint: fingerprint,
            loading: false
          }));
          
          return { success: true };
        } else {
          update(state => ({ ...state, loading: false }));
          return { success: false, error: data.error || 'Login failed' };
        }
      } catch (error) {
        console.error('Login failed:', error);
        update(state => ({ ...state, loading: false }));
        return { success: false, error: 'Network error occurred' };
      }
    },
    
    // Logout and clear session
    async logout(): Promise<void> {
      const currentState = get(authStore);
      
      if (currentState.sessionToken) {
        try {
          // Revoke session on server
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${currentState.sessionToken}`,
              'Content-Type': 'application/json'
            }
          });
        } catch (error) {
          console.error('Logout API call failed:', error);
        }
      }
      
      // Clear local storage and reset state
      this.clearStoredSession();
      
      update(state => ({
        ...initialState,
        browserFingerprint: state.browserFingerprint
      }));
    },
    
    // Store session data in localStorage
    setSession(sessionToken: string, username: string): void {
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      localStorage.setItem('session_token', sessionToken);
      localStorage.setItem('username', username);
      localStorage.setItem('session_expiry', expiry.toISOString());
    },
    
    // Clear stored session data
    clearStoredSession(): void {
      localStorage.removeItem('session_token');
      localStorage.removeItem('username');
      localStorage.removeItem('session_expiry');
    },
    
    // Continue as guest (no authentication)
    continueAsGuest(): void {
      update(state => ({
        ...state,
        isAuthenticated: false,
        username: null,
        sessionToken: null,
        sessionExpiry: null,
        isGuest: true,
        loading: false
      }));
    },
    
    // Check if session is near expiry (within 1 hour)
    isSessionNearExpiry(): boolean {
      const currentState = get(authStore);
      if (!currentState.sessionExpiry) return false;
      
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      return currentState.sessionExpiry < oneHourFromNow;
    },
    
    // Refresh session if needed
    async refreshSessionIfNeeded(): Promise<void> {
      const currentState = get(authStore);
      
      if (currentState.isAuthenticated && this.isSessionNearExpiry()) {
        // Validate current session, which will refresh it on the server
        if (currentState.sessionToken) {
          const isValid = await this.validateSession(currentState.sessionToken);
          if (!isValid) {
            // Session invalid, logout
            await this.logout();
          }
        }
      }
    }
  };
}

// Helper function to get current state
function get(store: any): AuthState {
  let value: AuthState;
  store.subscribe((v: AuthState) => value = v)();
  return value!;
}

// Create and export the store
export const authStore = createAuthStore();

// Derived stores for common use cases
export const isAuthenticated = derived(authStore, $auth => $auth.isAuthenticated);
export const currentUser = derived(authStore, $auth => $auth.username);
export const isLoading = derived(authStore, $auth => $auth.loading);
export const isGuest = derived(authStore, $auth => $auth.isGuest);

// Auto-initialize when imported (client-side only)
if (browser && typeof window !== 'undefined') {
  authStore.initialize();
}