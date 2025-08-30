import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SecurityService } from '$lib/server/services/securityService.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { sessionToken, refreshIfNeeded } = await request.json();

    if (!sessionToken || typeof sessionToken !== 'string') {
      return json({
        success: false,
        valid: false,
        error: 'Session token is required'
      }, { status: 400 });
    }

    // Validate session
    const result = await SecurityService.validateSession(sessionToken);

    if (!result.valid) {
      return json({
        success: true,
        valid: false,
        error: result.error
      });
    }

    // Check if session needs refresh (within 1 hour of expiry)
    let newSessionToken = sessionToken;
    let refreshed = false;
    
    if (refreshIfNeeded && result.session) {
      const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);
      const tokenExpiry = new Date(result.session.tokenExpiry || 0);
      
      if (tokenExpiry < oneHourFromNow) {
        console.log('Session near expiry, refreshing token');
        
        // Generate new session token
        const refreshResult = await SecurityService.refreshSession(result.session.id);
        
        if (refreshResult.success && refreshResult.sessionToken) {
          newSessionToken = refreshResult.sessionToken;
          refreshed = true;
          console.log('Session refreshed successfully');
        }
      }
    }

    // Return session info (without sensitive data)
    return json({
      success: true,
      valid: true,
      refreshed,
      sessionToken: refreshed ? newSessionToken : undefined,
      session: {
        username: result.session?.claimedUsername,
        lastSeen: result.session?.lastSeen,
        tokenExpiry: result.session?.tokenExpiry
      }
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return json({
      success: false,
      valid: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
};

// Also support GET requests for convenience
export const GET: RequestHandler = async ({ url }) => {
  const sessionToken = url.searchParams.get('token');
  
  if (!sessionToken) {
    return json({
      success: false,
      valid: false,
      error: 'Session token is required'
    }, { status: 400 });
  }

  try {
    const result = await SecurityService.validateSession(sessionToken);

    if (!result.valid) {
      return json({
        success: true,
        valid: false,
        error: result.error
      });
    }

    return json({
      success: true,
      valid: true,
      session: {
        username: result.session?.claimedUsername,
        lastSeen: result.session?.lastSeen,
        tokenExpiry: result.session?.tokenExpiry
      }
    });

  } catch (error) {
    console.error('Session validation error:', error);
    return json({
      success: false,
      valid: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
};