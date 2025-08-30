import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SecurityService } from '$lib/server/services/securityService.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Get session token from Authorization header or request body
    const authHeader = request.headers.get('Authorization');
    let sessionToken: string | null = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      sessionToken = authHeader.substring(7);
    } else {
      // Fallback to request body
      const body = await request.json().catch(() => ({}));
      sessionToken = body.sessionToken;
    }

    if (!sessionToken) {
      return json({
        success: false,
        error: 'Session token is required'
      }, { status: 400 });
    }

    // Revoke the session
    const revoked = await SecurityService.revokeSession(sessionToken);

    if (!revoked) {
      return json({
        success: false,
        error: 'Failed to revoke session'
      }, { status: 400 });
    }

    return json({
      success: true,
      message: 'Session revoked successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
};