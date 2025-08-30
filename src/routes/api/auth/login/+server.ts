import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { SecurityService } from '$lib/server/services/securityService.js';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { username, pin, browserFingerprint } = await request.json();

    // Input validation
    if (!username || typeof username !== 'string') {
      return json({
        success: false,
        error: 'Username is required'
      }, { status: 400 });
    }

    if (!pin || typeof pin !== 'string') {
      return json({
        success: false,
        error: 'PIN is required'
      }, { status: 400 });
    }

    if (!browserFingerprint || typeof browserFingerprint !== 'string') {
      return json({
        success: false,
        error: 'Browser fingerprint is required'
      }, { status: 400 });
    }

    // Validate PIN format
    if (pin.length < 4 || pin.length > 6) {
      return json({
        success: false,
        error: 'PIN must be 4-6 digits'
      }, { status: 400 });
    }

    if (!/^\d+$/.test(pin)) {
      return json({
        success: false,
        error: 'PIN must contain only digits'
      }, { status: 400 });
    }

    // Sanitize username
    const sanitizedUsername = username.trim().toLowerCase();
    if (sanitizedUsername.length === 0 || sanitizedUsername.length > 50) {
      return json({
        success: false,
        error: 'Invalid username format'
      }, { status: 400 });
    }

    // Validate PIN and get session token
    const result = await SecurityService.validatePin(
      sanitizedUsername,
      pin,
      browserFingerprint
    );

    if (!result.valid) {
      const statusCode = result.rateLimited ? 429 : 401;
      return json({
        success: false,
        error: result.error,
        rateLimited: result.rateLimited,
        lockoutEnd: result.lockoutEnd?.toISOString()
      }, { status: statusCode });
    }

    // Success - return session token
    return json({
      success: true,
      sessionToken: result.sessionToken,
      username: sanitizedUsername
    });

  } catch (error) {
    console.error('Login error:', error);
    return json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
};