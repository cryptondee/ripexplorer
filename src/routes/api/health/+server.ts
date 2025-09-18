import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

/**
 * Health check endpoint to test external API connectivity
 */
export const GET: RequestHandler = async () => {
  const results: Record<string, any> = {
    server: 'ok',
    timestamp: new Date().toISOString(),
  };

  // Test rip.fun API connectivity
  try {
    const testUrl = 'https://www.rip.fun/api/user/2010/owned-cards';
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    const response = await fetch(testUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    results.ripFunApi = {
      status: 'reachable',
      httpStatus: response.status,
      statusText: response.statusText,
      url: testUrl
    };
  } catch (error: any) {
    results.ripFunApi = {
      status: 'unreachable',
      error: error.message,
      type: error.name,
      cause: error.cause
    };
  }

  // Test DNS resolution
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    
    const dnsTest = await fetch('https://www.rip.fun', { 
      method: 'HEAD',
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    results.ripFunDns = {
      status: 'resolved',
      httpStatus: dnsTest.status
    };
  } catch (error: any) {
    results.ripFunDns = {
      status: 'failed',
      error: error.message
    };
  }

  return json(results);
};
