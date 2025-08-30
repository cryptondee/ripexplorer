import { browser } from '$app/environment';
import { initializeSessionManager, cleanupSessionManager } from '$lib/utils/sessionManager';

/**
 * Client-side hooks for session management
 * Handles authentication initialization and cleanup
 */

// Initialize session manager when app starts
if (browser) {
  // Initialize session management
  initializeSessionManager();
  
  console.log('Client-side session management initialized');
  
  // Clean up on page unload
  window.addEventListener('beforeunload', () => {
    cleanupSessionManager();
  });
  
  // Handle navigation cleanup
  window.addEventListener('pagehide', () => {
    cleanupSessionManager();
  });
}